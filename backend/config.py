"""Backend configuration, read from environment / backend/.env.

Nothing here is a secret, but IB_* values are deployment-specific so they are
kept out of source and loaded from the environment.
"""
import os

try:
    from dotenv import load_dotenv

    load_dotenv()
except Exception:  # python-dotenv optional; env vars still work without it
    pass


def _int(name, default):
    try:
        return int(os.environ.get(name, default))
    except (TypeError, ValueError):
        return default


# IB Gateway / TWS socket connection
IB_HOST = os.environ.get("IB_HOST", "127.0.0.1")
IB_PORT = _int("IB_PORT", 4001)  # 4001 = Gateway live, 4002 = Gateway paper
IB_CLIENT_ID = _int("IB_CLIENT_ID", 101)
IB_CONNECT_TIMEOUT = float(os.environ.get("IB_CONNECT_TIMEOUT", "8"))

# TradeLens is strictly read-only. This is hard-coded, never configurable —
# the connection is opened with readonly=True and no order methods exist.
IB_READONLY = True

# Flask
FLASK_PORT = _int("FLASK_PORT", 5001)
SECRET_KEY = os.environ.get("SECRET_KEY", "")
# Dev default: debug + auto-reloader on (edits apply without restarting).
# Set FLASK_DEBUG=0 for anything production-like.
FLASK_DEBUG = os.environ.get("FLASK_DEBUG", "1").lower() not in ("0", "false", "")

# Database (Milestone 2). Local Postgres by default; see README for setup.
DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://localhost/tradelens")

# Where to send the browser back after a completed OAuth flow. Keep this on
# 127.0.0.1 (not localhost): the session cookie is host-scoped to 127.0.0.1,
# so the app must be used from the same host for the cookie to be first-party.
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://127.0.0.1:5173")

# Google OAuth (authorization code flow, handled entirely by this backend).
# Create credentials in Google Cloud Console with this exact redirect URI.
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.environ.get(
    "GOOGLE_REDIRECT_URI", "http://127.0.0.1:5001/api/auth/google/callback"
)

# Seed admin account (see seed.py). Kept out of source on purpose.
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "")

# Outgoing mail (verification / password-reset codes). Gmail SMTP by default;
# MAIL_APP_PASSWORD is a Google "app password", not the account password.
# Leave unset to run without email — code-request endpoints then answer
# `mail_not_configured` and the UI shows a translated notice.
MAIL_SMTP_HOST = os.environ.get("MAIL_SMTP_HOST", "smtp.gmail.com")
MAIL_SMTP_PORT = _int("MAIL_SMTP_PORT", 587)
MAIL_USERNAME = os.environ.get("MAIL_USERNAME", "")
MAIL_APP_PASSWORD = os.environ.get("MAIL_APP_PASSWORD", "")
MAIL_DEFAULT_SENDER = os.environ.get("MAIL_DEFAULT_SENDER", "") or MAIL_USERNAME
CORS_ORIGINS = [
    o.strip()
    for o in os.environ.get(
        "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
    ).split(",")
    if o.strip()
]
