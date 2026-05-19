#!/usr/bin/env bash

# === scripts/web/all.sh ===
# Site-only quality gate: clean, lint/sanity, Vitest, Playwright integration.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "Moving to project root: $ROOT_DIR"
cd "$ROOT_DIR"

RUN_CLEAN="${ALL_SH_CLEAN:-1}"
if [ "$RUN_CLEAN" = "1" ]; then
  echo "--- 0/4 Clean build/test artifacts ---"
  npm run clean
else
  echo "--- 0/4 Clean build/test artifacts (skipped: ALL_SH_CLEAN=$RUN_CLEAN) ---"
fi

echo "--- 1/4 Lint and sanity ---"
bash "$SCRIPT_DIR/lint-and-format.sh"

echo ""
echo "--- 2/4 Unit tests ---"
bash "$SCRIPT_DIR/unit-tests,sh"

echo ""
echo "--- 3/4 Integration tests ---"
bash "$SCRIPT_DIR/integration-tests.sh"

echo ""
echo "Web done. Clean, lint/sanity, unit tests, and integration tests passed."
