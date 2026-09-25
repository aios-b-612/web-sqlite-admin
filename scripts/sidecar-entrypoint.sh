#!/usr/bin/env bash
# Sidecar: API :8080 + Next standalone :3000.
# platform-hosting espera porta 80 no contentor — usamos um socat/proxy mínimo via API
# enquanto o Traefik aponta para 80. Aqui publicamos FE na 80 via redirecionamento simples
# com um loop: se existir `caddy` no futuro, trocar. MVP: FE em 3000 e API em 8080;
# para drop-in, mapeamos FE para 80 com `npx serve` não — usamos node standalone em 80.
set -euo pipefail

export BIND_ADDRESS="${BIND_ADDRESS:-0.0.0.0:8080}"
export LOCATION="${LOCATION:-/db/databases}"
export PASSWORD="${PASSWORD:?PASSWORD é obrigatório}"
export PORT="${PORT:-80}"
export HOSTNAME="${HOSTNAME:-0.0.0.0}"
export BUSINESS_API_INTERNAL_URL="${BUSINESS_API_INTERNAL_URL:-http://127.0.0.1:8080}"

mkdir -p "$LOCATION"

web-sqlite-admin-api &
API_PID=$!

cd /app/web
node server.js &
WEB_PID=$!

term() {
  kill "$API_PID" "$WEB_PID" 2>/dev/null || true
}
trap term EXIT INT TERM

wait -n "$API_PID" "$WEB_PID"
exit $?
