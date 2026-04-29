#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LOCK_DIR="/tmp/documents-web-integration-tests.lock"
PORT=4321

# Prevent concurrent integration runs (common source of Playwright/dev conflicts).
if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  echo "Another integration-tests.sh run is already in progress (lock: $LOCK_DIR)."
  echo "Wait for it to finish, or remove the lock if you are sure no run is active."
  exit 1
fi

cleanup() {
  # Best-effort: terminate only processes started under this script.
  # This avoids touching a manually started `npm run dev` in another terminal.
  jobs -pr | xargs -r kill 2>/dev/null || true
  rm -rf "$LOCK_DIR"
}
trap cleanup EXIT INT TERM

pid_listening_on_port() {
  lsof -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null | head -n1 || true
}

is_project_preview_process() {
  local pid="$1"
  local cmd
  cmd="$(ps -p "$pid" -o args= 2>/dev/null || true)"
  [[ "$cmd" == *"$ROOT_DIR/node_modules/.bin/astro preview"* ]] &&
    [[ "$cmd" == *"--port $PORT"* ]]
}

ensure_port_ready_for_fresh_server() {
  local pid
  pid="$(pid_listening_on_port)"
  if [[ -z "$pid" ]]; then
    return
  fi

  if is_project_preview_process "$pid"; then
    echo "Port $PORT has stale project preview process (pid $pid), terminating it..."
    kill "$pid" 2>/dev/null || true
    sleep 0.2
    if kill -0 "$pid" 2>/dev/null; then
      kill -9 "$pid" 2>/dev/null || true
    fi
  else
    echo "Port $PORT is already in use by another process (pid $pid)."
    echo "Stop that process or rerun with PW_REUSE_SERVER=1 if you intentionally want reuse."
    exit 1
  fi
}

echo "Moving to project root: $ROOT_DIR"
cd "$ROOT_DIR"

# Local-first defaults:
# - do NOT force CI mode (CI retries and stricter orchestration can be much slower locally)
# - keep worker count conservative to avoid dev-server contention on repeated runs
# - optional CI-like mode can be enabled via PW_CI_MODE=1
#
# Auto mode:
# - if :4321 serves this site health token, reuse it
# - if :4321 is occupied by something else, fail with clear guidance
# - if :4321 is free, let Playwright start its own dev server
#
# Manual override:
#   PW_REUSE_SERVER=1 ./scripts/integration-tests.sh   # always reuse existing
#   PW_REUSE_SERVER=0 ./scripts/integration-tests.sh   # never reuse
# Default to fresh server per run for stability (cleaner runtime environment).
REUSE_MODE="${PW_REUSE_SERVER:-0}"
REUSE_FLAG="0"
if [ "$REUSE_MODE" = "1" ]; then
  REUSE_FLAG="1"
  echo "Using existing dev server on :4321 (PW_REUSE_SERVER=1)."
elif [ "$REUSE_MODE" = "0" ]; then
  REUSE_FLAG="0"
  echo "Using fresh Playwright-managed dev server (PW_REUSE_SERVER=0)."
else
  RESPONSE="$(curl -fsS --max-time 2 "http://localhost:4321/e2e-health" 2>/dev/null || true)"
  if [ -n "$RESPONSE" ]; then
    if [ "$RESPONSE" = "documents-web:e2e-health:v1" ]; then
      REUSE_FLAG="1"
      echo "Detected matching e2e health token on :4321 -> reusing running dev server."
    else
      echo "Port 4321 responds, but e2e health token does not match this project."
      echo "Stop that process, or run with PW_REUSE_SERVER=1 only if it is this app."
      exit 1
    fi
  else
    REUSE_FLAG="0"
    echo "No compatible server detected on :4321 -> Playwright will start its own."
  fi
fi

PW_WORKERS="${PW_WORKERS:-8}"
PW_CI_MODE="${PW_CI_MODE:-0}"
echo "Playwright workers: $PW_WORKERS"
echo "Playwright CI mode: $PW_CI_MODE"
echo "Running parallel-safe tests (excluding @serial)..."
if [ "$REUSE_FLAG" = "0" ]; then ensure_port_ready_for_fresh_server; fi
CI="$PW_CI_MODE" PW_REUSE_SERVER="$REUSE_FLAG" PW_SERVER_MODE="preview" npm run test -- --workers="$PW_WORKERS" --grep-invert="@serial"
echo ""
echo "Running serial-sensitive why-this tests with one worker..."
if [ "$REUSE_FLAG" = "0" ]; then ensure_port_ready_for_fresh_server; fi
CI="$PW_CI_MODE" PW_REUSE_SERVER="$REUSE_FLAG" PW_SERVER_MODE="preview" npm run test -- e2e/why-this-route.spec.ts --workers=1
echo ""
echo "Running serial-sensitive mobile profile tests with one worker..."
if [ "$REUSE_FLAG" = "0" ]; then ensure_port_ready_for_fresh_server; fi
CI="$PW_CI_MODE" PW_REUSE_SERVER="$REUSE_FLAG" PW_SERVER_MODE="preview" npm run test -- e2e/profile-mobile.spec.ts --workers=1

echo ""
echo "Integration tests passed."
