"""FIFO pairing of broker executions into round-trip trades.

Brokers report individual executions (fills), not round-trip trades. This module
pairs opposite-side fills per symbol, oldest-first (FIFO), into closed trades and
leaves any unmatched remainder as open positions — matching the TradeLens trade
shape used by the front end.

Pure functions, no I/O, so the logic is unit-testable independently of IB.

Each input execution is a dict:
    {
      "execId": str,        # broker execution id
      "symbol": str,
      "side": "BUY" | "SELL",
      "shares": float,      # always positive
      "price": float,
      "time": datetime,     # execution time (tz-aware preferred)
      "commission": float,  # fee for this fill (>= 0); may be 0 if unknown
      "currency": str,
    }

Output trades use the TradeLens shape:
    {
      "source": "broker:ibkr",
      "externalId": str,    # stable id for dedupe (open+close exec ids)
      "ticker": str,
      "side": "long" | "short",
      "quantity": float,
      "entryPrice": float,
      "exitPrice": float | None,
      "openDate": "YYYY-MM-DD",
      "closeDate": "YYYY-MM-DD" | None,
      "fees": float,        # summed, allocated proportionally to matched shares
      "currency": str,
      "tags": [],
    }
"""
from collections import defaultdict, deque


def _day(dt):
    return dt.date().isoformat() if dt is not None else None


def _signed(side):
    return 1 if side == "BUY" else -1


def pair_executions(executions, source="broker:ibkr"):
    """Pair a list of executions into closed + open TradeLens trades.

    Uses signed-inventory FIFO per symbol: a fill that opposes current inventory
    closes the oldest lots first; any remainder extends inventory. A long
    inventory (net bought) closed by sells yields long trades; a short inventory
    closed by buys yields short trades. Leftover inventory becomes open trades.
    """
    by_symbol = defaultdict(list)
    for e in executions:
        by_symbol[e["symbol"]].append(e)

    trades = []
    for symbol, fills in by_symbol.items():
        fills = sorted(fills, key=lambda e: e["time"])
        # Open lots, FIFO. Each lot tracks remaining shares and per-share fee.
        lots = deque()  # each: dict(qty, price, time, fee_per_share, execId, side)

        for e in fills:
            incoming = e["shares"]
            if incoming <= 0:
                continue
            fee_per_share = (e.get("commission") or 0.0) / incoming
            sign = _signed(e["side"])
            currency = e.get("currency", "USD")

            # Close against opposite-sign inventory first.
            while incoming > 1e-9 and lots and lots[0]["side"] != sign:
                lot = lots[0]
                matched = min(incoming, lot["qty"])
                is_long = lot["side"] == 1  # opening lot was a buy -> long trade
                open_fee = lot["fee_per_share"] * matched
                close_fee = fee_per_share * matched
                trades.append(
                    {
                        "source": source,
                        "externalId": f"{lot['execId']}::{e['execId']}",
                        "ticker": symbol,
                        "side": "long" if is_long else "short",
                        "quantity": round(matched, 8),
                        "entryPrice": lot["price"],
                        "exitPrice": e["price"],
                        "openDate": _day(lot["time"]),
                        "closeDate": _day(e["time"]),
                        "fees": round(open_fee + close_fee, 4),
                        "currency": currency,
                        "tags": [],
                    }
                )
                lot["qty"] -= matched
                incoming -= matched
                if lot["qty"] <= 1e-9:
                    lots.popleft()

            # Remainder opens / extends inventory in the fill's direction.
            if incoming > 1e-9:
                lots.append(
                    {
                        "qty": incoming,
                        "price": e["price"],
                        "time": e["time"],
                        "fee_per_share": fee_per_share,
                        "execId": e["execId"],
                        "side": sign,
                        "currency": currency,
                    }
                )

        # Anything still open becomes an open trade.
        for lot in lots:
            trades.append(
                {
                    "source": source,
                    "externalId": lot["execId"],
                    "ticker": symbol,
                    "side": "long" if lot["side"] == 1 else "short",
                    "quantity": round(lot["qty"], 8),
                    "entryPrice": lot["price"],
                    "exitPrice": None,
                    "openDate": _day(lot["time"]),
                    "closeDate": None,
                    "fees": round(lot["fee_per_share"] * lot["qty"], 4),
                    "currency": lot.get("currency", "USD"),
                    "tags": [],
                }
            )

    # Newest first for display.
    trades.sort(key=lambda t: (t["openDate"] or ""), reverse=True)
    return trades
