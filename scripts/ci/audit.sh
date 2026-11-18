#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$ROOT_DIR"

tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT

set +e
npm audit --json >"$tmp"
status=$?
set -e

if [[ "$status" -gt 1 ]]; then
  echo "npm audit failed (exit ${status})" >&2
  cat "$tmp" >&2
  exit "$status"
fi

node "$SCRIPT_DIR/audit-high.mjs" <"$tmp"
