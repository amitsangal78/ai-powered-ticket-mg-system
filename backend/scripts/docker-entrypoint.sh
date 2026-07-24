#!/bin/sh
set -eu

echo "[entrypoint] Applying migrations…"
node dist/db/migrate.js

echo "[entrypoint] Seeding users (idempotent)…"
node dist/db/seed.js

echo "[entrypoint] Starting API on port ${PORT:-3000}…"
exec node dist/index.js
