#!/usr/bin/env bash
# Refresh Playwright screenshot baselines. Snapshots are written while tests run — there is no
# separate "update only" mode without executing those tests.
#
# Usage:
#   ./scripts/update-playwright-snapshots.sh
#       → full screenshot set: hero, profile, Credits main, extreme-zoom (desktop chromium +
#         mobile webkit), mobile Foundations reveal; PW_SERVER_MODE=preview (matches CI /
#         integration-tests.sh).
#   ./scripts/update-playwright-snapshots.sh e2e/foo.spec.ts
#   ./scripts/update-playwright-snapshots.sh --update-snapshots e2e/
#       → any extra args are passed to: playwright test --update-snapshots <args...>
#
# PW_SERVER_MODE defaults to preview so baselines match scripts/integration-tests.sh and CI
# (playwright.config otherwise uses astro dev, which renders differently from build + preview).

set -e
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
export PLAYWRIGHT_FORCE_TTY=1
export PW_SERVER_MODE="${PW_SERVER_MODE:-preview}"

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
  exec npx playwright test e2e/extreme-zoom-visual-mobile.spec.ts \
    --project=mobile-webkit \
    --update-snapshots
fi
