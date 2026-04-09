#!/usr/bin/env bash
# Refresh Playwright screenshot baselines. Snapshots are written while tests run — there is no
# separate "update only" mode without executing those tests.
#
# Usage:
#   ./scripts/update-playwright-snapshots.sh
#       → default screenshot set: hero section, profile section, and mobile Foundations reveal
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

if [[ $# -gt 0 ]]; then
  exec npx playwright test --update-snapshots "$@"
else
  npx playwright test e2e/pages.spec.ts e2e/hero.spec.ts \
    --project=desktop-chromium \
    --grep 'last screenshot matches' \
    --update-snapshots
  exec npx playwright test e2e/profile-mobile.spec.ts \
    --project=mobile-chromium \
    --grep 'Foundations reveal visual snapshot on mobile' \
    --update-snapshots
fi
