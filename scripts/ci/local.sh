#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$ROOT_DIR"

export PW_SKIP_EXTREME_ZOOM_VISUAL=0

echo "=== Semgrep (contact worker) ==="
bash "$ROOT_DIR/scripts/contact_worker/semgrep.sh"

echo ""
echo "=== npm audit ==="
npm audit --audit-level=high

echo ""
echo "=== Quality gate (all.sh, full Playwright) ==="
# Force on the child argv — do not rely only on inherited export.
PW_SKIP_EXTREME_ZOOM_VISUAL=0 bash "$ROOT_DIR/scripts/all.sh"

echo ""
echo "=== Lighthouse ==="
LIGHTHOUSE_SKIP_BUILD=1 bash "$ROOT_DIR/scripts/web/lighthouse.sh"

echo ""
echo "=== Pages build ==="
bash "$ROOT_DIR/scripts/web/build-pages.sh"

echo ""
echo "=== Sitemap verify ==="
bash "$ROOT_DIR/scripts/web/verify-sitemap.sh"

echo ""
echo "CI-local gate passed (deploy excluded)."
