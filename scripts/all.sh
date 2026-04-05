#!/usr/bin/env bash

# === scripts/all.sh ===
# Runs lint, formatting, and E2E tests in order.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$SCRIPT_DIR/.."

echo "Moving to project root: $ROOT_DIR"
cd "$ROOT_DIR"

echo "--- 1/2 Lint and format ---"
bash "$SCRIPT_DIR/lint-and-format.sh"

echo ""
echo "--- 2/2 E2E tests ---"
# Same flags as CI: Playwright starts its own astro dev and tears it down afterward
# (reuseExistingServer off), 12 workers by default and 2 retries (override: PW_WORKERS=…).
# Without this, local `npm test`
# reuses whatever is already on :4321 — parallel workers then pile onto one dev process,
# Vite queues compilations, and runs feel slower/flakier the more often you repeat them.
echo "Tip: if you see 'port already in use', stop any manual astro dev on port 4321 first."
CI=1 npm run test

echo ""
echo "All done. Lint, format and tests passed."
