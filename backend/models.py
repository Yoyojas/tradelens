"""Database models. Milestone 2 step 1/1.5: users + auth codes; the remaining
tables (playbooks, trades, ...) arrive in step 2."""
from datetime import datetime, timezone

from flask_login import UserMixin

from extensions import db


def utcnow():
    return datetime.now(timezone.utc)


class User(UserMixin, db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    # Stored lowercase; uniqueness is therefore case-insensitive in practice.
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    # Null for accounts created via Google OAuth that never set a password.
    password_hash = db.Column(db.String(255), nullable=True)
    # Google's stable account id ("sub" claim). Null unless Google is linked.
    google_sub = db.Column(db.String(64), unique=True, nullable=True)
    display_name = db.Column(db.String(120), nullable=False, default="")
    role = db.Column(db.String(16), nullable=False, default="user")  # user | admin
    # Set once the address is proven (code confirmed / Google OAuth / seed).
    email_verified_at = db.Column(db.DateTime(timezone=True), nullable=True)
    created_at = db.Column(
        db.DateTime(timezone=True), nullable=False, default=utcnow
    )

    def get_id(self):
        # "<user id>:<session token>" goes into the cookies. The token names a
        # row in `sessions`; deleting that row signs the device out. Set as a
        # transient attribute by auth._start_session just before login_user.
        return f"{self.id}:{getattr(self, '_login_token', '')}"

    # One row per user once they touch onboarding (TL-FEAT-008); legacy
    # accounts got a row backfilled by migration 1bdf8c94ad63. delete-orphan:
    # deleting the user deletes the profile through THIS relationship — the
    # account-deletion cascade must not also bulk-delete it (double delete).
    profile = db.relationship(
        "UserProfile", uselist=False, lazy="joined", cascade="all, delete-orphan"
    )

    def to_json(self):
        """Shape consumed by the React AuthContext (camelCase)."""
        return {
            "id": self.id,
            "email": self.email,
            "displayName": self.display_name,
            "role": self.role,
            # False for Google-only accounts; the settings page uses this to
            # swap the change-password form for a "no password yet" notice.
            "hasPassword": bool(self.password_hash),
            "emailVerifiedAt": self.email_verified_at.isoformat()
            if self.email_verified_at
            else None,
            # Route guard inputs (TL-FEAT-008): incomplete -> /onboarding;
            # legacy accounts see the skippable variant.
            "onboardingCompleted": bool(
                self.profile and self.profile.onboarding_completed_at
            ),
            "onboardingLegacy": bool(self.profile and self.profile.is_legacy),
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }


# Languages with dedicated content columns on playbooks. English (base) is
# required; the rest are optional and the client falls back to English via
# tField. Matches the front end's `name` / `name_zh` / ... convention.
PLAYBOOK_LANGS = ("zh", "es", "fr", "de", "ja", "ko")


class Playbook(db.Model):
    """Curated strategy library. String primary keys (pb_1, pb_ab12cd…)
    preserve the mock seed ids so pre-M2 local data (adoptions, trade
    playbookId references) migrates without remapping."""

    __tablename__ = "playbooks"

    id = db.Column(db.String(40), primary_key=True)
    category = db.Column(db.String(60), nullable=False)
    market = db.Column(db.String(60), nullable=False)
    risk_level = db.Column(db.String(10), nullable=False, default="Medium")
    # Controlled-vocabulary labels shown on cards; stays a plain list (the
    # tags/trade_tags tables below are for per-trade tagging).
    tags = db.Column(db.JSON, nullable=False, default=list)

    # Translatable content: English base + optional per-language columns.
    name_en = db.Column(db.String(120), nullable=False)
    summary_en = db.Column(db.Text, nullable=False, default="")
    description_en = db.Column(db.Text, nullable=False, default="")
    rules_en = db.Column(db.JSON, nullable=False, default=list)
    name_zh = db.Column(db.String(120), nullable=True)
    summary_zh = db.Column(db.Text, nullable=True)
    description_zh = db.Column(db.Text, nullable=True)
    rules_zh = db.Column(db.JSON, nullable=True)
    name_es = db.Column(db.String(120), nullable=True)
    summary_es = db.Column(db.Text, nullable=True)
    description_es = db.Column(db.Text, nullable=True)
    rules_es = db.Column(db.JSON, nullable=True)
    name_fr = db.Column(db.String(120), nullable=True)
    summary_fr = db.Column(db.Text, nullable=True)
    description_fr = db.Column(db.Text, nullable=True)
    rules_fr = db.Column(db.JSON, nullable=True)
    name_de = db.Column(db.String(120), nullable=True)
    summary_de = db.Column(db.Text, nullable=True)
    description_de = db.Column(db.Text, nullable=True)
    rules_de = db.Column(db.JSON, nullable=True)
    name_ja = db.Column(db.String(120), nullable=True)
    summary_ja = db.Column(db.Text, nullable=True)
    description_ja = db.Column(db.Text, nullable=True)
    rules_ja = db.Column(db.JSON, nullable=True)
    name_ko = db.Column(db.String(120), nullable=True)
    summary_ko = db.Column(db.Text, nullable=True)
    description_ko = db.Column(db.Text, nullable=True)
    rules_ko = db.Column(db.JSON, nullable=True)

    is_curated = db.Column(db.Boolean, nullable=False, default=True)
    created_by = db.Column(db.String(40), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)

    def to_json(self):
        """Front-end shape: English in the base fields, translations as
        `name_zh` etc. only when present (tField treats missing as fallback)."""
        out = {
            "id": self.id,
            "name": self.name_en,
            "category": self.category,
            "market": self.market,
            "riskLevel": self.risk_level,
            "summary": self.summary_en or "",
            "description": self.description_en or "",
            "rules": self.rules_en or [],
            "tags": self.tags or [],
            "isCurated": self.is_curated,
            "createdBy": self.created_by,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }
        for lang in PLAYBOOK_LANGS:
            for field in ("name", "summary", "description", "rules"):
                value = getattr(self, f"{field}_{lang}")
                if value:
                    out[f"{field}_{lang}"] = value
        return out


class UserPlaybook(db.Model):
    """Adoption: a playbook pinned into a user's workspace (reference only)."""

    __tablename__ = "user_playbooks"

    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), primary_key=True)
    playbook_id = db.Column(
        db.String(40), db.ForeignKey("playbooks.id"), primary_key=True
    )
    adopted_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)


class ImportBatch(db.Model):
    """One bulk import (IBKR live, future Flex uploads, local migration)."""

    __tablename__ = "import_batches"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=False, index=True
    )
    source = db.Column(db.String(30), nullable=False, default="broker:ibkr")
    added = db.Column(db.Integer, nullable=False, default=0)
    skipped = db.Column(db.Integer, nullable=False, default=0)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)


class Trade(db.Model):
    """P&L is intentionally NOT stored: it is always derived from
    side/quantity/entry_price/exit_price/fees (src/utils/metrics.js
    realizedPnl), so an edit can never leave a stale stored figure."""

    __tablename__ = "trades"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=False, index=True
    )
    playbook_id = db.Column(
        db.String(40), db.ForeignKey("playbooks.id"), nullable=True
    )
    ticker = db.Column(db.String(20), nullable=False)
    side = db.Column(db.String(5), nullable=False, default="long")  # long | short
    # Numeric(18,4): stored exactly to 4 decimal places. to_json serializes as
    # JSON numbers (IEEE doubles) — exact for 4-dp values in any realistic
    # trading range, so the front end keeps plain number semantics.
    quantity = db.Column(db.Numeric(18, 4), nullable=False)
    entry_price = db.Column(db.Numeric(18, 4), nullable=False)
    exit_price = db.Column(db.Numeric(18, 4), nullable=True)  # null = still open
    open_date = db.Column(db.Date, nullable=False)
    close_date = db.Column(db.Date, nullable=True)
    fees = db.Column(db.Numeric(18, 4), nullable=False, default=0)
    notes = db.Column(db.Text, nullable=False, default="")
    source = db.Column(db.String(30), nullable=False, default="manual")
    external_id = db.Column(db.String(80), nullable=True)
    import_batch_id = db.Column(
        db.Integer, db.ForeignKey("import_batches.id"), nullable=True
    )
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)

    tags = db.relationship("Tag", secondary="trade_tags", lazy="selectin")

    __table_args__ = (
        # Broker dedupe: one row per (user, source, externalId). NULL
        # external_id (manual trades) never collides under SQL semantics.
        db.UniqueConstraint(
            "user_id", "source", "external_id", name="uq_trades_user_source_external"
        ),
    )

    def to_json(self):
        return {
            "id": self.id,
            "userId": self.user_id,
            "playbookId": self.playbook_id,
            "ticker": self.ticker,
            "side": self.side,
            "quantity": float(self.quantity),
            "entryPrice": float(self.entry_price),
            "exitPrice": float(self.exit_price) if self.exit_price is not None else None,
            "openDate": self.open_date.isoformat() if self.open_date else None,
            "closeDate": self.close_date.isoformat() if self.close_date else None,
            "fees": float(self.fees) if self.fees is not None else 0.0,
            "notes": self.notes or "",
            "tags": [tag.label for tag in self.tags],
            "source": self.source,
            "externalId": self.external_id,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }


class Tag(db.Model):
    """Trade tags. user_id NULL = shared template (admin-curated, usable by
    every account, editable only via admin endpoints); user_id set = private
    to that user. Label uniqueness is split into two partial indexes (shared
    domain / per-user domain) — migration 039c5b72c6da. App code additionally
    dedupes case-insensitively within a user's visible set."""

    __tablename__ = "tags"

    id = db.Column(db.Integer, primary_key=True)
    label = db.Column(db.String(40), nullable=False)
    color = db.Column(db.String(9), nullable=True)
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=True, index=True
    )

    __table_args__ = (
        db.Index(
            "uq_tags_shared_label",
            "label",
            unique=True,
            postgresql_where=db.text("user_id IS NULL"),
        ),
        db.Index(
            "uq_tags_user_label",
            "user_id",
            "label",
            unique=True,
            postgresql_where=db.text("user_id IS NOT NULL"),
        ),
    )

    def to_json(self):
        return {
            "id": self.id,
            "label": self.label,
            "color": self.color,
            # Shared tags are usable but read-only for regular users; the
            # settings tag manager keys its edit affordances off this flag.
            "shared": self.user_id is None,
        }


class TradeTag(db.Model):
    __tablename__ = "trade_tags"

    trade_id = db.Column(db.Integer, db.ForeignKey("trades.id"), primary_key=True)
    tag_id = db.Column(db.Integer, db.ForeignKey("tags.id"), primary_key=True)


class ReportSnapshot(db.Model):
    """Saved report payloads. Table lands with the 8-table model; the Reports
    view still computes live on the client this step, so no API writes here yet."""

    __tablename__ = "report_snapshots"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=False, index=True
    )
    playbook_id = db.Column(db.String(40), db.ForeignKey("playbooks.id"), nullable=True)
    payload = db.Column(db.JSON, nullable=False, default=dict)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)


class UserSession(db.Model):
    """One logged-in device. The cookie carries the token; revoking a row
    (settings page, password change/reset) signs that device out."""

    __tablename__ = "sessions"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=False, index=True
    )
    token = db.Column(db.String(64), unique=True, nullable=False)
    user_agent = db.Column(db.String(200), nullable=False, default="")
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)
    last_seen = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)

    def to_json(self, current_id=None):
        return {
            "id": self.id,
            "userAgent": self.user_agent,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "lastSeen": self.last_seen.isoformat() if self.last_seen else None,
            "current": self.id == current_id,
        }


class LoginAttempt(db.Model):
    """Failed password logins, keyed by the SUBMITTED email string (not a user
    FK) so unknown addresses rate-limit exactly like real ones — no account
    enumeration via the lockout. Rows expire out of the 15-minute window and
    are purged opportunistically on the next attempt for that email."""

    __tablename__ = "login_attempts"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), nullable=False, index=True)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)


# Provider/adapter contract (TL-DATA-004): how a broker can be linked.
# flex_query is the only implemented type; oauth / api_token are contract
# placeholders for future adapters; file_import marks brokers whose data can
# only arrive via manual statement upload; unsupported = listed, no path yet.
CONNECTION_TYPES = ("flex_query", "oauth", "api_token", "file_import", "unsupported")


class BrokerConnection(db.Model):
    """A saved broker link (TL-DATA-004). One per (user, provider). The Flex
    token is stored ONLY encrypted (flex_service.encrypt_token; Fernet key
    from the FLEX_TOKEN_KEY secret) — plaintext exists transiently in request
    memory and sync jobs, never in logs, errors, or API responses. token_mask
    keeps the last 4 characters for display."""

    __tablename__ = "broker_connections"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=False, index=True
    )
    provider = db.Column(db.String(30), nullable=False, default="ibkr-flex")
    connection_type = db.Column(db.String(20), nullable=False, default="flex_query")
    encrypted_token = db.Column(db.Text, nullable=False)
    token_mask = db.Column(db.String(8), nullable=False, default="")
    query_id = db.Column(db.String(40), nullable=False)
    date_format = db.Column(db.String(20), nullable=False, default="yyyyMMdd")
    # active | expired | error | disconnected
    status = db.Column(db.String(16), nullable=False, default="active")
    last_sync_at = db.Column(db.DateTime(timezone=True), nullable=True)
    next_sync_at = db.Column(db.DateTime(timezone=True), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)

    __table_args__ = (
        db.UniqueConstraint("user_id", "provider", name="uq_broker_conn_user_provider"),
    )

    def to_json(self):
        return {
            "id": self.id,
            "provider": self.provider,
            "connectionType": self.connection_type,
            # Masked summary only — the token itself never travels back.
            "tokenMask": f"****{self.token_mask}" if self.token_mask else "****",
            "queryId": self.query_id,
            "dateFormat": self.date_format,
            "status": self.status,
            "lastSyncAt": self.last_sync_at.isoformat() if self.last_sync_at else None,
            "nextSyncAt": self.next_sync_at.isoformat() if self.next_sync_at else None,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }


class SyncRun(db.Model):
    """One sync attempt (TL-DATA-004): initial / manual / scheduled. Pruned
    opportunistically after 90 days (flex_service.prune_sync_runs)."""

    __tablename__ = "sync_runs"

    id = db.Column(db.Integer, primary_key=True)
    connection_id = db.Column(
        db.Integer, db.ForeignKey("broker_connections.id"), nullable=False, index=True
    )
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=False, index=True
    )
    kind = db.Column(db.String(16), nullable=False, default="manual")
    status = db.Column(db.String(12), nullable=False, default="running")
    started_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)
    finished_at = db.Column(db.DateTime(timezone=True), nullable=True)
    added = db.Column(db.Integer, nullable=False, default=0)
    skipped = db.Column(db.Integer, nullable=False, default=0)
    failed = db.Column(db.Integer, nullable=False, default=0)
    error_code = db.Column(db.String(40), nullable=True)

    def to_json(self):
        return {
            "id": self.id,
            "kind": self.kind,
            "status": self.status,
            "startedAt": self.started_at.isoformat() if self.started_at else None,
            "finishedAt": self.finished_at.isoformat() if self.finished_at else None,
            "added": self.added,
            "skipped": self.skipped,
            "failed": self.failed,
            "errorCode": self.error_code,
        }


class BrokerSyncDevice(db.Model):
    """A local push agent's credential (TL-DATA-006). The plaintext token is
    shown ONCE at creation and only its SHA-256 hash is stored; token_hint
    keeps the last 4 characters for the settings list. Parallel to — never
    mixed with — the session system: it can do exactly one thing, push
    snapshots."""

    __tablename__ = "broker_sync_devices"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=False, index=True
    )
    name = db.Column(db.String(60), nullable=False)
    token_hash = db.Column(db.String(64), unique=True, nullable=False)
    token_hint = db.Column(db.String(8), nullable=False, default="")
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)
    last_used_at = db.Column(db.DateTime(timezone=True), nullable=True)
    expires_at = db.Column(db.DateTime(timezone=True), nullable=True)
    revoked_at = db.Column(db.DateTime(timezone=True), nullable=True)

    def to_json(self):
        return {
            "id": self.id,
            "name": self.name,
            "tokenHint": f"****{self.token_hint}" if self.token_hint else "****",
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "lastUsedAt": self.last_used_at.isoformat() if self.last_used_at else None,
            "expiresAt": self.expires_at.isoformat() if self.expires_at else None,
            "revoked": self.revoked_at is not None,
        }


class PortfolioSnapshot(db.Model):
    """One pushed portfolio state (TL-DATA-006). captured_at = when the local
    agent read the Gateway; received_at = when the cloud stored it. The UI
    always shows BOTH and never presents a snapshot as live data. Retention:
    last snapshot per day, 30 days (pruned on push)."""

    __tablename__ = "portfolio_snapshots"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=False, index=True
    )
    device_id = db.Column(
        db.Integer, db.ForeignKey("broker_sync_devices.id"), nullable=False
    )
    nonce = db.Column(db.String(64), nullable=False)
    captured_at = db.Column(db.DateTime(timezone=True), nullable=False)
    received_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)
    base_currency = db.Column(db.String(10), nullable=False, default="USD")
    # [{tag, value, currency}] — raw IBKR account tags; the client maps known
    # tags to translated product names (connect.tag_* i18n keys).
    summary = db.Column(db.JSON, nullable=True)

    positions = db.relationship(
        "PositionSnapshot", lazy="selectin", cascade="all, delete-orphan"
    )

    __table_args__ = (
        # Anti-replay backstop: a nonce can be accepted once per device, ever.
        db.UniqueConstraint("device_id", "nonce", name="uq_snapshot_device_nonce"),
    )

    def to_json(self):
        return {
            "id": self.id,
            "capturedAt": self.captured_at.isoformat() if self.captured_at else None,
            "receivedAt": self.received_at.isoformat() if self.received_at else None,
            "baseCurrency": self.base_currency,
            "summary": self.summary or [],
            "positions": [p.to_json() for p in self.positions],
        }


class PositionSnapshot(db.Model):
    __tablename__ = "position_snapshots"

    id = db.Column(db.Integer, primary_key=True)
    snapshot_id = db.Column(
        db.Integer,
        db.ForeignKey("portfolio_snapshots.id"),
        nullable=False,
        index=True,
    )
    symbol = db.Column(db.String(20), nullable=False)
    quantity = db.Column(db.Numeric(18, 4), nullable=False)
    avg_cost = db.Column(db.Numeric(18, 4), nullable=True)
    currency = db.Column(db.String(10), nullable=False, default="USD")
    sec_type = db.Column(db.String(10), nullable=False, default="STK")

    def to_json(self):
        return {
            "symbol": self.symbol,
            "quantity": float(self.quantity),
            "avgCost": float(self.avg_cost) if self.avg_cost is not None else None,
            "currency": self.currency,
            "secType": self.sec_type,
        }


class WatchlistItem(db.Model):
    """Per-user stock watchlist (TL-DATA-005). Cap (30, the Alpaca Basic WS
    ceiling kept for consistency even on REST) is enforced at the API layer
    with the stable error code watchlist_full."""

    __tablename__ = "watchlist_items"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=False, index=True
    )
    symbol = db.Column(db.String(20), nullable=False)
    sort_order = db.Column(db.Integer, nullable=False, default=0)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)

    __table_args__ = (
        db.UniqueConstraint("user_id", "symbol", name="uq_watchlist_user_symbol"),
    )

    def to_json(self):
        return {"id": self.id, "symbol": self.symbol, "sortOrder": self.sort_order}


class UserProfile(db.Model):
    """Onboarding answers + completion state (TL-FEAT-008). One row per user;
    deliberately free of sensitive fields (no income / net worth / risk
    tolerance). List answers (account_types, assets, goals) store canonical
    English slugs — the UI translates for display."""

    __tablename__ = "user_profiles"

    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), primary_key=True)
    experience = db.Column(db.String(20), nullable=True)
    account_types = db.Column(db.JSON, nullable=True)
    primary_broker = db.Column(db.String(40), nullable=True)
    assets = db.Column(db.JSON, nullable=True)
    goals = db.Column(db.JSON, nullable=True)
    referral_source = db.Column(db.String(40), nullable=True)
    onboarding_completed_at = db.Column(db.DateTime(timezone=True), nullable=True)
    # Resume pointer: the step the user should land on next (0-based).
    current_step = db.Column(db.Integer, nullable=False, default=0)
    # True for accounts that predate onboarding: they get a one-time,
    # skippable intro (skip marks the flow complete).
    is_legacy = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)

    def to_json(self):
        return {
            "experience": self.experience,
            "accountTypes": self.account_types or [],
            "primaryBroker": self.primary_broker,
            "assets": self.assets or [],
            "goals": self.goals or [],
            "referralSource": self.referral_source,
            "completedAt": self.onboarding_completed_at.isoformat()
            if self.onboarding_completed_at
            else None,
            "currentStep": self.current_step,
            "legacy": self.is_legacy,
        }


class AuthCode(db.Model):
    """One-time 6-digit codes for email verification and password reset.

    Only the hash of a code is stored — the plaintext exists in the outgoing
    email and nowhere else. A code dies when consumed, expired, replaced by a
    newer one, or after MAX_CODE_ATTEMPTS wrong guesses.
    """

    __tablename__ = "auth_codes"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=False, index=True
    )
    purpose = db.Column(db.String(20), nullable=False)  # verify_email | reset_password
    code_hash = db.Column(db.String(255), nullable=False)
    expires_at = db.Column(db.DateTime(timezone=True), nullable=False)
    consumed_at = db.Column(db.DateTime(timezone=True), nullable=True)
    attempts = db.Column(db.Integer, nullable=False, default=0)
    created_at = db.Column(
        db.DateTime(timezone=True), nullable=False, default=utcnow
    )
