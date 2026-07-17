"""TradeLens backend (Flask).

Two responsibilities:
- Auth + users (Milestone 2): Postgres via SQLAlchemy, session-cookie login,
  Google OAuth. See auth.py / models.py.
- Read-only IB Gateway bridge: live account data from Interactive Brokers.
  Every IBKR endpoint is read-only; there is no order, cancel, or transfer
  code in this service by design.

Run:
    cd backend
    python -m venv .venv && source .venv/bin/activate
    pip install -r requirements.txt
    cp .env.example .env   # set DATABASE_URL, SECRET_KEY, ...
    flask --app app db upgrade   # create/upgrade tables (needs Postgres running)
    python seed.py               # demo + admin accounts
    python app.py
"""
import os
import secrets
from urllib.parse import urlparse

from flask import Flask, jsonify, redirect, request, send_from_directory
from flask_cors import CORS
from werkzeug.middleware.proxy_fix import ProxyFix

import config
import models  # noqa: F401  (registers all tables on db.metadata)
from api import bp as api_bp
from auth import bp as auth_bp, register_google_client
from extensions import db, login_manager, migrate, oauth
from ib_service import service

app = Flask(__name__)
app.config.update(
    SQLALCHEMY_DATABASE_URI=config.DATABASE_URL,
    SQLALCHEMY_TRACK_MODIFICATIONS=False,
    # Session cookie: httpOnly (JS can't read it) + Lax. The Vite app and this
    # backend are both on 127.0.0.1, so Lax cookies flow on fetch calls.
    # Production (TL-DEPLOY-001) serves app + API from one origin and adds
    # Secure (https-only) via COOKIE_SECURE.
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=config.COOKIE_SECURE,
    REMEMBER_COOKIE_HTTPONLY=True,
    REMEMBER_COOKIE_SAMESITE="Lax",
    REMEMBER_COOKIE_SECURE=config.COOKIE_SECURE,
)
if config.TRUST_PROXY:
    # Behind the Container Apps ingress: trust one hop of X-Forwarded-* so
    # url_for/OAuth redirects and Secure cookies see the real https origin.
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)

# www -> apex 301 (TL-DEPLOY-001). Canonical host derives from FRONTEND_URL,
# so local dev (127.0.0.1) never triggers this.
_CANONICAL_HOST = urlparse(config.FRONTEND_URL).hostname or ""


@app.before_request
def _redirect_www_to_apex():
    host = (request.host or "").split(":")[0]
    if _CANONICAL_HOST and host == f"www.{_CANONICAL_HOST}":
        target = f"{config.FRONTEND_URL.rstrip('/')}{request.full_path}"
        return redirect(target.rstrip("?"), code=301)
    return None
if config.SECRET_KEY:
    app.config["SECRET_KEY"] = config.SECRET_KEY
else:
    # Random per-process key so dev still works, but sessions won't survive a
    # restart. Set SECRET_KEY in backend/.env for stable sessions.
    app.config["SECRET_KEY"] = secrets.token_hex(32)
    print("WARNING: SECRET_KEY not set in .env — sessions reset on every restart")

CORS(app, origins=config.CORS_ORIGINS, supports_credentials=True)
db.init_app(app)
migrate.init_app(app, db)
login_manager.init_app(app)
oauth.init_app(app)
register_google_client()
app.register_blueprint(auth_bp)
app.register_blueprint(api_bp)


@app.get("/api/health")
def health():
    return jsonify({"ok": True, "service": "tradelens-ibkr", "readOnly": True})


# ── Static SPA hosting (TL-DEPLOY-001) ──────────────────────────
# In the container the Vite build sits next to backend/ as ../dist and this
# Flask app serves it (single-container deployment, same-origin cookies).
# Registered only when a build exists, so `python app.py` local dev with the
# Vite dev server is completely unaffected. API routes are registered above
# and always win; unknown /api/* paths 404 as JSON instead of index.html.
DIST_DIR = os.environ.get(
    "STATIC_DIST", os.path.join(os.path.dirname(__file__), "..", "dist")
)

if os.path.isfile(os.path.join(DIST_DIR, "index.html")):

    @app.get("/")
    @app.get("/<path:spa_path>")
    def spa(spa_path=""):
        if spa_path.startswith("api/"):
            return jsonify({"error": "not_found"}), 404
        full = os.path.join(DIST_DIR, spa_path)
        if spa_path and os.path.isfile(full):
            return send_from_directory(DIST_DIR, spa_path)
        # SPA fallback: any client-side route gets the app shell.
        return send_from_directory(DIST_DIR, "index.html")


@app.get("/api/ibkr/status")
def ibkr_status():
    return jsonify(service.status())


@app.get("/api/ibkr/account")
def ibkr_account():
    try:
        return jsonify(service.account())
    except Exception as exc:
        return jsonify({"error": _msg(exc)}), 503


@app.get("/api/ibkr/positions")
def ibkr_positions():
    try:
        return jsonify(service.positions())
    except Exception as exc:
        return jsonify({"error": _msg(exc)}), 503


@app.get("/api/ibkr/executions")
def ibkr_executions():
    try:
        return jsonify(service.executions())
    except Exception as exc:
        return jsonify({"error": _msg(exc)}), 503


def _msg(exc):
    # Surface a readable reason (gateway down, not connected, timeout) without
    # leaking a stack trace to the browser.
    return f"{type(exc).__name__}: {exc}"


if __name__ == "__main__":
    # threaded=True so a slow IB call doesn't block health/status checks.
    # debug=True (local dev default) enables the auto-reloader so code edits
    # apply without a manual restart — set FLASK_DEBUG=0 in production.
    app.run(
        host="127.0.0.1",
        port=config.FLASK_PORT,
        threaded=True,
        debug=config.FLASK_DEBUG,
    )
