"""Data REST API (Milestone 2 step 2): trades, playbooks, tags, admin.

Every endpoint requires a session and scopes reads/writes to
current_user.id; admin endpoints additionally check role. Failure bodies are
{"error": <stable code>} like the auth blueprint (not_authenticated /
email_unverified / forbidden / not_found / invalid_payload / playbook_exists /
tag_exists).

Report aggregation deliberately stays on the client this step — this API only
replaces the data source.
"""
import math
import secrets
from datetime import date, datetime
from functools import wraps

from flask import Blueprint, jsonify, request
from flask_login import current_user
from sqlalchemy.exc import IntegrityError

from extensions import db
from pairing import pair_executions
from models import (
    PLAYBOOK_LANGS,
    ImportBatch,
    Playbook,
    Tag,
    Trade,
    TradeTag,
    User,
    UserPlaybook,
)

bp = Blueprint("api", __name__, url_prefix="/api")


def _err(code, status=400):
    return jsonify({"error": code}), status


def require_user(fn):
    """Session + verified email. Unverified accounts can't reach the app UI
    (ProtectedRoute), so this is defense-in-depth for direct API calls."""

    @wraps(fn)
    def wrapper(*args, **kwargs):
        if not current_user.is_authenticated:
            return _err("not_authenticated", 401)
        if not current_user.email_verified_at:
            return _err("email_unverified", 403)
        return fn(*args, **kwargs)

    return wrapper


def require_admin(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if not current_user.is_authenticated:
            return _err("not_authenticated", 401)
        if current_user.role != "admin":
            return _err("forbidden", 403)
        return fn(*args, **kwargs)

    return wrapper


# ── Parsing helpers ──────────────────────────────────────────────


def _json_body():
    """Request JSON as a dict; any other shape (array/string/number/absent)
    collapses to {} so endpoints answer invalid_payload instead of 500."""
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else {}


def _parse_date(value):
    """ISO 'YYYY-MM-DD' -> date, else None."""
    if not value:
        return None
    try:
        return date.fromisoformat(str(value)[:10])
    except (TypeError, ValueError):
        return None


def _parse_number(value, default=None):
    if value is None or value == "":
        return default
    try:
        number = float(value)
    except (TypeError, ValueError):
        return default
    # NaN/Infinity would round-trip into JSON bodies the browser can't parse.
    return number if math.isfinite(number) else default


def _s(value, maxlen):
    """String clipped to its column length so Postgres never DataErrors."""
    return str(value)[:maxlen]


def _valid_playbook_id(pid):
    """Return pid when it references an existing playbook, else None (imports
    may carry ids for since-deleted playbooks; FK must stay consistent)."""
    if not pid:
        return None
    exists = db.session.get(Playbook, str(pid))
    return str(pid) if exists else None


def _tags_for_labels(labels):
    """Resolve tag labels to Tag rows, creating unknown labels on the fly.
    Duplicates are collapsed (a repeated label would double-insert the same
    trade_tags primary key)."""
    if not isinstance(labels, list):
        return []
    tags, seen = [], set()
    for raw in labels:
        label = _s(raw, 40).strip()
        if not label or label in seen:
            continue
        seen.add(label)
        tag = db.session.query(Tag).filter_by(label=label).first()
        if tag is None:
            tag = Tag(label=label)
            db.session.add(tag)
            db.session.flush()
        tags.append(tag)
    return tags


def _trade_from_payload(data, user_id):
    """Build a Trade from the front-end camelCase shape. Returns (trade, error)."""
    ticker = _s(data.get("ticker", ""), 20).strip().upper()
    side = str(data.get("side", "long")).lower()
    quantity = _parse_number(data.get("quantity"))
    entry_price = _parse_number(data.get("entryPrice"))
    open_date = _parse_date(data.get("openDate"))
    if not ticker or side not in ("long", "short") or quantity is None or entry_price is None or open_date is None:
        return None, "invalid_payload"
    trade = Trade(
        user_id=user_id,
        playbook_id=_valid_playbook_id(data.get("playbookId")),
        ticker=ticker,
        side=side,
        quantity=quantity,
        entry_price=entry_price,
        exit_price=_parse_number(data.get("exitPrice")),
        open_date=open_date,
        close_date=_parse_date(data.get("closeDate")),
        fees=_parse_number(data.get("fees"), 0.0) or 0.0,
        notes=str(data.get("notes") or ""),
        source=_s(data.get("source") or "manual", 30),
        external_id=(_s(data["externalId"], 80) if data.get("externalId") else None),
    )
    trade.tags = _tags_for_labels(data.get("tags"))
    return trade, None


# ── Trades ───────────────────────────────────────────────────────


@bp.get("/trades")
@require_user
def list_trades():
    q = db.session.query(Trade).filter_by(user_id=current_user.id)
    frm = _parse_date(request.args.get("from"))
    to = _parse_date(request.args.get("to"))
    if frm:
        q = q.filter(Trade.open_date >= frm)
    if to:
        q = q.filter(Trade.open_date <= to)
    ticker = request.args.get("ticker", "").strip().upper()
    if ticker:
        q = q.filter(Trade.ticker == ticker)
    playbook_id = request.args.get("playbookId", "").strip()
    if playbook_id:
        q = q.filter(Trade.playbook_id == playbook_id)
    q = q.order_by(Trade.open_date.desc(), Trade.id.desc())
    # Pagination: default page 200; limit=0 asks for everything (Reports
    # aggregates client-side over the full set — dataset is small).
    # Clamped: junk/negative/huge values must not become SQL errors.
    total = q.count()
    raw_limit = request.args.get("limit")
    limit = 200 if raw_limit is None else int(
        min(max(_parse_number(raw_limit, 200) or 0, 0), 1e6)
    )
    offset = int(min(max(_parse_number(request.args.get("offset"), 0) or 0, 0), 1e9))
    if offset:
        q = q.offset(offset)
    if limit:
        q = q.limit(limit)
    return jsonify({"trades": [t.to_json() for t in q], "total": total})


@bp.post("/trades")
@require_user
def create_trade():
    data = _json_body()
    trade, error = _trade_from_payload(data, current_user.id)
    if error:
        return _err(error)
    if trade.external_id:
        # Same duplicate rule as /import, surfaced as a clean 409 instead of
        # letting the unique constraint 500.
        exists = (
            db.session.query(Trade.id)
            .filter_by(
                user_id=current_user.id,
                source=trade.source,
                external_id=trade.external_id,
            )
            .first()
        )
        if exists:
            return _err("duplicate_external_id", 409)
    db.session.add(trade)
    try:
        db.session.commit()
    except IntegrityError:  # concurrent insert of the same external id
        db.session.rollback()
        return _err("duplicate_external_id", 409)
    return jsonify(trade.to_json()), 201


@bp.patch("/trades/<int:trade_id>")
@require_user
def update_trade(trade_id):
    trade = db.session.get(Trade, trade_id)
    if trade is None or trade.user_id != current_user.id:
        return _err("not_found", 404)
    data = _json_body()
    if "ticker" in data:
        ticker = _s(data["ticker"], 20).strip().upper()
        if not ticker:
            return _err("invalid_payload")
        trade.ticker = ticker
    if "side" in data:
        side = str(data["side"]).lower()
        if side not in ("long", "short"):
            return _err("invalid_payload")
        trade.side = side
    if "quantity" in data:
        quantity = _parse_number(data["quantity"])
        if quantity is None:
            return _err("invalid_payload")
        trade.quantity = quantity
    if "entryPrice" in data:
        entry = _parse_number(data["entryPrice"])
        if entry is None:
            return _err("invalid_payload")
        trade.entry_price = entry
    if "exitPrice" in data:
        trade.exit_price = _parse_number(data["exitPrice"])
    if "openDate" in data:
        open_date = _parse_date(data["openDate"])
        if open_date is None:
            return _err("invalid_payload")
        trade.open_date = open_date
    if "closeDate" in data:
        trade.close_date = _parse_date(data["closeDate"])
    if "fees" in data:
        trade.fees = _parse_number(data["fees"], 0.0) or 0.0
    if "notes" in data:
        trade.notes = str(data["notes"] or "")
    if "playbookId" in data:
        trade.playbook_id = _valid_playbook_id(data["playbookId"])
    if "tags" in data:
        trade.tags = _tags_for_labels(data["tags"])
    db.session.commit()
    return jsonify(trade.to_json())


@bp.delete("/trades/<int:trade_id>")
@require_user
def delete_trade(trade_id):
    trade = db.session.get(Trade, trade_id)
    if trade is None or trade.user_id != current_user.id:
        return _err("not_found", 404)
    # The tags relationship (secondary=trade_tags) cleans up the association
    # rows itself; deleting them manually too would StaleDataError.
    db.session.delete(trade)
    db.session.commit()
    return jsonify({"ok": True})


def _existing_external_ids(user_id):
    return {
        (source, external_id)
        for source, external_id in db.session.query(
            Trade.source, Trade.external_id
        ).filter(Trade.user_id == user_id, Trade.external_id.isnot(None))
    }


def _bulk_import(incoming, batch_source):
    """Insert trade payloads for current_user with source+externalId dedupe.
    Shared by /trades/import (live IBKR, local migration) and
    /trades/import/flex. Returns a response tuple.

    Two attempts: a concurrent import (double-submit) can commit between our
    dedupe snapshot and our commit; the retry re-reads and skips those rows
    instead of surfacing the unique-constraint violation as a 500."""
    for attempt in (1, 2):
        existing = _existing_external_ids(current_user.id)

        batch = ImportBatch(user_id=current_user.id, source=batch_source)
        db.session.add(batch)
        db.session.flush()

        added, skipped = 0, 0
        for item in incoming:
            if not isinstance(item, dict):
                skipped += 1
                continue
            external_id = _s(item["externalId"], 80) if item.get("externalId") else None
            source = _s(item.get("source") or "manual", 30)
            if external_id and (source, external_id) in existing:
                skipped += 1
                continue
            trade, error = _trade_from_payload(item, current_user.id)
            if error:
                skipped += 1
                continue
            trade.import_batch_id = batch.id
            db.session.add(trade)
            if external_id:
                existing.add((source, external_id))  # also dedupes within the batch
            added += 1

        batch.added, batch.skipped = added, skipped
        try:
            db.session.commit()
            return jsonify({"added": added, "skipped": skipped})
        except IntegrityError:
            db.session.rollback()
            if attempt == 2:
                return _err("conflict", 409)


@bp.post("/trades/import")
@require_user
def import_trades():
    """Bulk import (IBKR /connect live fills, local migration). Dedupes
    server-side per user on source+externalId."""
    data = _json_body()
    incoming = data.get("trades")
    if not isinstance(incoming, list):
        return _err("invalid_payload")
    return _bulk_import(incoming, _s(data.get("source") or "broker:ibkr", 30))


FLEX_SOURCE = "broker:ibkr-flex"


def _parse_exec_time(value):
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except (TypeError, ValueError):
        return None


@bp.post("/trades/import/flex")
@require_user
def import_flex():
    """IBKR Flex statement import. The browser parses the XML into execution
    JSON; pairing runs HERE via pairing.pair_executions — the exact FIFO code
    the live IB Gateway path uses. externalId derives from Flex tradeIDs
    (source broker:ibkr-flex), so it can never collide with the live path's
    execIds (source broker:ibkr).

    commit=false (default): returns the paired trades with an `exists` flag
    for the preview table. commit=true: dedupes + inserts, returns counts."""
    data = _json_body()
    raw = data.get("executions")
    if not isinstance(raw, list):
        return _err("invalid_payload")

    executions, skipped_rows = [], 0
    for item in raw:
        if not isinstance(item, dict):
            skipped_rows += 1
            continue
        exec_id = _s(item.get("execId") or "", 60).strip()
        symbol = _s(item.get("symbol") or "", 20).strip().upper()
        side = str(item.get("side") or "").upper()
        shares = _parse_number(item.get("shares"))
        price = _parse_number(item.get("price"))
        time = _parse_exec_time(item.get("time"))
        if (
            not exec_id
            or not symbol
            or side not in ("BUY", "SELL")
            or not shares
            or shares <= 0
            or price is None
            or time is None
        ):
            skipped_rows += 1
            continue
        executions.append(
            {
                "execId": exec_id,
                "symbol": symbol,
                "side": side,
                "shares": shares,
                "price": price,
                "time": time,
                "commission": _parse_number(item.get("commission"), 0.0) or 0.0,
                "currency": _s(item.get("currency") or "USD", 10),
            }
        )

    paired = pair_executions(executions, source=FLEX_SOURCE)
    existing = _existing_external_ids(current_user.id)
    for trade in paired:
        trade["exists"] = (trade["source"], trade["externalId"]) in existing

    if not data.get("commit"):
        return jsonify({"trades": paired, "skippedRows": skipped_rows})
    return _bulk_import(paired, FLEX_SOURCE)


# ── Playbooks (library + adoption) ───────────────────────────────


def _adopted_ids(user_id):
    return [
        row.playbook_id
        for row in db.session.query(UserPlaybook).filter_by(user_id=user_id)
    ]


@bp.get("/playbooks")
@require_user
def list_playbooks():
    # id tie-breaker: all 8 seeds share one created_at, and Postgres gives ties
    # no stable order (an admin edit would visibly reshuffle the library).
    playbooks = (
        db.session.query(Playbook).order_by(Playbook.created_at, Playbook.id).all()
    )
    return jsonify(
        {
            "playbooks": [p.to_json() for p in playbooks],
            "adoptedIds": _adopted_ids(current_user.id),
        }
    )


@bp.post("/playbooks/<playbook_id>/adopt")
@require_user
def adopt_playbook(playbook_id):
    if db.session.get(Playbook, playbook_id) is None:
        return _err("not_found", 404)
    existing = db.session.get(UserPlaybook, (current_user.id, playbook_id))
    if existing is None:
        db.session.add(UserPlaybook(user_id=current_user.id, playbook_id=playbook_id))
        db.session.commit()
    return jsonify({"ok": True, "adoptedIds": _adopted_ids(current_user.id)})


@bp.delete("/playbooks/<playbook_id>/adopt")
@require_user
def unadopt_playbook(playbook_id):
    existing = db.session.get(UserPlaybook, (current_user.id, playbook_id))
    if existing is not None:
        db.session.delete(existing)
        db.session.commit()
    return jsonify({"ok": True, "adoptedIds": _adopted_ids(current_user.id)})


# ── Playbooks (admin CRUD) ───────────────────────────────────────


def _apply_playbook_payload(playbook, data, partial):
    """Map the editor's camelCase payload onto per-language columns. English
    lives in the base fields (name/summary/...); translations arrive as
    name_zh etc. Empty translation strings clear the column (English fallback).
    Strings are clipped to their column lengths (no DataError 500s)."""
    if not partial or "name" in data:
        name = _s(data.get("name", ""), 120).strip()
        if not name:
            return "invalid_payload"
        playbook.name_en = name
    if not partial or "category" in data:
        category = _s(data.get("category", ""), 60).strip()
        if not category:
            return "invalid_payload"
        playbook.category = category
    if not partial or "market" in data:
        market = _s(data.get("market", ""), 60).strip()
        if not market:
            return "invalid_payload"
        playbook.market = market
    if "riskLevel" in data:
        playbook.risk_level = _s(data["riskLevel"] or "Medium", 10)
    if "summary" in data:
        playbook.summary_en = str(data["summary"] or "")
    if "description" in data:
        playbook.description_en = str(data["description"] or "")
    if "rules" in data:
        rules = data["rules"]
        playbook.rules_en = [str(r) for r in rules] if isinstance(rules, list) else []
    if "tags" in data:
        tags = data["tags"]
        playbook.tags = [str(t) for t in tags] if isinstance(tags, list) else []
    for lang in PLAYBOOK_LANGS:
        for field in ("name", "summary", "description"):
            key = f"{field}_{lang}"
            if key in data:
                value = str(data[key] or "").strip()
                if field == "name":
                    value = value[:120]
                setattr(playbook, key, value or None)
        rules_key = f"rules_{lang}"
        if rules_key in data:
            rules = data[rules_key]
            setattr(
                playbook,
                rules_key,
                [str(r) for r in rules] if isinstance(rules, list) and rules else None,
            )
    return None


@bp.post("/playbooks")
@require_admin
def create_playbook():
    data = _json_body()
    playbook = Playbook(
        id=f"pb_{secrets.token_hex(5)}",
        is_curated=True,
        created_by=str(current_user.id),
    )
    error = _apply_playbook_payload(playbook, data, partial=False)
    if error:
        return _err(error)
    db.session.add(playbook)
    db.session.commit()
    return jsonify(playbook.to_json()), 201


@bp.patch("/playbooks/<playbook_id>")
@require_admin
def update_playbook(playbook_id):
    playbook = db.session.get(Playbook, playbook_id)
    if playbook is None:
        return _err("not_found", 404)
    data = _json_body()
    error = _apply_playbook_payload(playbook, data, partial=True)
    if error:
        return _err(error)
    db.session.commit()
    return jsonify(playbook.to_json())


@bp.delete("/playbooks/<playbook_id>")
@require_admin
def delete_playbook(playbook_id):
    playbook = db.session.get(Playbook, playbook_id)
    if playbook is None:
        return _err("not_found", 404)
    # Explicit cleanup (portable regardless of DB-level ON DELETE support):
    # adoptions vanish, trades keep their history with the reference cleared.
    db.session.query(UserPlaybook).filter_by(playbook_id=playbook_id).delete()
    db.session.query(Trade).filter_by(playbook_id=playbook_id).update(
        {"playbook_id": None}
    )
    db.session.delete(playbook)
    db.session.commit()
    return jsonify({"ok": True})


# ── Tags ─────────────────────────────────────────────────────────


@bp.get("/tags")
@require_user
def list_tags():
    tags = db.session.query(Tag).order_by(Tag.label).all()
    return jsonify({"tags": [t.to_json() for t in tags]})


@bp.post("/admin/tags")
@require_admin
def create_tag():
    data = _json_body()
    label = _s(data.get("label", ""), 40).strip()
    if not label:
        return _err("invalid_payload")
    if db.session.query(Tag).filter_by(label=label).first():
        return _err("tag_exists", 409)
    tag = Tag(label=label, color=_s(data.get("color") or "", 9) or None)
    db.session.add(tag)
    db.session.commit()
    return jsonify(tag.to_json()), 201


@bp.delete("/admin/tags/<int:tag_id>")
@require_admin
def delete_tag(tag_id):
    tag = db.session.get(Tag, tag_id)
    if tag is None:
        return _err("not_found", 404)
    db.session.query(TradeTag).filter_by(tag_id=tag_id).delete()
    db.session.delete(tag)
    db.session.commit()
    return jsonify({"ok": True})


# ── Admin: user directory (read-only) ────────────────────────────


@bp.get("/admin/users")
@require_admin
def list_users():
    users = db.session.query(User).order_by(User.created_at).all()
    return jsonify({"users": [u.to_json() for u in users]})
