#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$ROOT_DIR"

SITE="${ASTRO_SITE:-http://127.0.0.1:4321}"
BASE="${ASTRO_BASE:-/}"

# Production Pages artifact: honor config/maintenance.json (do not force off).
unset MAINTENANCE_FORCE_OFF || true

npx --no-install astro build --site "$SITE" --base "$BASE"
