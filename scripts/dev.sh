#!/usr/bin/env bash
# Start Tremor locally: infra + API + workers + dashboard
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Docker (Postgres :5436, Redis :6380)"
docker compose up -d

echo "==> Waiting for Postgres..."
for i in $(seq 1 20); do
  if docker compose exec -T postgres pg_isready -U tremor >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

mkdir -p "$ROOT/logs"

if [[ ! -f tremor-api/.env ]]; then
  echo "Missing tremor-api/.env — copy from tremor-api/.env.example"
  exit 1
fi
if [[ ! -f tremor-dashboard/.env.local ]]; then
  echo "Missing tremor-dashboard/.env.local — copy from tremor-dashboard/.env.example"
  exit 1
fi

echo "==> API :4021"
(cd tremor-api && npm run dev) >"$ROOT/logs/api.log" 2>&1 &
echo $! >"$ROOT/logs/api.pid"

echo "==> Workers"
(cd tremor-api && npm run workers) >"$ROOT/logs/workers.log" 2>&1 &
echo $! >"$ROOT/logs/workers.pid"

echo "==> Dashboard :3000 (0.0.0.0)"
(cd tremor-dashboard && rm -rf .next && npm run dev -- -H 0.0.0.0 -p 3000) >"$ROOT/logs/dashboard.log" 2>&1 &
echo $! >"$ROOT/logs/dashboard.pid"

echo "Waiting for API health..."
for i in $(seq 1 30); do
  if curl -sf http://127.0.0.1:4021/health >/dev/null 2>&1; then
    echo "API OK"
    break
  fi
  sleep 1
done

echo ""
echo "Tremor is up:"
echo "  Dashboard  http://localhost:3000"
echo "  API        http://localhost:4021/health"
echo "  Logs       $ROOT/logs/"
echo ""
echo "If the UI shows 502 /internal/pools, the API is down — check logs/api.log"
