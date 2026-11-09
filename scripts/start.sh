#!/usr/bin/env bash
# Start containers, the auth service, the journal service and the frontend in ONE terminal.
# Stop everything with Ctrl+C.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

ulimit -n 10240 2>/dev/null || true

docker info >/dev/null 2>&1 || { echo "Docker is not running. On macOS with Colima: colima start"; exit 1; }
docker compose up -d

pids=()
cleanup() { kill "${pids[@]}" 2>/dev/null || true; }
trap cleanup EXIT INT TERM

(cd services/auth-service && exec npm run dev) &
pids+=($!)
(cd services/journal-service && exec npm run dev) &
pids+=($!)
(cd frontend && exec npm start) &
pids+=($!)

wait
