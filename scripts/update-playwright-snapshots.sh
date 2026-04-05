#!/usr/bin/env bash
# Refresh Playwright screenshot baselines. Snapshots are written while tests run — there is no
# separate "update only" mode without executing those tests.
#
# Usage:
#   ./scripts/update-playwright-snapshots.sh
#       → only "hero section" + "profile section" screenshot tests (typical layout tweaks)
#   ./scripts/update-playwright-snapshots.sh e2e/foo.spec.ts
#   ./scripts/update-playwright-snapshots.sh --update-snapshots e2e/
#       → any extra args are passed to: playwright test --update-snapshots <args...>

set -e
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
export PLAYWRIGHT_FORCE_TTY=1

if [[ $# -gt 0 ]]; then
  exec npx playwright test --update-snapshots "$@"
else
  exec npx playwright test e2e/pages.spec.ts e2e/hero.spec.ts \
    --grep 'last screenshot matches' \
    --update-snapshots
fi
