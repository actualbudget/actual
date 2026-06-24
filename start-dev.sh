#!/bin/sh
set -e

cd "$(dirname "$0")"
ROOT="$(pwd)"

cleanup() {
  kill "$LOOT_PID" "$PLUGINS_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "Building loot-core backend..."
cd "$ROOT/packages/loot-core"
node "$ROOT/node_modules/vite/bin/vite.js" build \
  --config vite.config.mts \
  --mode development

echo "Starting loot-core watcher..."
node "$ROOT/node_modules/vite/bin/vite.js" build \
  --config vite.config.mts \
  --mode development \
  --watch &
LOOT_PID=$!

echo "Starting plugins service..."
node "$ROOT/.yarn/releases/yarn-4.13.0.cjs" workspace plugins-service watch &
PLUGINS_PID=$!

echo "Starting frontend..."
export PORT=3001
export REACT_APP_BACKEND_WORKER_HASH=dev
cd "$ROOT/packages/desktop-client"
exec node "$ROOT/node_modules/vite/bin/vite.js" --mode=browser
