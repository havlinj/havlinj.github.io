
#!/usr/bin/env bash

# === scripts/lint-and-format.sh ===

# Exit script on any error
set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

ROOT_DIR="$SCRIPT_DIR/.."

echo "Moving to project root: $ROOT_DIR"
cd "$ROOT_DIR"

echo "Running ESLint with fixes..."
npm run lint -- --fix

echo "Running ESLint again (no fix)..."
if ! npm run lint; then
  echo "ESLint still reports errors. Fix them before formatting."
  exit 1
fi

echo "Running Astro check..."
ASTRO_CHECK_OUTPUT="$(npm run check:astro 2>&1)"
echo "$ASTRO_CHECK_OUTPUT"

# Keep all.sh strict: fail when Astro reports any non-zero warnings/hints.
if echo "$ASTRO_CHECK_OUTPUT" | grep -Eq "(^warning[[:space:]])|(^- [1-9][0-9]* warnings?$)|(^- [1-9][0-9]* hints?$)"; then
  echo "Astro check reported warnings/hints. Treating as failure."
  exit 1
fi

echo "ESLint passed – running Prettier..."
npm run format

echo "Done!"