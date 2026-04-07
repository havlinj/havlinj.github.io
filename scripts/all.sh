#!/usr/bin/env bash

# === scripts/all.sh ===
# Runs lint, formatting, and E2E tests in order.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$SCRIPT_DIR/.."
LOCK_DIR="/tmp/documents-web-all-sh.lock"

# Prevent concurrent all.sh runs (common source of Playwright/astro dev conflicts).
if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  echo "Another all.sh run is already in progress (lock: $LOCK_DIR)."
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

echo "Moving to project root: $ROOT_DIR"
cd "$ROOT_DIR"

echo "--- 1/2 Lint and format ---"
bash "$SCRIPT_DIR/lint-and-format.sh"

echo ""
echo "--- 2/2 E2E tests ---"
# Local-first defaults:
# - do NOT force CI mode (CI retries and stricter orchestration can be much slower locally)
# - keep worker count conservative to avoid dev-server contention on repeated runs
# - optional CI-like mode can be enabled via PW_CI_MODE=1
#
# Auto mode (default):
# - if :4321 serves this site health token, reuse it
# - if :4321 is occupied by something else, fail with clear guidance
# - if :4321 is free, let Playwright start its own dev server
#
# Manual override:
#   PW_REUSE_SERVER=1 ./scripts/all.sh   # always reuse existing
#   PW_REUSE_SERVER=0 ./scripts/all.sh   # never reuse
REUSE_MODE="${PW_REUSE_SERVER:-auto}"
REUSE_FLAG="0"
if [ "$REUSE_MODE" = "1" ]; then
  REUSE_FLAG="1"
  echo "Using existing dev server on :4321 (PW_REUSE_SERVER=1)."
elif [ "$REUSE_MODE" = "0" ]; then
  REUSE_FLAG="0"
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

# Keep local all.sh stable: default to fewer workers unless explicitly overridden.
PW_WORKERS="${PW_WORKERS:-12}"
PW_CI_MODE="${PW_CI_MODE:-0}"
echo "Playwright workers: $PW_WORKERS"
echo "Playwright CI mode: $PW_CI_MODE"
echo "Running parallel-safe tests (excluding @serial)..."
CI="$PW_CI_MODE" PW_REUSE_SERVER="$REUSE_FLAG" npm run test -- --workers="$PW_WORKERS" --grep-invert="@serial"
echo ""
echo "Running serial-sensitive why tests with one worker..."
CI="$PW_CI_MODE" PW_REUSE_SERVER="$REUSE_FLAG" npm run test -- e2e/why-route.spec.ts --workers=1
echo ""
echo "Running serial-sensitive mobile profile tests with one worker..."
CI="$PW_CI_MODE" PW_REUSE_SERVER="$REUSE_FLAG" npm run test -- e2e/profile-mobile.spec.ts --workers=1

echo ""
echo "All done. Lint, format and tests passed."
