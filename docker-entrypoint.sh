#!/bin/sh
# Container entrypoint (TL-DEPLOY-001, AWS App Runner).
#
# Alembic migrations run HERE, before gunicorn starts, as the explicit
# deploy-time migration step. Safe under the provisioned setup: App Runner
# auto-scaling is pinned to max size 1 (see infra/aws-provision.sh step 6),
# so at most one instance ever runs the upgrade; during a rolling deploy the
# OLD instance may briefly serve old code against the new schema, which is
# fine while migrations stay additive (all current ones are). If scaling is
# ever opened up, move this into a one-shot CI step first.
set -e

if [ "${SKIP_MIGRATIONS:-0}" != "1" ]; then
  echo "[entrypoint] applying database migrations"
  flask --app app db upgrade
fi

if [ "${RUN_SEED:-0}" = "1" ]; then
  # One-time production init (set RUN_SEED=1 for the first boot, then unset):
  # demo account + playbook library + shared tags. seed.py is idempotent.
  echo "[entrypoint] running seed"
  python seed.py
fi

echo "[entrypoint] starting gunicorn"
exec gunicorn --bind "0.0.0.0:${PORT:-8000}" \
  --workers "${GUNICORN_WORKERS:-1}" \
  --timeout 120 \
  app:app
