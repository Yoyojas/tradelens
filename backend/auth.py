"""Authentication endpoints: email/password + Google OAuth.

Session = Flask-Login httpOnly cookie (SameSite=Lax), no JWT. Every failure
body is {"error": <stable code>} so the front end can map codes to translated
copy instead of echoing English prose.

Privacy notes:
- Passwords are hashed with werkzeug (scrypt); plaintext is never stored or
  logged. Nothing in this module logs credentials or tokens.
- Google flow requests only "openid email profile" (read-only identity).
- Authlib generates and validates the OAuth `state` parameter via the session,
  which is the CSRF protection for the callback.
"""
import re
import secrets
from datetime import datetime, timedelta, timezone

from flask import Blueprint, g, jsonify, redirect, request
from flask_login import current_user, login_user, logout_user
from werkzeug.security import check_password_hash, generate_password_hash

import config
import email_templates
import mailer
from extensions import db, login_manager, oauth
from models import (
    AuthCode,
    BrokerConnection,
    BrokerSyncDevice,
    ImportBatch,
    LoginAttempt,
    PortfolioSnapshot,
    PositionSnapshot,
    ReportSnapshot,
    SyncRun,
    Tag,
    Trade,
    TradeTag,
    User,
    UserPlaybook,
    UserProfile,
    UserSession,
    WatchlistItem,
    utcnow,
)

bp = Blueprint("auth", __name__, url_prefix="/api/auth")

EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
MIN_PASSWORD_LEN = 8

CODE_TTL = timedelta(minutes=10)
RESEND_COOLDOWN = timedelta(seconds=60)
MAX_CODE_ATTEMPTS = 5

# Login rate limit: this many failed passwords within the window locks the
# email for the remainder of the window (sliding — the lock ends when the
# oldest failure ages out).
LOGIN_MAX_FAILURES = 5
LOGIN_WINDOW = timedelta(minutes=15)


def _start_session(user):
    """Create a sessions row for this device and log it in. The token lands in
    the cookies via get_id(); revoking the row signs the device out."""
    token = secrets.token_hex(16)
    record = UserSession(
        user_id=user.id,
        token=token,
        user_agent=str(request.user_agent.string or "")[:200],
    )
    db.session.add(record)
    db.session.commit()
    user._login_token = token
    g.current_session_id = record.id
    login_user(user, remember=True)


@login_manager.user_loader
def load_user(stored_id):
    # get_id() is "<user id>:<session token>". The token must name a live row
    # in `sessions` — revoked/rotated cookies stop resolving here.
    try:
        raw_id, _, token = str(stored_id).partition(":")
        user_id = int(raw_id)
    except (TypeError, ValueError):
        return None
    if not token:
        return None
    record = db.session.query(UserSession).filter_by(token=token).first()
    if record is None or record.user_id != user_id:
        return None
    user = db.session.get(User, user_id)
    if user is None:
        return None
    # Track device activity, throttled so not every request writes.
    now = utcnow()
    last = record.last_seen if record.last_seen.tzinfo else record.last_seen.replace(
        tzinfo=timezone.utc
    )
    if (now - last).total_seconds() > 60:
        record.last_seen = now
        db.session.commit()
    g.current_session_id = record.id
    user._login_token = token  # keep get_id stable if cookies get re-minted
    return user


@login_manager.unauthorized_handler
def unauthorized():
    return _err("not_authenticated", 401)


def _err(code, status=400):
    return jsonify({"error": code}), status


def register_google_client():
    """Register the Google OAuth client if credentials are configured.

    Called from app.py after oauth.init_app. When credentials are absent the
    endpoints below answer 503 oauth_not_configured instead of crashing.
    """
    if not (config.GOOGLE_CLIENT_ID and config.GOOGLE_CLIENT_SECRET):
        return
    oauth.register(
        "google",
        client_id=config.GOOGLE_CLIENT_ID,
        client_secret=config.GOOGLE_CLIENT_SECRET,
        server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
        # Read-only identity only; deliberately no wider scopes.
        client_kwargs={"scope": "openid email profile"},
    )


# ── Email / password ─────────────────────────────────────────────


@bp.post("/register")
def register():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))
    display_name = str(data.get("displayName", "")).strip()

    if not email or not password:
        return _err("missing_fields")
    if not EMAIL_RE.match(email):
        return _err("invalid_email")
    if len(password) < MIN_PASSWORD_LEN:
        return _err("password_too_short")
    if db.session.query(User.id).filter_by(email=email).first():
        return _err("email_taken", 409)

    user = User(
        email=email,
        password_hash=generate_password_hash(password),
        display_name=display_name or email,
        role="user",
    )
    db.session.add(user)
    db.session.commit()
    _start_session(user)
    return jsonify(user.to_json()), 201


def _login_lock_remaining(email):
    """Purge expired failures for this email; if the survivors hit the cap,
    return seconds until the oldest ages out (i.e. the lock lifts)."""
    cutoff = utcnow() - LOGIN_WINDOW
    db.session.query(LoginAttempt).filter(
        LoginAttempt.email == email, LoginAttempt.created_at < cutoff
    ).delete()
    db.session.commit()
    failures = (
        db.session.query(LoginAttempt)
        .filter_by(email=email)
        .order_by(LoginAttempt.created_at)
        .all()
    )
    if len(failures) < LOGIN_MAX_FAILURES:
        return None
    oldest = failures[0].created_at
    oldest = oldest if oldest.tzinfo else oldest.replace(tzinfo=timezone.utc)
    return max(1, int((oldest + LOGIN_WINDOW - utcnow()).total_seconds()))


@bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))

    # Rate limit before any credential work. Applies identically to unknown
    # emails (keyed by the submitted string), and locked attempts are NOT
    # recorded — an attacker can't extend the lock indefinitely.
    if email:
        remaining = _login_lock_remaining(email)
        if remaining is not None:
            return (
                jsonify({"error": "too_many_login_attempts", "retryAfter": remaining}),
                429,
            )

    user = db.session.query(User).filter_by(email=email).first()
    # One generic error for unknown email, wrong password, and OAuth-only
    # accounts (password_hash is null) — avoids account enumeration.
    if (
        user is None
        or not user.password_hash
        or not check_password_hash(user.password_hash, password)
    ):
        if email:
            db.session.add(LoginAttempt(email=email))
            db.session.commit()
        return _err("invalid_credentials", 401)

    # Success clears the counter.
    db.session.query(LoginAttempt).filter_by(email=email).delete()
    db.session.commit()
    _start_session(user)
    return jsonify(user.to_json())


@bp.post("/logout")
def logout():
    # Touch current_user FIRST: the user loader runs lazily on first access
    # and is what populates g.current_session_id.
    if current_user.is_authenticated:
        session_id = getattr(g, "current_session_id", None)
        if session_id:
            # Drop this device's session row so the cookie can't come back.
            db.session.query(UserSession).filter_by(id=session_id).delete()
            db.session.commit()
    logout_user()
    return jsonify({"ok": True})


@bp.get("/me")
def me():
    if not current_user.is_authenticated:
        return _err("not_authenticated", 401)
    return jsonify(current_user.to_json())


# ── One-time codes (email verification / password reset) ────────


def _aware(dt):
    """DB backends like SQLite drop tzinfo; treat naive stamps as UTC."""
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _active_code(user_id, purpose):
    return (
        db.session.query(AuthCode)
        .filter_by(user_id=user_id, purpose=purpose, consumed_at=None)
        .order_by(AuthCode.created_at.desc())
        .first()
    )


def _issue_code(user, purpose, lang):
    """Create + email a 6-digit code (localized subject/body). Returns an
    error code or None.

    Enforces the 60 s resend cooldown, retires any previous active code for
    the same purpose, and only commits after the email actually went out.
    """
    latest = (
        db.session.query(AuthCode)
        .filter_by(user_id=user.id, purpose=purpose)
        .order_by(AuthCode.created_at.desc())
        .first()
    )
    if latest and utcnow() - _aware(latest.created_at) < RESEND_COOLDOWN:
        return "resend_cooldown"

    db.session.query(AuthCode).filter_by(
        user_id=user.id, purpose=purpose, consumed_at=None
    ).update({"consumed_at": utcnow()})

    code = f"{secrets.randbelow(10**6):06d}"
    db.session.add(
        AuthCode(
            user_id=user.id,
            purpose=purpose,
            code_hash=generate_password_hash(code),
            expires_at=utcnow() + CODE_TTL,
        )
    )
    subject, body = email_templates.render(purpose, lang, code)
    try:
        mailer.send_email(user.email, subject, body)
    except mailer.MailNotConfigured:
        db.session.rollback()
        return "mail_not_configured"
    except Exception:
        db.session.rollback()
        return "mail_send_failed"
    db.session.commit()
    return None


def _consume_code(user, purpose, code):
    """Validate a submitted code. Returns an error code or None (success)."""
    rec = _active_code(user.id, purpose)
    if rec is None:
        return "code_invalid"
    if utcnow() > _aware(rec.expires_at):
        rec.consumed_at = utcnow()
        db.session.commit()
        return "code_expired"
    if not check_password_hash(rec.code_hash, str(code)):
        rec.attempts += 1
        expired_by_attempts = rec.attempts >= MAX_CODE_ATTEMPTS
        if expired_by_attempts:
            rec.consumed_at = utcnow()
        db.session.commit()
        return "too_many_attempts" if expired_by_attempts else "code_invalid"
    rec.consumed_at = utcnow()
    db.session.commit()
    return None


def _requested_lang():
    """Optional {lang} from the request body; whitelisted, defaults to en."""
    data = request.get_json(silent=True)
    lang = data.get("lang") if isinstance(data, dict) else None
    return email_templates.normalize_lang(lang)


@bp.post("/verify/request")
def verify_request():
    if not current_user.is_authenticated:
        return _err("not_authenticated", 401)
    if current_user.email_verified_at:
        return jsonify({"ok": True, "alreadyVerified": True})
    if not mailer.is_configured():
        return _err("mail_not_configured", 503)
    error = _issue_code(current_user, "verify_email", _requested_lang())
    if error == "resend_cooldown":
        return _err(error, 429)
    if error:
        return _err(error, 503)
    return jsonify({"ok": True})


@bp.post("/verify/confirm")
def verify_confirm():
    if not current_user.is_authenticated:
        return _err("not_authenticated", 401)
    if current_user.email_verified_at:
        return jsonify(current_user.to_json())
    data = request.get_json(silent=True) or {}
    error = _consume_code(current_user, "verify_email", data.get("code", ""))
    if error:
        return _err(error, 400)
    current_user.email_verified_at = utcnow()
    db.session.commit()
    return jsonify(current_user.to_json())


@bp.post("/password/forgot")
def password_forgot():
    if not mailer.is_configured():
        return _err("mail_not_configured", 503)
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip().lower()
    user = db.session.query(User).filter_by(email=email).first() if email else None
    if user is not None:
        # Cooldown and send failures are swallowed on purpose: the response
        # must not reveal whether the address has an account. The front end
        # runs its own 60 s resend countdown.
        _issue_code(user, "reset_password", _requested_lang())
    return jsonify({"ok": True})


def _revoke_other_sessions(user_id):
    """Delete every session except the one making this request."""
    current_id = getattr(g, "current_session_id", None)
    q = db.session.query(UserSession).filter_by(user_id=user_id)
    if current_id:
        q = q.filter(UserSession.id != current_id)
    q.delete()
    db.session.commit()


@bp.post("/password/change")
def password_change():
    """Logged-in password change. Every other device's session is revoked;
    this device's session row (and thus its cookies) survives untouched."""
    if not current_user.is_authenticated:
        return _err("not_authenticated", 401)
    data = request.get_json(silent=True)
    data = data if isinstance(data, dict) else {}
    old_password = str(data.get("old_password", ""))
    new_password = str(data.get("new_password", ""))
    user = current_user._get_current_object()
    if not user.password_hash:
        # Google-only account; the UI steers these to the reset flow instead.
        return _err("no_password_set")
    if len(new_password) < MIN_PASSWORD_LEN:
        return _err("password_too_short")
    if not check_password_hash(user.password_hash, old_password):
        return _err("invalid_credentials", 401)
    user.password_hash = generate_password_hash(new_password)
    db.session.commit()
    _revoke_other_sessions(user.id)
    return jsonify({"ok": True})


@bp.post("/password/reset")
def password_reset():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip().lower()
    code = str(data.get("code", ""))
    new_password = str(data.get("new_password", ""))
    if not email or not code or not new_password:
        return _err("missing_fields")
    if len(new_password) < MIN_PASSWORD_LEN:
        return _err("password_too_short")
    user = db.session.query(User).filter_by(email=email).first()
    if user is None:
        # Same error as a wrong code — no account enumeration via this path.
        return _err("code_invalid")
    error = _consume_code(user, "reset_password", code)
    if error:
        return _err(error, 400)
    user.password_hash = generate_password_hash(new_password)
    # A confirmed reset code also proves ownership of the address.
    if user.email_verified_at is None:
        user.email_verified_at = utcnow()
    # The reset happens logged-out: kill every existing device session.
    db.session.query(UserSession).filter_by(user_id=user.id).delete()
    db.session.commit()
    return jsonify({"ok": True})


# ── Account deletion (settings danger zone) ─────────────────────

DEMO_EMAIL = "demo@tradelens.app"


@bp.delete("/account")
def delete_account():
    """Self-service account deletion: confirmation required (password, or the
    full email for Google-only accounts), then every row belonging to the
    user is removed. Demo and admin accounts are refused server-side."""
    if not current_user.is_authenticated:
        return _err("not_authenticated", 401)
    user = current_user._get_current_object()
    if user.role == "admin" or user.email == DEMO_EMAIL:
        return _err("forbidden", 403)

    data = request.get_json(silent=True)
    data = data if isinstance(data, dict) else {}
    if user.password_hash:
        if not check_password_hash(user.password_hash, str(data.get("password", ""))):
            return _err("invalid_credentials", 401)
    else:
        confirm = str(data.get("confirm_email", "")).strip().lower()
        if confirm != user.email:
            return _err("confirm_mismatch")

    # Cascade in FK-safe order. Playbooks are a global library (created_by is
    # informational, no FK), so they stay.
    user_id = user.id
    trade_ids = db.session.query(Trade.id).filter_by(user_id=user_id)
    db.session.query(TradeTag).filter(TradeTag.trade_id.in_(trade_ids)).delete(
        synchronize_session=False
    )
    # User-owned tags (TL-FEAT-006): clear any remaining links to them, then
    # the tags themselves — tags.user_id FK would otherwise block the delete.
    own_tag_ids = db.session.query(Tag.id).filter_by(user_id=user_id)
    db.session.query(TradeTag).filter(TradeTag.tag_id.in_(own_tag_ids)).delete(
        synchronize_session=False
    )
    db.session.query(Tag).filter_by(user_id=user_id).delete()
    db.session.query(Trade).filter_by(user_id=user_id).delete()
    db.session.query(ImportBatch).filter_by(user_id=user_id).delete()
    db.session.query(UserPlaybook).filter_by(user_id=user_id).delete()
    db.session.query(ReportSnapshot).filter_by(user_id=user_id).delete()
    # user_profiles rides the User.profile delete-orphan cascade (models.py) —
    # bulk-deleting it here too would double-delete the same row.
    db.session.query(SyncRun).filter_by(user_id=user_id).delete()
    db.session.query(BrokerConnection).filter_by(user_id=user_id).delete()
    db.session.query(WatchlistItem).filter_by(user_id=user_id).delete()
    snapshot_ids = db.session.query(PortfolioSnapshot.id).filter_by(user_id=user_id)
    db.session.query(PositionSnapshot).filter(
        PositionSnapshot.snapshot_id.in_(snapshot_ids)
    ).delete(synchronize_session=False)
    db.session.query(PortfolioSnapshot).filter_by(user_id=user_id).delete(
        synchronize_session=False
    )
    db.session.query(BrokerSyncDevice).filter_by(user_id=user_id).delete()
    db.session.query(AuthCode).filter_by(user_id=user_id).delete()
    db.session.query(UserSession).filter_by(user_id=user_id).delete()
    db.session.query(LoginAttempt).filter_by(email=user.email).delete()
    db.session.delete(user)
    db.session.commit()
    logout_user()
    return jsonify({"ok": True})


# ── Device sessions (settings page) ─────────────────────────────


def _session_list_json(user_id):
    current_id = getattr(g, "current_session_id", None)
    rows = (
        db.session.query(UserSession)
        .filter_by(user_id=user_id)
        .order_by(UserSession.last_seen.desc())
        .all()
    )
    return [row.to_json(current_id) for row in rows]


@bp.get("/sessions")
def list_sessions():
    if not current_user.is_authenticated:
        return _err("not_authenticated", 401)
    return jsonify({"sessions": _session_list_json(current_user.id)})


@bp.delete("/sessions/<int:session_id>")
def revoke_session(session_id):
    if not current_user.is_authenticated:
        return _err("not_authenticated", 401)
    record = db.session.get(UserSession, session_id)
    if record is None or record.user_id != current_user.id:
        return _err("not_found", 404)
    revoked_current = session_id == getattr(g, "current_session_id", None)
    db.session.delete(record)
    db.session.commit()
    if revoked_current:
        logout_user()
    return jsonify(
        {
            "ok": True,
            "loggedOut": revoked_current,
            "sessions": [] if revoked_current else _session_list_json(current_user.id),
        }
    )


@bp.post("/sessions/revoke_others")
def revoke_other_sessions():
    if not current_user.is_authenticated:
        return _err("not_authenticated", 401)
    _revoke_other_sessions(current_user.id)
    return jsonify({"ok": True, "sessions": _session_list_json(current_user.id)})


# ── Google OAuth (authorization code flow, all server-side) ──────


@bp.get("/google")
def google_start():
    client = oauth.create_client("google")
    if client is None:
        # This endpoint is reached by top-level navigation (an <a> on the login
        # page), so send the browser back with an error code instead of JSON.
        return redirect(f"{config.FRONTEND_URL}/login?error=oauth_not_configured")
    # authorize_redirect stores a random `state` in the session and sends the
    # browser to Google; the callback rejects any response whose state differs.
    return client.authorize_redirect(config.GOOGLE_REDIRECT_URI)


@bp.get("/google/callback")
def google_callback():
    client = oauth.create_client("google")
    if client is None:
        return _err("oauth_not_configured", 503)
    try:
        # Validates `state` (CSRF) and exchanges the code for tokens.
        token = client.authorize_access_token()
    except Exception:
        return redirect(f"{config.FRONTEND_URL}/login?error=oauth_failed")

    info = token.get("userinfo") or {}
    sub = info.get("sub")
    email = str(info.get("email") or "").strip().lower()
    if not sub or not email:
        return redirect(f"{config.FRONTEND_URL}/login?error=oauth_failed")

    user = db.session.query(User).filter_by(google_sub=sub).first()
    if user is None:
        # Same email already registered with a password -> link Google to it.
        user = db.session.query(User).filter_by(email=email).first()
        if user is not None:
            user.google_sub = sub
    if user is None:
        user = User(
            email=email,
            google_sub=sub,
            display_name=str(info.get("name") or "").strip() or email,
            role="user",
        )
        db.session.add(user)
    # Google already verified this address; no code round-trip needed.
    if user.email_verified_at is None:
        user.email_verified_at = utcnow()
    db.session.commit()
    _start_session(user)
    return redirect(f"{config.FRONTEND_URL}/library")
