#!/usr/bin/env bash
# Sidecar: API :8080 + Next standalone :80 (Traefik/hosting aponta à 80).
set -euo pipefail

export BIND_ADDRESS="${BIND_ADDRESS:-0.0.0.0:8080}"
export LOCATION="${LOCATION:-/db/databases}"
export PASSWORD="${PASSWORD:?PASSWORD é obrigatório}"
export PORT="${PORT:-80}"
export HOSTNAME="${HOSTNAME:-0.0.0.0}"
export BUSINESS_API_INTERNAL_URL="${BUSINESS_API_INTERNAL_URL:-http://127.0.0.1:8080}"
export AUTH_SECRET="${AUTH_SECRET:-octor-sqlite-admin-sidecar}"
export AUTH_TRUST_HOST="${AUTH_TRUST_HOST:-true}"
export NEXTAUTH_URL="${NEXTAUTH_URL:-http://127.0.0.1:${PORT}}"

mkdir -p "$LOCATION"

web-sqlite-admin-api &
API_PID=$!

cd /app/web
# standalone Next: server.js na raiz do standalone
if [[ -f server.js ]]; then
  node server.js &
elif [[ -f web-sqlite-admin/server.js ]]; then
  cd web-sqlite-admin && node server.js &
else
  echo "server.js do Next standalone não encontrado em /app/web" >&2
  kill "$API_PID" 2>/dev/null || true
  exit 1
fi
WEB_PID=$!

term() {
  kill "$API_PID" "$WEB_PID" 2>/dev/null || true
}
trap term EXIT INT TERM

wait -n "$API_PID" "$WEB_PID"
exit $?
