"""Daily Flex auto-sync, CLI form (TL-DATA-004).

In production the sweep is triggered by EventBridge Scheduler calling
POST /api/jobs/sync-flex (see TL-DEPLOY-001 AWS rework); this script is the
local/manual equivalent — same code path (flex_service.sync_all_connections),
useful for development and one-off runs: `python sync_job.py`.

Output is a per-connection summary only — never tokens, never statement
contents.
"""
import sys

from app import app
from flex_service import sync_all_connections


def main():
    with app.app_context():
        summary = sync_all_connections()
        failures = 0
        for connection_id, status, error_code in summary:
            print(
                f"[sync_job] connection={connection_id} status={status} "
                f"error={error_code or '-'}"
            )
            if status != "ok":
                failures += 1
        print(f"[sync_job] done: {len(summary)} connection(s), {failures} failure(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
