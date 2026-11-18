#!/usr/bin/env bash
# Refresh Playwright screenshot baselines. Snapshots are written while tests run — there is no
# separate "update only" mode without executing those tests.
#
# Usage:
#   ./scripts/ci/update-playwright-snapshots.sh
#       → full screenshot set: hero, profile, Credits main, extreme-zoom (desktop chromium +
#         mobile webkit), mobile Foundations reveal, maintenance Whoops panel,
#         reconstruction panel;
#         PW_SERVER_MODE=preview (matches CI / integration-tests.sh).
#   ./scripts/ci/update-playwright-snapshots.sh e2e/foo.spec.ts
#   ./scripts/ci/update-playwright-snapshots.sh --update-snapshots e2e/
#       → any extra args are passed to: playwright test --update-snapshots <args...>
#
# PW_SERVER_MODE defaults to preview so baselines match scripts/web/integration-tests.sh and CI
# (playwright.config otherwise uses astro dev, which renders differently from build + preview).
#
# Mobile WebKit extreme-zoom baselines are refreshed inside the Playwright noble Docker image
# (same as Actions). Host WebKit on Ubuntu 24.04 can differ by ~1px panel height.

set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"
export PLAYWRIGHT_FORCE_TTY=1
export PW_SERVER_MODE="${PW_SERVER_MODE:-preview}"
export MAINTENANCE_FORCE_OFF="${MAINTENANCE_FORCE_OFF:-1}"

update_mobile_webkit_in_ci_image() {
  local version image
  version="$(node ./scripts/ci/ensure-playwright.mjs --print-lock-version)"
  image="$(node -e "import { playwrightDockerImage } from './scripts/ci/ensure-playwright.mjs'; console.log(playwrightDockerImage(process.argv[1]))" "$version")"
  if ! command -v docker >/dev/null 2>&1; then
    echo "docker is required to refresh mobile-webkit snapshots (CI image: ${image})" >&2
    exit 1
  fi
  echo "Updating mobile-webkit extreme-zoom snapshots inside ${image}..."
  docker run --rm --ipc=host \
    -u "$(id -u):$(id -g)" \
    -v "${ROOT}:/work" -w /work \
    -e HOME=/tmp \
    -e npm_config_cache=/tmp/npm-cache \
    -e PW_SERVER_MODE=preview \
    -e PW_SKIP_BUILD=1 \
    -e MAINTENANCE_FORCE_OFF=1 \
    -e PLAYWRIGHT_SKIP_OS_DEPS=1 \
    -e PLAYWRIGHT_FORCE_TTY=1 \
    "$image" \
    npx playwright test e2e/extreme-zoom-visual-mobile.spec.ts \
      --project=mobile-webkit \
      --update-snapshots
}

# Build once so each Playwright invocation below only spins up `astro preview`
# (otherwise the webServer command rebuilds on every run and risks exceeding
# Playwright's 15 s webServer.timeout).
if [[ "$PW_SERVER_MODE" == "preview" ]]; then
  echo "Building site once for preview-mode webServer reuse..."
  npm run build
  export PW_SKIP_BUILD=1
fi

if [[ $# -gt 0 ]]; then
  exec npx playwright test --update-snapshots "$@"
else
  npx playwright test e2e/pages.spec.ts e2e/hero.spec.ts \
    --project=desktop-chromium \
    --grep 'last screenshot matches' \
    --update-snapshots
  npx playwright test e2e/credits.spec.ts \
    --project=desktop-chromium \
    --update-snapshots
  npx playwright test e2e/extreme-zoom-visual.spec.ts \
    --project=desktop-chromium \
    --update-snapshots
  npx playwright test e2e/profile-mobile.spec.ts \
    --project=mobile-chromium \
    --grep 'Foundations reveal visual snapshot on mobile' \
    --update-snapshots
  update_mobile_webkit_in_ci_image

  echo "Updating maintenance Whoops panel snapshot (isolated fixture build on :4322)..."
  unset PW_SKIP_BUILD || true
  PW_REUSE_SERVER=0 \
    npx playwright test -c playwright.maintenance.config.ts \
      e2e/maintenance-routes.spec.ts \
      --grep 'Whoops panel visual snapshot' \
      --update-snapshots

  echo "Updating reconstruction panel snapshot (isolated fixture build on :4322)..."
  PW_REUSE_SERVER=0 \
    MAINTENANCE_CONFIG_PATH=e2e/fixtures/maintenance-reconstruction.json \
    npx playwright test -c playwright.maintenance.config.ts \
      e2e/maintenance-reconstruction.spec.ts \
      --grep 'reconstruction panel visual snapshot' \
      --update-snapshots

  if [[ "$PW_SERVER_MODE" == "preview" ]]; then
    echo "Restoring default dist (maintenance fixture off)..."
    MAINTENANCE_FORCE_OFF=1 npm run build
  fi
fi
