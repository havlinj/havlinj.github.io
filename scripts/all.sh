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
npm run test

echo ""
echo "All done. Lint, format and tests passed."
