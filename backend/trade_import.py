"""Shared trade bulk-import core (TL-DATA-004 refactor).

Extracted from api.py so the scheduled Flex sync (flex_service / sync_job)
can insert trades without a request context. Semantics are UNCHANGED from
the original _bulk_import: per-user dedupe on (source, externalId) — D-010 —
plus a one-retry loop against concurrent duplicate inserts.
"""
import math
from datetime import date

from sqlalchemy.exc import IntegrityError

from extensions import db
from models import ImportBatch, Playbook, Tag, Trade


class ImportConflict(Exception):
    """Raised when even the retry attempt hits the unique constraint."""


def _parse_date(value):
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
    return number if math.isfinite(number) else default


def _s(value, maxlen):
    return str(value)[:maxlen]


def _valid_playbook_id(pid):
    if not pid:
        return None
    return str(pid) if db.session.get(Playbook, str(pid)) else None


def _tags_for_labels_import(labels, user_id):
    """Import payloads rarely carry tags; when they do, resolve/create within
    the user's visible set exactly like api._tags_for_labels (kept minimal
    here to avoid a circular import)."""
    from api import _tags_for_labels  # local import: api imports this module

    return _tags_for_labels(labels, user_id)


def trade_from_payload(data, user_id):
    """camelCase payload -> Trade. Returns (trade, error_code)."""
    ticker = _s(data.get("ticker", ""), 20).strip().upper()
    side = str(data.get("side", "long")).lower()
    quantity = _parse_number(data.get("quantity"))
    entry_price = _parse_number(data.get("entryPrice"))
    open_date = _parse_date(data.get("openDate"))
    if (
        not ticker
        or side not in ("long", "short")
        or quantity is None
        or entry_price is None
        or open_date is None
    ):
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
    if data.get("tags"):
        trade.tags = _tags_for_labels_import(data.get("tags"), user_id)
    return trade, None


def existing_external_ids(user_id):
    return {
        (source, external_id)
        for source, external_id in db.session.query(
            Trade.source, Trade.external_id
        ).filter(Trade.user_id == user_id, Trade.external_id.isnot(None))
    }


def bulk_import(user_id, incoming, batch_source):
    """Insert trade payloads for a user with source+externalId dedupe.
    Returns {"added": n, "skipped": n}. Raises ImportConflict if a concurrent
    import defeats both attempts (the caller maps it to HTTP 409 / error run).
    """
    for attempt in (1, 2):
        existing = existing_external_ids(user_id)

        batch = ImportBatch(user_id=user_id, source=batch_source)
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
            trade, error = trade_from_payload(item, user_id)
            if error:
                skipped += 1
                continue
            trade.import_batch_id = batch.id
            db.session.add(trade)
            if external_id:
                existing.add((source, external_id))  # dedupes within the batch too
            added += 1

        batch.added, batch.skipped = added, skipped
        try:
            db.session.commit()
            return {"added": added, "skipped": skipped}
        except IntegrityError:
            db.session.rollback()
            if attempt == 2:
                raise ImportConflict()
