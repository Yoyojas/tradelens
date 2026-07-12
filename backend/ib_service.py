"""Read-only IB Gateway access via ib_insync.

ib_insync is asyncio-based and an IB instance must live on one event loop. Flask
serves requests on worker threads, so we own a single background event-loop
thread, create the IB instance there, and marshal every call onto it with
run_coroutine_threadsafe. A lock serializes access so concurrent HTTP requests
don't interleave IB calls.

READ-ONLY: the connection is opened with readonly=True and this module exposes
only data-reading methods. There is deliberately no order placement / cancel /
transfer code anywhere.
"""
import asyncio
import threading

from ib_insync import IB

import config
from pairing import pair_executions


class IBService:
    def __init__(self):
        self._loop = asyncio.new_event_loop()
        self._ib = None
        self._ready = threading.Event()
        self._lock = threading.Lock()
        threading.Thread(target=self._run_loop, daemon=True).start()
        self._ready.wait(5)

    # ── event loop plumbing ──────────────────────────────────────
    def _run_loop(self):
        asyncio.set_event_loop(self._loop)
        self._ib = IB()
        self._ready.set()
        self._loop.run_forever()

    def _submit(self, coro, timeout):
        return asyncio.run_coroutine_threadsafe(coro, self._loop).result(timeout)

    async def _connect_if_needed(self):
        if self._ib.isConnected():
            return
        await self._ib.connectAsync(
            config.IB_HOST,
            config.IB_PORT,
            clientId=config.IB_CLIENT_ID,
            readonly=config.IB_READONLY,
            timeout=config.IB_CONNECT_TIMEOUT,
        )

    # ── public, read-only API ────────────────────────────────────
    def status(self):
        with self._lock:
            try:
                self._submit(self._connect_if_needed(), config.IB_CONNECT_TIMEOUT + 5)
            except Exception as exc:  # connection refused / gateway down / timeout
                return {
                    "connected": False,
                    "host": config.IB_HOST,
                    "port": config.IB_PORT,
                    "error": str(exc),
                }
            return {
                "connected": self._ib.isConnected(),
                "host": config.IB_HOST,
                "port": config.IB_PORT,
                "serverVersion": self._ib.client.serverVersion()
                if self._ib.isConnected()
                else None,
                "accounts": list(self._ib.managedAccounts()),
                "readOnly": True,
            }

    def account(self):
        with self._lock:
            rows = self._submit(self._account_coro(), 30)
        return {"summary": rows}

    async def _account_coro(self):
        await self._connect_if_needed()
        rows = await self._ib.accountSummaryAsync()
        return [
            {
                "account": r.account,
                "tag": r.tag,
                "value": r.value,
                "currency": r.currency,
            }
            for r in rows
        ]

    def positions(self):
        with self._lock:
            items = self._submit(self._positions_coro(), 30)
        return {"positions": items}

    async def _positions_coro(self):
        await self._connect_if_needed()
        positions = await self._ib.reqPositionsAsync()
        out = []
        for p in positions:
            c = p.contract
            out.append(
                {
                    "account": p.account,
                    "symbol": c.symbol,
                    "secType": c.secType,
                    "currency": c.currency,
                    "exchange": c.exchange or c.primaryExchange,
                    "position": p.position,
                    "avgCost": p.avgCost,
                }
            )
        return out

    def executions(self):
        with self._lock:
            execs = self._submit(self._executions_coro(), 30)
        # Pair into round-trip trades for import (needs the datetime `time`).
        trades = pair_executions(execs)
        # JSON-safe copy of the raw fills (drop the datetime; timeIso is kept).
        safe = []
        for e in execs:
            d = dict(e)
            d.pop("time", None)
            safe.append(d)
        return {"count": len(safe), "executions": safe, "trades": trades}

    async def _executions_coro(self):
        await self._connect_if_needed()
        fills = await self._ib.reqExecutionsAsync()
        out = []
        for f in fills:
            ex = f.execution
            c = f.contract
            comm = getattr(f.commissionReport, "commission", None)
            out.append(
                {
                    "execId": ex.execId,
                    "symbol": c.symbol,
                    "secType": c.secType,
                    "currency": c.currency,
                    "side": "BUY" if ex.side in ("BOT", "BUY") else "SELL",
                    "shares": float(ex.shares),
                    "price": float(ex.price),
                    "time": ex.time,  # datetime; serialized by pairing/_day or app
                    "timeIso": ex.time.isoformat() if ex.time else None,
                    "commission": float(comm) if comm is not None else 0.0,
                    "account": ex.acctNumber,
                }
            )
        return out


# Module-level singleton.
service = IBService()
