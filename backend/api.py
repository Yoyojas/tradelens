"""Data REST API (Milestone 2 step 2): trades, playbooks, tags, admin.

Every endpoint requires a session and scopes reads/writes to
current_user.id; admin endpoints additionally check role. Failure bodies are
{"error": <stable code>} like the auth blueprint (not_authenticated /
email_unverified / forbidden / not_found / invalid_payload / playbook_exists /
tag_exists).

Report aggregation deliberately stays on the client this step — this API only
replaces the data source.
"""
import hashlib
import math
import re
import secrets
from datetime import date, datetime, timedelta, timezone
from functools import wraps

import config
from flask import Blueprint, current_app, jsonify, request
from flask_login import current_user
from sqlalchemy import func, or_
from sqlalchemy.exc import IntegrityError

import flex_service
from extensions import db
from pairing import pair_executions
from trade_import import (
    ImportConflict,
    bulk_import,
    existing_external_ids as _existing_external_ids_for,
    trade_from_payload,
)
import quotes as quotes_service
from models import (
    PLAYBOOK_LANGS,
    BrokerConnection,
    BrokerSyncDevice,
    ImportBatch,
    Playbook,
    PortfolioSnapshot,
    PositionSnapshot,
    SyncRun,
    Tag,
    Trade,
    TradeTag,
    User,
    UserPlaybook,
    UserProfile,
    WatchlistItem,
    utcnow,
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


def _normalize_label(raw):
    """Tag label normalization (TL-FEAT-006): trim, collapse internal
    whitespace, clip to the column length. Case-INSENSITIVE dedupe happens at
    lookup time; the original casing is preserved for display."""
    return re.sub(r"\s+", " ", str(raw)).strip()[:40]


def _find_visible_tag(label, user_id):
    """Case-insensitive label lookup within the user's visible set (shared +
    own). Prefers the user's own tag when both domains hold the same label."""
    return (
        db.session.query(Tag)
        .filter(
            func.lower(Tag.label) == label.lower(),
            or_(Tag.user_id.is_(None), Tag.user_id == user_id),
        )
        .order_by(Tag.user_id.is_(None))
        .first()
    )


def _tags_for_labels(labels, user_id):
    """Resolve tag labels to Tag rows visible to the user (shared + own).
    Unknown labels are created as the USER'S OWN tags — never shared ones.
    Duplicates collapse case-insensitively (a repeated label would
    double-insert the same trade_tags primary key)."""
    if not isinstance(labels, list):
        return []
    tags, seen = [], set()
    for raw in labels:
        label = _normalize_label(raw)
        if not label or label.lower() in seen:
            continue
        seen.add(label.lower())
        tag = _find_visible_tag(label, user_id)
        if tag is None:
            tag = Tag(label=label, user_id=user_id)
            db.session.add(tag)
            db.session.flush()
        tags.append(tag)
    return tags


# Payload -> Trade construction lives in trade_import.py (shared with the
# scheduled Flex sync, which has no request context). Tag resolution inside
# it calls back into _tags_for_labels below.
_trade_from_payload = trade_from_payload


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
    # Tag filter (TL-FEAT-006). Scoped to the user's own trades by the base
    # query, so someone else's tagId simply matches nothing — no leak.
    tag_id = request.args.get("tagId", "").strip()
    if tag_id.isdigit():
        q = q.join(TradeTag, TradeTag.trade_id == Trade.id).filter(
            TradeTag.tag_id == int(tag_id)
        )
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
        trade.tags = _tags_for_labels(data["tags"], current_user.id)
    # source / external_id are deliberately NOT patchable: they are the import
    # dedupe identity (D-010) and the audit trail back to the broker record.
    # Whole-trade validation after all patches apply — per-field checks can't
    # see cross-field state (e.g. clearing exitPrice while closeDate stays):
    # exit_price and close_date must be both empty (open) or both set (closed),
    # close on/after open, quantity and prices strictly positive. Uncommitted
    # mutations are discarded by the session teardown rollback.
    if (trade.exit_price is None) != (trade.close_date is None):
        return _err("invalid_payload")
    if trade.close_date is not None and trade.close_date < trade.open_date:
        return _err("invalid_payload")
    if trade.quantity is None or trade.quantity <= 0:
        return _err("invalid_payload")
    if trade.entry_price is None or trade.entry_price <= 0:
        return _err("invalid_payload")
    if trade.exit_price is not None and trade.exit_price <= 0:
        return _err("invalid_payload")
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
    return _existing_external_ids_for(user_id)


def _bulk_import(incoming, batch_source):
    """HTTP wrapper over trade_import.bulk_import (semantics unchanged:
    per-user (source, externalId) dedupe, one retry against concurrent
    duplicate inserts, then 409)."""
    try:
        result = bulk_import(current_user.id, incoming, batch_source)
    except ImportConflict:
        return _err("conflict", 409)
    return jsonify(result)


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
# Visibility model (TL-FEAT-006, plan A): everyone sees shared tags
# (user_id NULL) plus their own. Users create/rename/delete only their own;
# shared tags are managed through the admin endpoints below.


@bp.get("/tags")
@require_user
def list_tags():
    tags = (
        db.session.query(Tag)
        .filter(or_(Tag.user_id.is_(None), Tag.user_id == current_user.id))
        .order_by(Tag.label)
        .all()
    )
    return jsonify({"tags": [t.to_json() for t in tags]})


@bp.post("/tags")
@require_user
def create_user_tag():
    data = _json_body()
    label = _normalize_label(data.get("label", ""))
    if not label:
        return _err("invalid_payload")
    if _find_visible_tag(label, current_user.id):
        return _err("tag_exists", 409)
    tag = Tag(label=label, user_id=current_user.id)
    db.session.add(tag)
    try:
        db.session.commit()
    except IntegrityError:  # concurrent create of the same label
        db.session.rollback()
        return _err("tag_exists", 409)
    return jsonify(tag.to_json()), 201


def _own_tag_or_error(tag_id):
    """Fetch a tag the current user may modify. Someone else's tag is
    invisible (404); a shared tag is visible but read-only (403)."""
    tag = db.session.get(Tag, tag_id)
    if tag is None or (tag.user_id is not None and tag.user_id != current_user.id):
        return None, _err("not_found", 404)
    if tag.user_id is None:
        return None, _err("forbidden", 403)
    return tag, None


@bp.patch("/tags/<int:tag_id>")
@require_user
def update_user_tag(tag_id):
    tag, error = _own_tag_or_error(tag_id)
    if error:
        return error
    data = _json_body()
    if "label" in data:
        label = _normalize_label(data["label"])
        if not label:
            return _err("invalid_payload")
        existing = _find_visible_tag(label, current_user.id)
        if existing and existing.id != tag.id:
            return _err("tag_exists", 409)
        tag.label = label
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return _err("tag_exists", 409)
    return jsonify(tag.to_json())


@bp.delete("/tags/<int:tag_id>")
@require_user
def delete_user_tag(tag_id):
    tag, error = _own_tag_or_error(tag_id)
    if error:
        return error
    db.session.query(TradeTag).filter_by(tag_id=tag.id).delete()
    db.session.delete(tag)
    db.session.commit()
    return jsonify({"ok": True})


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


# ── Broker connections (TL-DATA-004) ─────────────────────────────
# IBKR Flex is the only implemented provider. The raw token appears ONLY in
# request bodies and transient memory: responses carry a masked summary, the
# database stores ciphertext, and nothing here logs it.

FLEX_PROVIDER = "ibkr-flex"


def _own_connection_or_404(connection_id):
    conn = db.session.get(BrokerConnection, connection_id)
    if conn is None or conn.user_id != current_user.id:
        return None
    return conn


def _validate_flex_inputs(data):
    token = str(data.get("token") or "").strip()
    query_id = str(data.get("queryId") or "").strip()
    date_format = _s(data.get("dateFormat") or "yyyyMMdd", 20).strip()
    if not query_id.isdigit() or not (8 <= len(token) <= 512):
        return None
    return {"token": token, "queryId": query_id, "dateFormat": date_format}


@bp.get("/broker/connections")
@require_user
def list_connections():
    conns = (
        db.session.query(BrokerConnection)
        .filter_by(user_id=current_user.id)
        .order_by(BrokerConnection.id)
        .all()
    )
    return jsonify({"connections": [c.to_json() for c in conns]})


@bp.post("/broker/connections/test")
@require_user
def test_connection():
    """Server-side Test Connection: fetch the statement once and report field
    completeness. Nothing is stored; the token never returns to the client."""
    data = _json_body()
    inputs = _validate_flex_inputs(data)
    if not inputs:
        return _err("invalid_payload")
    try:
        xml_text = flex_service.fetch_statement(inputs["token"], inputs["queryId"])
        executions, non_stock, bad = flex_service.parse_flex_xml(xml_text)
    except flex_service.FlexError as exc:
        # TL-BUG-002: business-level failures must be diagnosable server-side.
        flex_service.log_flex_failure(
            "test_connection", current_user.id, inputs["queryId"], exc
        )
        status = 503 if exc.code in ("flex_key_missing", "flex_unreachable") else 400
        return _err(exc.code, status)
    return jsonify(
        {
            "ok": True,
            "tokenMask": f"****{flex_service.token_mask(inputs['token'])}",
            "executions": len(executions),
            "skippedNonStock": non_stock,
            "skippedBad": bad,
            # Zero usable rows with rows present = the query is missing
            # required fields; guide the user back to the query template.
            "fieldsOk": bad == 0,
        }
    )


@bp.post("/broker/connections")
@require_user
def create_connection():
    """Save (or replace) the IBKR Flex connection: encrypt + store."""
    data = _json_body()
    inputs = _validate_flex_inputs(data)
    if not inputs:
        return _err("invalid_payload")
    try:
        encrypted = flex_service.encrypt_token(inputs["token"])
    except flex_service.FlexError as exc:
        return _err(exc.code, 503)
    conn = (
        db.session.query(BrokerConnection)
        .filter_by(user_id=current_user.id, provider=FLEX_PROVIDER)
        .first()
    )
    if conn is None:
        conn = BrokerConnection(user_id=current_user.id, provider=FLEX_PROVIDER)
        db.session.add(conn)
    conn.connection_type = "flex_query"
    conn.encrypted_token = encrypted
    conn.token_mask = flex_service.token_mask(inputs["token"])
    conn.query_id = inputs["queryId"]
    conn.date_format = inputs["dateFormat"]
    conn.status = "active"
    db.session.commit()
    return jsonify(conn.to_json()), 201


@bp.patch("/broker/connections/<int:connection_id>")
@require_user
def update_connection(connection_id):
    """Update token (re-encrypt) and/or query settings."""
    conn = _own_connection_or_404(connection_id)
    if conn is None:
        return _err("not_found", 404)
    data = _json_body()
    if data.get("token"):
        token = str(data["token"]).strip()
        if not (8 <= len(token) <= 512):
            return _err("invalid_payload")
        try:
            conn.encrypted_token = flex_service.encrypt_token(token)
        except flex_service.FlexError as exc:
            return _err(exc.code, 503)
        conn.token_mask = flex_service.token_mask(token)
        conn.status = "active"
    if data.get("queryId"):
        query_id = str(data["queryId"]).strip()
        if not query_id.isdigit():
            return _err("invalid_payload")
        conn.query_id = query_id
    if data.get("dateFormat"):
        conn.date_format = _s(data["dateFormat"], 20).strip()
    db.session.commit()
    return jsonify(conn.to_json())


@bp.delete("/broker/connections/<int:connection_id>")
@require_user
def delete_connection(connection_id):
    """Disconnect: remove the connection and its sync history. Imported
    trades stay — they belong to the journal, not the connection."""
    conn = _own_connection_or_404(connection_id)
    if conn is None:
        return _err("not_found", 404)
    db.session.query(SyncRun).filter_by(connection_id=conn.id).delete()
    db.session.delete(conn)
    db.session.commit()
    return jsonify({"ok": True})


@bp.post("/broker/connections/<int:connection_id>/sync")
@require_user
def sync_connection(connection_id):
    """First sync and the 'sync now' button (kind=initial|manual)."""
    conn = _own_connection_or_404(connection_id)
    if conn is None:
        return _err("not_found", 404)
    kind = "initial" if conn.last_sync_at is None else "manual"
    run = flex_service.run_sync(conn, kind)
    return jsonify({"run": run.to_json(), "connection": conn.to_json()})


@bp.get("/broker/connections/<int:connection_id>/runs")
@require_user
def list_sync_runs(connection_id):
    conn = _own_connection_or_404(connection_id)
    if conn is None:
        return _err("not_found", 404)
    runs = (
        db.session.query(SyncRun)
        .filter_by(connection_id=conn.id)
        .order_by(SyncRun.started_at.desc())
        .limit(30)
        .all()
    )
    return jsonify({"runs": [r.to_json() for r in runs]})


# ── Quotes + watchlist (TL-DATA-005, D-020) ──────────────────────
# The browser only ever talks to these proxies; Alpaca keys stay server-side.

SYMBOL_RE = re.compile(r"^[A-Z][A-Z0-9.\-]{0,19}$")
WATCHLIST_CAP = 30


@bp.get("/quotes")
@require_user
def get_quotes():
    raw = request.args.get("symbols", "")
    symbols = []
    for part in raw.split(","):
        symbol = part.strip().upper()
        if symbol and SYMBOL_RE.fullmatch(symbol) and symbol not in symbols:
            symbols.append(symbol)
    symbols = symbols[: quotes_service.MAX_SYMBOLS]
    if not symbols:
        return jsonify({"quotes": {}, "marketOpen": None})
    try:
        result = quotes_service.provider.get_quotes(symbols)
        market_open = quotes_service.provider.market_open()
    except quotes_service.QuotesError as exc:
        return _err(exc.code, 503)
    return jsonify({"quotes": result, "marketOpen": market_open})


@bp.get("/symbols/search")
@require_user
def search_symbols():
    query = request.args.get("q", "").strip()
    if not query:
        return jsonify({"results": []})
    try:
        results = quotes_service.provider.search(query)
    except quotes_service.QuotesError as exc:
        return _err(exc.code, 503)
    return jsonify({"results": results})


@bp.get("/watchlist")
@require_user
def list_watchlist():
    items = (
        db.session.query(WatchlistItem)
        .filter_by(user_id=current_user.id)
        .order_by(WatchlistItem.sort_order, WatchlistItem.id)
        .all()
    )
    return jsonify({"items": [i.to_json() for i in items]})


@bp.post("/watchlist")
@require_user
def add_watchlist_item():
    data = _json_body()
    symbol = str(data.get("symbol") or "").strip().upper()
    if not SYMBOL_RE.fullmatch(symbol or ""):
        return _err("invalid_payload")
    q = db.session.query(WatchlistItem).filter_by(user_id=current_user.id)
    if q.count() >= WATCHLIST_CAP:
        return _err("watchlist_full")
    if q.filter_by(symbol=symbol).first():
        return _err("watchlist_duplicate", 409)
    max_order = (
        db.session.query(db.func.coalesce(db.func.max(WatchlistItem.sort_order), 0))
        .filter(WatchlistItem.user_id == current_user.id)
        .scalar()
    )
    item = WatchlistItem(
        user_id=current_user.id, symbol=symbol, sort_order=max_order + 1
    )
    db.session.add(item)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return _err("watchlist_duplicate", 409)
    return jsonify(item.to_json()), 201


@bp.delete("/watchlist/<int:item_id>")
@require_user
def delete_watchlist_item(item_id):
    item = db.session.get(WatchlistItem, item_id)
    if item is None or item.user_id != current_user.id:
        return _err("not_found", 404)
    db.session.delete(item)
    db.session.commit()
    return jsonify({"ok": True})


@bp.patch("/watchlist/reorder")
@require_user
def reorder_watchlist():
    """{"ids": [...]} in the desired order; ids not owned are ignored."""
    data = _json_body()
    ids = data.get("ids")
    if not isinstance(ids, list):
        return _err("invalid_payload")
    items = {
        i.id: i
        for i in db.session.query(WatchlistItem).filter_by(user_id=current_user.id)
    }
    order = 0
    for raw in ids:
        item = items.get(raw if isinstance(raw, int) else None)
        if item:
            order += 1
            item.sort_order = order
    db.session.commit()
    return list_watchlist()


# ── Portfolio snapshots + device tokens (TL-DATA-006) ────────────
# The local agent (backend/push_snapshot.py) reads the user's own IB Gateway
# and pushes a snapshot here over HTTPS. Cloud side holds ZERO IBKR
# credentials — only a hashed, revocable device token that can do exactly one
# thing. This is the app's only non-session endpoint besides the job trigger.


def _hash_device_token(token):
    return hashlib.sha256(token.encode()).hexdigest()


def _parse_ts(value):
    """ISO timestamp -> aware datetime (naive treated as UTC), else None."""
    try:
        ts = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except (TypeError, ValueError):
        return None
    return ts if ts.tzinfo else ts.replace(tzinfo=timezone.utc)


@bp.get("/broker/devices")
@require_user
def list_devices():
    devices = (
        db.session.query(BrokerSyncDevice)
        .filter_by(user_id=current_user.id)
        .order_by(BrokerSyncDevice.id)
        .all()
    )
    return jsonify({"devices": [d.to_json() for d in devices]})


@bp.post("/broker/devices")
@require_user
def create_device():
    """Mint a device token. The PLAINTEXT appears exactly once — in this
    response — and is never stored or shown again (hash + last-4 hint only)."""
    data = _json_body()
    name = _s(data.get("name") or "", 60).strip() or "Local agent"
    expires_days = _parse_number(data.get("expiresDays"))
    token = secrets.token_hex(32)
    device = BrokerSyncDevice(
        user_id=current_user.id,
        name=name,
        token_hash=_hash_device_token(token),
        token_hint=token[-4:],
        expires_at=(utcnow() + timedelta(days=expires_days))
        if expires_days and expires_days > 0
        else None,
    )
    db.session.add(device)
    db.session.commit()
    return jsonify({"device": device.to_json(), "token": token}), 201


@bp.delete("/broker/devices/<int:device_id>")
@require_user
def revoke_device(device_id):
    """Revoke, not delete: snapshots keep their FK and the audit trail stays."""
    device = db.session.get(BrokerSyncDevice, device_id)
    if device is None or device.user_id != current_user.id:
        return _err("not_found", 404)
    if device.revoked_at is None:
        device.revoked_at = utcnow()
        db.session.commit()
    return jsonify(device.to_json())


def _prune_snapshots(user_id, keep_id):
    """Retention (TL-DATA-006): last snapshot per day, 30 days back."""
    cutoff = utcnow() - timedelta(days=30)
    keep = db.session.get(PortfolioSnapshot, keep_id)
    doomed = (
        db.session.query(PortfolioSnapshot)
        .filter(PortfolioSnapshot.user_id == user_id, PortfolioSnapshot.id != keep_id)
        .all()
    )
    for snap in doomed:
        same_day = (
            keep is not None
            and snap.captured_at.astimezone(timezone.utc).date()
            == keep.captured_at.astimezone(timezone.utc).date()
        )
        if snap.captured_at < cutoff or same_day:
            db.session.delete(snap)  # positions ride the delete-orphan cascade


@bp.post("/broker/push")
def push_snapshot():
    """Device-token Bearer + timestamp/nonce anti-replay. Grants exactly one
    power: storing a snapshot for the device's owner."""
    auth = request.headers.get("Authorization", "")
    token = auth[7:].strip() if auth.startswith("Bearer ") else ""
    if not token:
        return _err("invalid_device_token", 401)
    device = (
        db.session.query(BrokerSyncDevice)
        .filter_by(token_hash=_hash_device_token(token))
        .first()
    )
    now = utcnow()
    if (
        device is None
        or device.revoked_at is not None
        or (device.expires_at is not None and device.expires_at < now)
    ):
        return _err("invalid_device_token", 401)

    data = _json_body()
    ts = _parse_ts(data.get("timestamp"))
    if ts is None:
        return _err("invalid_payload")
    if abs((now - ts).total_seconds()) > config.PUSH_REPLAY_WINDOW:
        return _err("stale_timestamp", 401)
    nonce = _s(data.get("nonce") or "", 64).strip()
    if not nonce:
        return _err("invalid_payload")

    captured_at = _parse_ts(data.get("capturedAt")) or ts
    snapshot = PortfolioSnapshot(
        user_id=device.user_id,
        device_id=device.id,
        nonce=nonce,
        captured_at=captured_at,
        base_currency=_s(data.get("baseCurrency") or "USD", 10),
        summary=[
            {
                "tag": _s(item.get("tag", ""), 40),
                "value": _parse_number(item.get("value")),
                "currency": _s(item.get("currency") or "USD", 10),
            }
            for item in (data.get("summary") or [])
            if isinstance(item, dict) and item.get("tag")
        ][:20],
    )
    for item in data.get("positions") or []:
        if not isinstance(item, dict):
            continue
        symbol = _s(item.get("symbol") or "", 20).strip().upper()
        quantity = _parse_number(item.get("quantity"))
        if not symbol or quantity is None:
            continue
        snapshot.positions.append(
            PositionSnapshot(
                symbol=symbol,
                quantity=quantity,
                avg_cost=_parse_number(item.get("avgCost")),
                currency=_s(item.get("currency") or "USD", 10),
                sec_type=_s(item.get("secType") or "STK", 10),
            )
        )
    db.session.add(snapshot)
    device.last_used_at = now
    try:
        db.session.flush()
    except IntegrityError:  # (device, nonce) already used -> replay
        db.session.rollback()
        return _err("replay_detected", 409)
    _prune_snapshots(device.user_id, snapshot.id)
    db.session.commit()
    return jsonify({"ok": True, "snapshotId": snapshot.id}), 201


@bp.get("/broker/snapshots/latest")
@require_user
def latest_snapshot():
    snap = (
        db.session.query(PortfolioSnapshot)
        .filter_by(user_id=current_user.id)
        .order_by(PortfolioSnapshot.captured_at.desc())
        .first()
    )
    return jsonify({"snapshot": snap.to_json() if snap else None})


# ── Scheduled-job trigger (TL-DEPLOY-001 AWS rework) ─────────────


@bp.post("/jobs/sync-flex")
def trigger_flex_sweep():
    """EventBridge Scheduler hits this daily with the X-Job-Secret header —
    the AWS replacement for the container-job carrier. Deliberately NOT
    session-authenticated: the secret grants exactly one power (start the
    sweep). Answers immediately; the sweep runs on a background thread
    because the scheduler's HTTP timeout is seconds, not minutes. Idempotent
    by construction (dedupe downstream), so double fires are harmless."""
    provided = request.headers.get("X-Job-Secret", "")
    if not config.JOB_SECRET or not secrets.compare_digest(
        provided, config.JOB_SECRET
    ):
        return _err("not_authenticated", 401)
    started = flex_service.start_background_sweep(
        current_app._get_current_object()
    )
    return jsonify({"started": started}), 202 if started else 200


# ── Onboarding profile (TL-FEAT-008) ─────────────────────────────
# Canonical answer slugs; the UI translates. Unknown values are dropped
# server-side so the columns only ever hold vocabulary the app understands.

PROFILE_EXPERIENCE = {"none", "lt1", "y1_3", "y3_5", "y5plus"}
PROFILE_ACCOUNT_TYPES = {"personal", "prop", "paper", "none"}
PROFILE_ASSETS = {"stocks", "etf", "options", "futures", "forex", "crypto", "other"}
PROFILE_GOALS = {"record", "analyze", "discipline", "strategy", "review"}
PROFILE_REFERRALS = {"search", "social", "friend", "course", "other"}
PROFILE_BROKERS = {
    "ibkr",
    "schwab",
    "fidelity",
    "robinhood",
    "webull",
    "etrade",
    "tastytrade",
    "moomoo",
    "other",
    "none",
}
ONBOARDING_STEPS = 8  # welcome .. connect (0-based currentStep clamps to this)


def _get_or_create_profile(user_id):
    profile = db.session.get(UserProfile, user_id)
    if profile is None:
        profile = UserProfile(user_id=user_id)
        db.session.add(profile)
        db.session.flush()
    return profile


def _clean_multi(value, allowed):
    """JSON list -> deduped list of known slugs (order preserved)."""
    if not isinstance(value, list):
        return []
    out = []
    for item in value:
        slug = str(item)
        if slug in allowed and slug not in out:
            out.append(slug)
    return out


@bp.get("/profile")
@require_user
def get_profile():
    profile = _get_or_create_profile(current_user.id)
    db.session.commit()
    return jsonify(profile.to_json())


@bp.patch("/profile")
@require_user
def update_profile():
    """Per-step persistence and the settings 'trading preferences' editor.
    Every field is optional; values outside the vocabulary are rejected
    (single-value fields) or filtered out (multi-select lists)."""
    data = _json_body()
    profile = _get_or_create_profile(current_user.id)
    if "experience" in data:
        value = data["experience"]
        if value is not None and value not in PROFILE_EXPERIENCE:
            return _err("invalid_payload")
        profile.experience = value
    if "accountTypes" in data:
        profile.account_types = _clean_multi(data["accountTypes"], PROFILE_ACCOUNT_TYPES)
    if "primaryBroker" in data:
        value = data["primaryBroker"]
        if value is not None and value not in PROFILE_BROKERS:
            return _err("invalid_payload")
        profile.primary_broker = value
    if "assets" in data:
        profile.assets = _clean_multi(data["assets"], PROFILE_ASSETS)
    if "goals" in data:
        profile.goals = _clean_multi(data["goals"], PROFILE_GOALS)
    if "referralSource" in data:
        value = data["referralSource"]
        if value is not None and value not in PROFILE_REFERRALS:
            return _err("invalid_payload")
        profile.referral_source = value
    if "currentStep" in data:
        step = _parse_number(data["currentStep"])
        if step is None:
            return _err("invalid_payload")
        profile.current_step = int(min(max(step, 0), ONBOARDING_STEPS))
    db.session.commit()
    return jsonify(profile.to_json())


@bp.post("/profile/complete")
@require_user
def complete_onboarding():
    """Finish (or, for legacy accounts, skip) onboarding. Idempotent: the
    first completion timestamp wins."""
    profile = _get_or_create_profile(current_user.id)
    if profile.onboarding_completed_at is None:
        profile.onboarding_completed_at = utcnow()
    db.session.commit()
    return jsonify(profile.to_json())


# ── Admin: user directory (read-only) ────────────────────────────


@bp.get("/admin/users")
@require_admin
def list_users():
    users = db.session.query(User).order_by(User.created_at).all()
    return jsonify({"users": [u.to_json() for u in users]})
