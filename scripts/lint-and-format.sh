
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

echo "ESLint passed – running Prettier..."
npm run format

echo "Done!"