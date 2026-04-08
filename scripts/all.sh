#!/usr/bin/env bash

# === scripts/all.sh ===
# Runs lint/sanity, unit tests, and integration tests in order.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$SCRIPT_DIR/.."

echo "Moving to project root: $ROOT_DIR"
cd "$ROOT_DIR"

echo "--- 1/3 Lint and sanity ---"
bash "$SCRIPT_DIR/lint-and-format.sh"

echo ""
echo "--- 2/3 Unit tests ---"
bash "$SCRIPT_DIR/unit-tests,sh"

echo ""
echo "--- 3/3 Integration tests ---"
bash "$SCRIPT_DIR/integration-tests.sh"

echo ""
echo "All done. Lint/sanity, unit tests, and integration tests passed."
