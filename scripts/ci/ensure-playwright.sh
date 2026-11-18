#!/usr/bin/env bash
# Entry for local CI and Actions: lockfile check + browsers for that version.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec node "$SCRIPT_DIR/ensure-playwright.mjs" "$@"
