"""Local snapshot push agent (TL-DATA-006).

Runs on YOUR machine next to IB Gateway and the local TradeLens backend:
reads account summary + positions from the local read-only bridge
(http://127.0.0.1:5001/api/ibkr/*), then pushes one snapshot to the cloud
over HTTPS with a device token. The cloud never holds IBKR credentials.

Usage:
    export TL_DEVICE_TOKEN=<token from Settings -> Devices, shown once>
    python push_snapshot.py --url https://mytradelens.app            # once
    python push_snapshot.py --url https://mytradelens.app --interval 300

The token comes from the TL_DEVICE_TOKEN environment variable on purpose —
a CLI argument would leak into shell history and `ps` output.
"""
import argparse
import os
import secrets
import sys
import time
from datetime import datetime, timezone

import requests

LOCAL = os.environ.get("TL_LOCAL_BACKEND", "http://127.0.0.1:5001")


def read_gateway():
    status = requests.get(f"{LOCAL}/api/ibkr/status", timeout=15).json()
    if not status.get("connected"):
        raise RuntimeError("IB Gateway is not connected (start it and retry)")
    account = requests.get(f"{LOCAL}/api/ibkr/account", timeout=30).json()
    positions = requests.get(f"{LOCAL}/api/ibkr/positions", timeout=30).json()
    summary = [
        {"tag": row.get("tag"), "value": row.get("value"), "currency": row.get("currency")}
        for row in (account.get("summary") or account.get("rows") or [])
        if isinstance(row, dict) and row.get("tag")
    ]
    pos = [
        {
            "symbol": p.get("symbol"),
            "quantity": p.get("position"),
            "avgCost": p.get("avgCost"),
            "currency": p.get("currency") or "USD",
            "secType": p.get("secType") or "STK",
        }
        for p in (positions.get("positions") or [])
        if isinstance(p, dict) and p.get("symbol")
    ]
    return summary, pos


def push_once(cloud_url, token):
    summary, positions = read_gateway()
    now = datetime.now(timezone.utc).isoformat()
    resp = requests.post(
        f"{cloud_url.rstrip('/')}/api/broker/push",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "timestamp": now,
            "nonce": secrets.token_hex(16),
            "capturedAt": now,
            "baseCurrency": "USD",
            "summary": summary,
            "positions": positions,
        },
        timeout=30,
    )
    body = {}
    try:
        body = resp.json()
    except ValueError:
        pass
    if resp.status_code == 201:
        print(f"[push] ok: snapshot {body.get('snapshotId')} "
              f"({len(positions)} positions)")
        return True
    print(f"[push] rejected: HTTP {resp.status_code} {body.get('error', '')}")
    return False


def main():
    parser = argparse.ArgumentParser(description="Push a portfolio snapshot")
    parser.add_argument("--url", required=True, help="Cloud base URL")
    parser.add_argument("--interval", type=int, default=0,
                        help="Seconds between pushes (0 = push once)")
    args = parser.parse_args()

    token = os.environ.get("TL_DEVICE_TOKEN", "")
    if not token:
        print("Set TL_DEVICE_TOKEN first (Settings -> Devices, shown once).")
        return 2

    while True:
        try:
            push_once(args.url, token)
        except Exception as exc:  # gateway down, network, ...
            print(f"[push] error: {type(exc).__name__}: {exc}")
        if not args.interval:
            return 0
        time.sleep(args.interval)


if __name__ == "__main__":
    sys.exit(main())
