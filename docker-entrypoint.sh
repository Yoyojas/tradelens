#!/bin/sh
# Container entrypoint (TL-DEPLOY-001, AWS ECS Express Mode).
#
# PRODUCTION migrations run as a one-shot CI task (`docker-entrypoint.sh
# migrate` via `aws ecs run-task`, see .github/workflows/deploy.yml) BEFORE
# the service redeploys. Reason: ECS Express Mode forces canary deployments
# and its deployment strategy cannot be changed (official docs, accessed
# 2026-07-16), so old and new service tasks WILL coexist — an entrypoint
# migration would race itself. The service's task definition therefore sets
# SKIP_MIGRATIONS=1; local `docker run` keeps the migrate-on-boot
# convenience by default.
set -e

if [ "$1" = "migrate" ]; then
  # One-shot mode for the CI migration task: upgrade and exit. Runs
  # unconditionally — SKIP_MIGRATIONS only governs the serve path below.
  echo "[entrypoint] one-shot migration"
  exec flask --app app db upgrade
fi

if [ "$1" = "seed" ]; then
  # One-shot production init (demo/admin/library/shared tags; idempotent).
  echo "[entrypoint] one-shot seed"
  exec python seed.py
fi

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
