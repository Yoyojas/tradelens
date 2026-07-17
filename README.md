# TradeLens

A React single-page app (+ Flask/PostgreSQL backend in [`backend/`](backend/README.md))
that helps retail investors keep a structured trade journal and review
performance by strategy. Since Milestone 2, accounts, playbooks, trades,
adoptions, and tags live in PostgreSQL behind a REST API — the browser holds no
account data beyond the session cookie.

## Run

```bash
# Backend first (Postgres + migrations + seed): see backend/README.md
cd tradelens
npm install
npm run dev      # http://127.0.0.1:5173  (use 127.0.0.1, not localhost — see backend/README)
npm run build    # production build
```

## Demo accounts

| Role  | Email                | Password    |
|-------|----------------------|-------------|
| User  | `demo@tradelens.app` | `demo1234`  |
| Admin | set in `backend/.env` (`ADMIN_EMAIL` / `ADMIN_PASSWORD`), seeded by `backend/seed.py` | |

The demo user comes seeded with 18 trades and 4 adopted playbooks. The admin
account additionally sees the **Admin** tab.

## Views

- **Auth** (`/login`, `/register`, `/forgot`, `/verify`) — real accounts on the
  Flask backend (email/password + Google OAuth, httpOnly session cookie). New
  accounts confirm a 6-digit emailed code on the full-screen `/verify` step
  before entering the app.
- **Library** (`/library`) — browse / search / filter curated playbooks and adopt
  them into your workspace.
- **Journal** (`/journal`) — manual trade entry with client-side validation, plus
  a history list filterable by date range, ticker, and playbook.
- **Reports** (`/reports`) — win rate, avg win/loss ratio, holding-period
  distribution, and position concentration; overall or per playbook.
- **Admin** (`/admin`, admin only) — create / edit / delete library playbooks.
- **Settings** (`/settings`) — change password, manage signed-in devices, and
  delete the account (danger zone).
- **Live** (`/connect`) — connect to a local **IB Gateway** (read-only) to view
  account summary / positions and import executions as trades. Requires the Flask
  backend in [`backend/`](backend/README.md) running alongside IB Gateway. The
  page also hosts the **Flex statement upload**: full trade history exported
  from IBKR Account Management, parsed in the browser (`services/flex.js`),
  FIFO-paired server-side, previewed, then imported with duplicates skipped.

## Architecture

```
src/
├─ main.jsx              AuthProvider > DataProvider > RouterProvider
├─ router.jsx            public auth routes + ProtectedRoute > AppLayout
├─ context/              AuthContext, DataContext (useState + useContext)
├─ services/auth.js      auth API client (shared fetch wrapper)
├─ services/data.js      data API client (trades / playbooks / tags)
├─ services/flex.js      IBKR Flex statement (XML) parsing in the browser
├─ services/api.js       legacy localStorage read-out (one-time migration only)
├─ mock/                 playbooks / trades / tags seed JSON (loaded by backend/seed.py)
├─ utils/                metrics.js, validation.js, format.js (pure functions)
├─ pages/                one component per view
├─ components/           library/ journal/ reports/ admin/ + shared Modal, PasswordInput
└─ css/                  one external stylesheet per view (course requirement)
```

### Data source

`services/data.js` is the only module that talks to the data API
(`/api/trades`, `/api/playbooks`, `/api/tags`); `DataContext` awaits the server
before updating state (server-first, no optimistic updates). Data saved by
pre-Milestone-2 versions in this browser is offered for a one-time upload into
the account on login (duplicates are skipped server-side), then cleared.

### Performance metrics

All dashboard numbers are computed in the front end from the account's trades
(`utils/metrics.js`):

- Realized P&L: `long = (exit−entry)×qty − fees`, `short = (entry−exit)×qty − fees`
- Win rate, avg win/loss ratio, holding period, and concentration are computed
  over closed trades (concentration uses cost basis across all positions).

## Out of scope (so far)

Live market data, payments. Trade records carry an optional `tags` field
reserved for a future UI.
