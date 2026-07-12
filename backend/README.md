# TradeLens Backend

A Flask service with three jobs:

1. **Auth + users (Milestone 2)** — real accounts in Postgres, session-cookie
   login (email/password and Google OAuth). See "Auth setup" below.
2. **Data API (Milestone 2 step 2)** — trades, playbooks, adoptions, and tags
   in Postgres, scoped per account. `GET/POST/PATCH/DELETE /api/trades` (GET
   takes `from`/`to`/`ticker`/`playbookId` filters plus reserved
   `limit`/`offset`), `POST /api/trades/import` (bulk, deduped per user on
   `source`+`externalId`), `GET /api/playbooks` + `POST|DELETE
   /api/playbooks/<id>/adopt`, `GET /api/tags`; admin-only: playbook
   `POST/PATCH/DELETE /api/playbooks[/<id>]`, `GET /api/admin/users`
   (read-only directory), `POST/DELETE /api/admin/tags`. Report aggregation
   stays in the front end.
3. **IB Gateway bridge (read-only)** — reads **account, positions, and
   executions** from Interactive Brokers via `ib_insync` and exposes them as
   JSON. The browser cannot talk to IB Gateway directly (binary socket
   protocol), so this local backend bridges it.

Dev convenience: `python app.py` runs with **debug + auto-reload** by default
(code edits apply without restarting). Set `FLASK_DEBUG=0` for anything
production-like — never run the Werkzeug debugger on an exposed host.

**Read-only by design.** The IB connection is opened with `readonly=True` and
the service contains no order / cancel / transfer code.

## 0. Auth setup (Postgres + migrations + seed)

One-time database setup (macOS/Homebrew shown):

```bash
brew install postgresql@16
brew services start postgresql@16
createdb tradelens
```

Then, inside `backend/` with the venv active (see step 2 for venv setup):

```bash
cp .env.example .env     # set SECRET_KEY, ADMIN_EMAIL/ADMIN_PASSWORD, DATABASE_URL if non-default
flask --app app db upgrade   # applies migrations/ (users + auth_codes + 7 data tables)
python seed.py               # demo/admin accounts + playbook library + tags + demo trades
```

`seed.py` loads the playbook library (bilingual), tags, and the demo user's
trades/adoptions from `../src/mock/*.json` — one seed source for both sides.
It is idempotent; re-running never duplicates.

Auth endpoints: `POST /api/auth/register|login|logout`, `GET /api/auth/me`,
`GET /api/auth/google` → Google → `GET /api/auth/google/callback`. Sessions are
httpOnly cookies (`SameSite=Lax`), no JWT. Failures return
`{"error": "<stable code>"}` (e.g. `email_taken`, `invalid_credentials`) which
the front end maps to translated copy.

**Email verification + password reset** (step 1.5): 6-digit codes sent via
Gmail SMTP (`mailer.py`; set `MAIL_USERNAME` + `MAIL_APP_PASSWORD` in `.env` —
an app password, not the Gmail login password). Codes live 10 minutes, die
after 5 wrong attempts, resend has a 60 s cooldown, and only code hashes are
stored. Endpoints: `POST /api/auth/verify/request|confirm`,
`POST /api/auth/password/forgot|reset`. `forgot` always answers 200 so it
can't be used to probe which emails have accounts. A successful reset rotates
the user's session token: cookies minted before the reset stop working.
Google-OAuth and seeded accounts are treated as already verified. Without mail
credentials the code endpoints answer `mail_not_configured` and the UI shows a
translated notice.

**Google OAuth**: create an OAuth client (type "Web application") in Google
Cloud Console with authorized redirect URI exactly
`http://127.0.0.1:5001/api/auth/google/callback`, then put the client id/secret
in `.env`. Scope is read-only identity (`openid email profile`); Authlib
validates the OAuth `state` parameter (CSRF). Without credentials configured,
the Google button redirects back with a translated "not configured" notice —
email/password login still works.

**Use `http://127.0.0.1:5173`, not `localhost:5173`.** The session cookie is
host-scoped to `127.0.0.1` (where the OAuth redirect URI lives). If you open
the app via `localhost`, the browser treats the API as cross-site and won't
send the cookie.

Schema changes later: edit `models.py`, then
`flask --app app db migrate -m "..."` + `flask --app app db upgrade`.
Never hand-write table SQL.

## 1. IB Gateway setup (one time)

In **IB Gateway** (or TWS) → *Configure → Settings → API → Settings*:

- ✅ **Enable ActiveX and Socket Clients**
- ✅ **Read-Only API** (extra safety — TradeLens never trades)
- **Socket port**: `4001` for Gateway **live**, `4002` for Gateway **paper**
  (TWS uses `7496` live / `7497` paper)
- **Trusted IPs**: add `127.0.0.1`
- Leave *Allow connections from localhost only* enabled

Keep IB Gateway running and logged in while using the live features.

## 2. Run the backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env               # edit IB_PORT if you use paper (4002), etc.
flask --app app db upgrade        # first run: create tables (Postgres must be running)
python seed.py                     # first run: demo + admin accounts
python app.py                      # serves http://127.0.0.1:5001
```

## 3. Endpoints (all GET, all read-only)

| Endpoint                  | Returns |
|---------------------------|---------|
| `/api/health`             | liveness check (no IB call) |
| `/api/ibkr/status`        | connected?, host/port, server version, managed accounts |
| `/api/ibkr/account`       | `accountSummary` rows (net liq, cash, currency, …) |
| `/api/ibkr/positions`     | open positions (symbol, position, avgCost, …) |
| `/api/ibkr/executions`    | recent fills, **plus** `trades`: fills FIFO-paired into round-trip trades |

`status` never errors hard — if the gateway is down it returns
`{ "connected": false, "error": "..." }`. The data endpoints return HTTP 503 with
an `error` message when IB cannot be reached.

## 4. Configuration

All via env / `backend/.env` (see `.env.example`): `DATABASE_URL`, `SECRET_KEY`,
`ADMIN_EMAIL`/`ADMIN_PASSWORD`, `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`,
`FRONTEND_URL`, `IB_HOST`, `IB_PORT`, `IB_CLIENT_ID`, `IB_CONNECT_TIMEOUT`,
`FLASK_PORT`, `CORS_ORIGINS`.

## 5. Privacy

- Real account data is served live and is **not** persisted by the backend.
- `backend/.env` and any account/export dumps are git-ignored. **Never commit
  real account data.**
- The front end keeps account/positions in memory only; only trades you choose to
  import are persisted (in the browser's localStorage), never balances.

## 6. Notes / gotchas

- **`clientId` collisions**: each connected API client needs a unique id. If a
  previous run is still attached, change `IB_CLIENT_ID` or restart the gateway.
- **Port mismatch** is the most common failure: live Gateway is `4001`, not the
  TWS `7496`. The `status` endpoint echoes the host/port it tried.
- **asyncio**: the service owns one background event loop thread and marshals all
  IB calls onto it; do not call `ib_insync` from request threads directly.
- IB Gateway's execution API only returns **recent** fills (roughly the current
  trading day). Full trade history is a separate Flex-import path.
