"""IBKR Flex Web Service sync (TL-DATA-004).

Responsibilities:
- Recoverable token encryption (Fernet; key = FLEX_TOKEN_KEY secret). The
  daily job must decrypt tokens, so hashing is not an option (approved
  design). Plaintext tokens exist only transiently in memory — NEVER in
  logs, error messages, API responses, or the database.
- Server-side Flex XML parsing — the Python mirror of src/services/flex.js
  (STK only, sign conventions, `20260302;093105` datetimes).
- Flex Web Service fetch: SendRequest -> poll GetStatement, exponential
  backoff on "not ready" (1019/1004) and throttle (1018) responses, stable
  translatable error codes for everything else.
- run_sync: fetch + parse + FIFO pairing (pairing.pair_executions — the same
  code path as manual upload) + idempotent insert (trade_import.bulk_import,
  (user, source, externalId) dedupe) + a sync_runs audit row.

Read-only by design: this module only READS statements (D-003).
"""
import re
import threading
import time
import xml.etree.ElementTree as ET
from datetime import timedelta

import requests
from cryptography.fernet import Fernet, InvalidToken

import config
from extensions import db
from models import BrokerConnection, SyncRun, utcnow
from pairing import pair_executions
from trade_import import ImportConflict, bulk_import

FLEX_SOURCE = "broker:ibkr-flex"
SEND_URL = (
    "https://ndcdyn.interactivebrokers.com/AccountManagement/FlexWebService/SendRequest"
)
# Official limits: 1 req/sec, 10/min; statements update after the close, so
# the scheduled job runs the NEXT morning (US/Eastern) per IBKR guidance.
RETRYABLE_CODES = {"1004", "1019", "1018"}  # incomplete / generating / throttled
TOKEN_ERROR_CODES = {"1012", "1013", "1015"}  # expired / IP restricted / invalid
QUERY_ERROR_CODES = {"1003", "1020", "1021"}  # invalid or unavailable query
MAX_POLL_ATTEMPTS = 5
SYNC_RUN_RETENTION_DAYS = 90


class FlexError(Exception):
    """Sync failure with a stable, translatable code (never contains the
    token or any response body)."""

    def __init__(self, code):
        super().__init__(code)
        self.code = code


# ── Token encryption ─────────────────────────────────────────────


def _fernet():
    if not config.FLEX_TOKEN_KEY:
        raise FlexError("flex_key_missing")
    try:
        return Fernet(config.FLEX_TOKEN_KEY.encode())
    except (ValueError, Exception) as exc:  # malformed key
        if isinstance(exc, FlexError):
            raise
        raise FlexError("flex_key_missing")


def encrypt_token(plain):
    return _fernet().encrypt(plain.encode()).decode()


def decrypt_token(blob):
    try:
        return _fernet().decrypt(blob.encode()).decode()
    except InvalidToken:
        # Key rotated without re-entering tokens: surface as an expired token
        # so the UI asks the user to update it.
        raise FlexError("flex_token_expired")


def token_mask(plain):
    return plain[-4:] if len(plain) >= 4 else "?" * len(plain)


# ── Flex XML parsing (mirror of src/services/flex.js) ────────────


def _parse_flex_datetime(value):
    raw = str(value or "").strip()
    if not raw:
        return None
    parts = re.split(r"[;,\s]+", raw)
    d = parts[0].replace("-", "")
    if not re.fullmatch(r"\d{8}", d):
        return None
    date = f"{d[0:4]}-{d[4:6]}-{d[6:8]}"
    t = (parts[1] if len(parts) > 1 else "").replace(":", "")
    if re.fullmatch(r"\d{6}", t):
        return f"{date}T{t[0:2]}:{t[2:4]}:{t[4:6]}"
    return f"{date}T00:00:00"


def parse_flex_xml(xml_text):
    """-> (executions, skipped_non_stock, skipped_bad). Raises FlexError on
    non-XML input. Field completeness issues surface per row (skipped_bad)."""
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError:
        raise FlexError("flex_parse_error")

    executions, skipped_non_stock, skipped_bad = [], 0, 0
    for node in root.iter("Trade"):
        attr = node.attrib.get
        asset = attr("assetCategory", "")
        if asset and asset != "STK":
            skipped_non_stock += 1
            continue
        side = attr("buySell", "").upper()
        try:
            shares = abs(float(attr("quantity", "")))
        except ValueError:
            shares = 0.0
        try:
            price = float(attr("tradePrice", ""))
        except ValueError:
            price = None
        exec_id = attr("tradeID", "")
        symbol = attr("symbol", "")
        try:
            # ibCommission is negative in Flex exports (a cost).
            commission = abs(float(attr("ibCommission") or attr("commission") or "0"))
        except ValueError:
            commission = 0.0
        time_str = _parse_flex_datetime(attr("dateTime") or attr("tradeDate"))
        if (
            not exec_id
            or not symbol
            or side not in ("BUY", "SELL")
            or not shares
            or price is None
            or not time_str
        ):
            skipped_bad += 1
            continue
        executions.append(
            {
                "execId": exec_id,
                "symbol": symbol,
                "side": side,
                "shares": shares,
                "price": price,
                "time": time_str,
                "commission": commission,
                "currency": attr("currency") or "USD",
            }
        )
    return executions, skipped_non_stock, skipped_bad


# ── Flex Web Service fetch ───────────────────────────────────────


def _flex_error_code(error_code):
    if error_code in TOKEN_ERROR_CODES:
        return "flex_token_expired"
    if error_code in QUERY_ERROR_CODES:
        return "flex_query_invalid"
    if error_code == "1018":
        return "flex_rate_limited"
    if error_code in RETRYABLE_CODES:
        return "flex_not_ready"
    return "flex_error"


def fetch_statement(token, query_id, http=requests, sleep=time.sleep):
    """SendRequest -> poll GetStatement until the XML statement arrives.
    `http` and `sleep` are injectable for tests. Never logs the token."""
    try:
        resp = http.get(
            SEND_URL, params={"t": token, "q": query_id, "v": "3"}, timeout=30
        )
    except requests.RequestException:
        raise FlexError("flex_unreachable")
    try:
        root = ET.fromstring(resp.text)
    except ET.ParseError:
        raise FlexError("flex_parse_error")
    status = (root.findtext("Status") or "").strip()
    if status != "Success":
        raise FlexError(_flex_error_code((root.findtext("ErrorCode") or "").strip()))
    reference = (root.findtext("ReferenceCode") or "").strip()
    base_url = (root.findtext("Url") or "").strip()
    if not reference or not base_url:
        raise FlexError("flex_error")

    delay = 2
    for attempt in range(MAX_POLL_ATTEMPTS):
        sleep(delay)
        try:
            resp = http.get(
                base_url, params={"t": token, "q": reference, "v": "3"}, timeout=60
            )
        except requests.RequestException:
            raise FlexError("flex_unreachable")
        text = resp.text
        # A ready statement starts with FlexQueryResponse; the "still
        # generating" envelope is a FlexStatementResponse with an ErrorCode.
        if "<FlexStatementResponse" in text[:200]:
            try:
                root = ET.fromstring(text)
            except ET.ParseError:
                raise FlexError("flex_parse_error")
            code = (root.findtext("ErrorCode") or "").strip()
            mapped = _flex_error_code(code)
            if mapped in ("flex_not_ready", "flex_rate_limited") and attempt < MAX_POLL_ATTEMPTS - 1:
                delay *= 2  # exponential backoff: 2,4,8,16s
                continue
            raise FlexError(mapped)
        return text
    raise FlexError("flex_not_ready")


# ── Sync execution ───────────────────────────────────────────────


def prune_sync_runs(user_id):
    cutoff = utcnow() - timedelta(days=SYNC_RUN_RETENTION_DAYS)
    db.session.query(SyncRun).filter(
        SyncRun.user_id == user_id, SyncRun.started_at < cutoff
    ).delete(synchronize_session=False)


def _parse_exec_times(executions):
    from datetime import datetime

    for item in executions:
        item["time"] = datetime.fromisoformat(item["time"])
    return executions


def run_sync(connection, kind, http=requests, sleep=time.sleep):
    """One full sync for a connection. Records a SyncRun either way and
    keeps connection.status/last_sync_at/next_sync_at up to date. Returns the
    SyncRun. Idempotent: re-running the same 365-day query re-skips existing
    (source, externalId) rows — the approved conservative choice."""
    run = SyncRun(
        connection_id=connection.id, user_id=connection.user_id, kind=kind
    )
    db.session.add(run)
    db.session.commit()
    try:
        token = decrypt_token(connection.encrypted_token)
        xml_text = fetch_statement(token, connection.query_id, http=http, sleep=sleep)
        token = None  # drop the plaintext as soon as possible
        executions, _non_stock, bad = parse_flex_xml(xml_text)
        paired = pair_executions(_parse_exec_times(executions), source=FLEX_SOURCE)
        result = bulk_import(connection.user_id, paired, FLEX_SOURCE)
        run.added, run.skipped, run.failed = result["added"], result["skipped"], bad
        run.status = "ok"
        connection.status = "active"
        connection.last_sync_at = utcnow()
        connection.next_sync_at = utcnow() + timedelta(days=1)
    except (FlexError, ImportConflict) as exc:
        run.status = "error"
        run.error_code = exc.code if isinstance(exc, FlexError) else "conflict"
        if run.error_code == "flex_token_expired":
            connection.status = "expired"
        elif run.error_code not in ("flex_not_ready", "flex_rate_limited"):
            connection.status = "error"
    finally:
        run.finished_at = utcnow()
        prune_sync_runs(connection.user_id)
        db.session.commit()
    return run


# ── Scheduled sweep over every connection ────────────────────────
# Runs from sync_job.py (CLI) or the /api/jobs/sync-flex trigger endpoint
# (EventBridge Scheduler in production — TL-DEPLOY-001 AWS rework).

_sweep_lock = threading.Lock()


def sync_all_connections(sleep=time.sleep):
    """One pass over all non-disconnected connections, kind=scheduled.
    Spacing keeps us far inside the official 10 req/min limit. Returns a
    summary list of (connection_id, status, error_code) — counts only, no
    tokens, safe to log."""
    connections = (
        db.session.query(BrokerConnection)
        .filter(BrokerConnection.status != "disconnected")
        .order_by(BrokerConnection.id)
        .all()
    )
    summary = []
    for index, conn in enumerate(connections):
        if index:
            sleep(6)
        run = run_sync(conn, kind="scheduled")
        summary.append((conn.id, run.status, run.error_code))
    return summary


def start_background_sweep(app):
    """Kick off sync_all_connections on a daemon thread (the trigger endpoint
    must answer fast — EventBridge API destinations time out in seconds).
    Returns False when a sweep is already running (concurrency guard)."""
    if not _sweep_lock.acquire(blocking=False):
        return False

    def worker():
        try:
            with app.app_context():
                summary = sync_all_connections()
                print(f"[flex-sweep] done: {len(summary)} connection(s)")
        finally:
            _sweep_lock.release()

    threading.Thread(target=worker, daemon=True).start()
    return True
