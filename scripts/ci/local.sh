#!/usr/bin/env bash
# Local mirror of the Actions build job (minus Pages deploy).
# When Docker is available, the deploy gate runs inside the same Playwright noble
# image as CI — no apt --with-deps, same WebKit as snapshot baselines.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$ROOT_DIR"

SECONDS=0

export PW_SKIP_EXTREME_ZOOM_VISUAL=0

echo "=== Semgrep (contact worker) ==="
bash "$ROOT_DIR/scripts/contact_worker/semgrep.sh"

echo ""
echo "=== npm audit ==="
npm audit --audit-level=high

# Playwright workers / clean match Actions; Lighthouse keeps scripts/web/lighthouse.sh
# defaults (stricter on a local machine). Actions sets looser LH_* only in deploy.yml.
export ALL_SH_CLEAN="${ALL_SH_CLEAN:-0}"
export PW_WORKERS="${PW_WORKERS:-4}"
export LIGHTHOUSE_SKIP_BUILD=1

run_deploy_gate() {
  export PLAYWRIGHT_SKIP_OS_DEPS="${PLAYWRIGHT_SKIP_OS_DEPS:-1}"
  export PW_SKIP_EXTREME_ZOOM_VISUAL=0

  echo ""
  echo "=== Playwright (lockfile + browsers) ==="
  bash "$ROOT_DIR/scripts/ci/ensure-playwright.sh"

  echo ""
  echo "=== Quality gate (all.sh, full Playwright) ==="
  PW_SKIP_EXTREME_ZOOM_VISUAL=0 bash "$ROOT_DIR/scripts/all.sh"

  echo ""
  echo "=== Lighthouse ==="
  bash "$ROOT_DIR/scripts/web/lighthouse.sh"

  echo ""
  echo "=== Pages build ==="
  bash "$ROOT_DIR/scripts/web/build-pages.sh"

  echo ""
  echo "=== Sitemap verify ==="
  bash "$ROOT_DIR/scripts/web/verify-sitemap.sh"
}

if command -v docker >/dev/null 2>&1; then
  IMAGE="$(node "$SCRIPT_DIR/ensure-playwright.mjs" --print-docker-image)"
  echo ""
  echo "=== Deploy gate inside Playwright CI image (${IMAGE}) ==="
  bash "$SCRIPT_DIR/run-in-playwright-image.sh" -- bash -lc '
set -euo pipefail
export PLAYWRIGHT_SKIP_OS_DEPS=1
export PW_SKIP_EXTREME_ZOOM_VISUAL=0
bash ./scripts/ci/ensure-playwright.sh
PW_SKIP_EXTREME_ZOOM_VISUAL=0 bash ./scripts/all.sh
bash ./scripts/web/lighthouse.sh
bash ./scripts/web/build-pages.sh
bash ./scripts/web/verify-sitemap.sh
'
else
  echo ""
  echo "=== Deploy gate on host (docker missing — WebKit snapshots may differ from Actions) ==="
  run_deploy_gate
fi

elapsed="$SECONDS"
elapsed_min=$((elapsed / 60))
elapsed_sec=$((elapsed % 60))

echo ""
echo "CI-local gate passed (deploy excluded)."
printf 'Total time: %dm %02ds (%ds)\n' "$elapsed_min" "$elapsed_sec" "$elapsed"
