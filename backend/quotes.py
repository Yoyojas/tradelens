"""Market quotes (TL-DATA-005, D-020).

QuoteProvider is the vendor-neutral contract; AlpacaProvider (Basic plan =
IEX feed — never present these as consolidated/NBBO prices) is the only
implementation. Keys stay server-side; the browser talks to /api/quotes.

Caching: single-process in-memory dict with a short TTL — 20s while the
market is open, 10 minutes when closed (approved: no quote table). The
subscription set (positions ∪ watchlist) is client-composed; this module
just serves whatever symbols are asked, normalized and status-tagged.
"""
import time

import requests

import config

DATA_URL = "https://data.alpaca.markets/v2/stocks/snapshots"
CLOCK_URL = "https://api.alpaca.markets/v2/clock"
ASSETS_URL = "https://api.alpaca.markets/v2/assets"

TTL_OPEN = 20  # seconds
TTL_CLOSED = 600
CLOCK_TTL = 60
ASSETS_TTL = 24 * 3600
MAX_SYMBOLS = 60  # per request; the UI cap is 30 watchlist + positions


class QuotesError(Exception):
    def __init__(self, code):
        super().__init__(code)
        self.code = code


class QuoteProvider:
    """Contract: get_quotes(symbols) -> {symbol: normalized quote dict};
    market_open() -> bool; search(query) -> [{symbol, name}]."""

    def get_quotes(self, symbols):  # pragma: no cover - interface
        raise NotImplementedError

    def market_open(self):  # pragma: no cover - interface
        raise NotImplementedError

    def search(self, query):  # pragma: no cover - interface
        raise NotImplementedError


class AlpacaProvider(QuoteProvider):
    def __init__(self, http=requests, clock=time.time):
        self.http = http
        self.clock = clock
        self._quote_cache = {}  # symbol -> (quote, fetched_at)
        self._clock_cache = None  # (is_open, fetched_at)
        self._assets_cache = None  # (list, fetched_at)

    def _headers(self):
        if not (config.ALPACA_KEY_ID and config.ALPACA_SECRET):
            raise QuotesError("quotes_not_configured")
        return {
            "APCA-API-KEY-ID": config.ALPACA_KEY_ID,
            "APCA-API-SECRET-KEY": config.ALPACA_SECRET,
        }

    # ── Market clock ─────────────────────────────────────────────
    def market_open(self):
        now = self.clock()
        if self._clock_cache and now - self._clock_cache[1] < CLOCK_TTL:
            return self._clock_cache[0]
        try:
            resp = self.http.get(CLOCK_URL, headers=self._headers(), timeout=10)
            is_open = bool(resp.json().get("is_open"))
        except QuotesError:
            raise
        except Exception:
            # Clock failure must not take quotes down; assume closed (longer
            # TTL, conservative).
            is_open = False
        self._clock_cache = (is_open, now)
        return is_open

    # ── Quotes ───────────────────────────────────────────────────
    def _ttl(self):
        return TTL_OPEN if self.market_open() else TTL_CLOSED

    def get_quotes(self, symbols):
        now = self.clock()
        ttl = self._ttl()
        out = {}
        misses = []
        for symbol in symbols:
            cached = self._quote_cache.get(symbol)
            if cached and now - cached[1] < ttl:
                out[symbol] = cached[0]
            else:
                misses.append(symbol)
        if misses:
            fetched = self._fetch_snapshots(misses)
            for symbol in misses:
                quote = fetched.get(symbol) or {
                    "symbol": symbol,
                    "status": "unavailable",
                    "feed": "iex",
                }
                self._quote_cache[symbol] = (quote, now)
                out[symbol] = quote
        return out

    def _fetch_snapshots(self, symbols):
        try:
            resp = self.http.get(
                DATA_URL,
                params={"symbols": ",".join(symbols), "feed": "iex"},
                headers=self._headers(),
                timeout=15,
            )
            data = resp.json() or {}
        except QuotesError:
            raise
        except Exception:
            raise QuotesError("quotes_unreachable")
        out = {}
        for symbol, snap in data.items():
            if not isinstance(snap, dict):
                continue
            quote = self._normalize(symbol, snap)
            if quote:
                out[symbol] = quote
        return out

    @staticmethod
    def _normalize(symbol, snap):
        """Snapshot -> {price, prevClose, change, changePct, time, status}.
        Pre/post market and holidays fall out naturally: price is the latest
        IEX trade, prevClose the previous daily close."""
        latest = snap.get("latestTrade") or {}
        prev = snap.get("prevDailyBar") or {}
        daily = snap.get("dailyBar") or {}
        price = latest.get("p") or daily.get("c")
        prev_close = prev.get("c")
        if price is None:
            return None
        change = price - prev_close if prev_close else None
        return {
            "symbol": symbol,
            "price": price,
            "prevClose": prev_close,
            "change": change,
            "changePct": (change / prev_close) if change is not None and prev_close else None,
            "time": latest.get("t"),
            "status": "ok",
            "feed": "iex",  # D-020: label as IEX, never NBBO/consolidated
        }

    # ── Symbol search (server proxy — keys never reach the client) ──
    def _assets(self):
        now = self.clock()
        if self._assets_cache and now - self._assets_cache[1] < ASSETS_TTL:
            return self._assets_cache[0]
        try:
            resp = self.http.get(
                ASSETS_URL,
                params={"status": "active", "asset_class": "us_equity"},
                headers=self._headers(),
                timeout=30,
            )
            assets = [
                {"symbol": a.get("symbol", ""), "name": a.get("name", "")}
                for a in (resp.json() or [])
                if a.get("tradable")
            ]
        except QuotesError:
            raise
        except Exception:
            raise QuotesError("quotes_unreachable")
        self._assets_cache = (assets, now)
        return assets

    def search(self, query):
        q = query.strip().upper()
        if not q:
            return []
        assets = self._assets()
        starts = [a for a in assets if a["symbol"].startswith(q)]
        contains = [
            a
            for a in assets
            if a not in starts and q in a["name"].upper()
        ]
        return (starts + contains)[:10]


# Module-level singleton: the cache must survive across requests.
provider = AlpacaProvider()
