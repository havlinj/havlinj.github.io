#!/usr/bin/env bash

# === scripts/all.sh ===
# Full monorepo gate: scripts/web/all.sh + scripts/contact_worker/all.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== Web ==="
bash "$SCRIPT_DIR/web/all.sh"

echo ""
echo "=== Contact worker ==="
bash "$SCRIPT_DIR/contact_worker/all.sh"

echo ""
echo "All done. Web and contact worker checks passed."
