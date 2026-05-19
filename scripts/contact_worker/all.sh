#!/usr/bin/env bash

# === scripts/contact_worker/all.sh ===
# Contact worker only: npm ci (when needed) + Vitest.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKER_DIR="$(cd "$SCRIPT_DIR/../../contact_worker" && pwd)"

echo "Moving to contact worker: $WORKER_DIR"
cd "$WORKER_DIR"

if [[ ! -d node_modules ]]; then
  echo "Installing contact_worker dependencies..."
  npm ci
fi

echo "--- Unit tests ---"
npm test -- --run

echo ""
echo "Contact worker done. Unit tests passed."
