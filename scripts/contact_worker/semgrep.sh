#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKER_DIR="$(cd "$SCRIPT_DIR/../../contact_worker" && pwd)"
cd "$WORKER_DIR"

SEMGREP_CONFIG="${SEMGREP_CONFIG:-p/javascript}"
SEMGREP_TARGET="${SEMGREP_TARGET:-worker/}"

if command -v semgrep >/dev/null 2>&1; then
  semgrep scan --config "$SEMGREP_CONFIG" --error "$SEMGREP_TARGET"
  exit 0
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "semgrep or docker is required" >&2
  exit 1
fi

if docker compose version >/dev/null 2>&1; then
  docker compose run --rm --no-TTY semgrep \
    scan --config "$SEMGREP_CONFIG" --error "$SEMGREP_TARGET"
else
  docker run --rm \
    -v "${WORKER_DIR}:/src:ro" \
    -w /src \
    semgrep/semgrep \
    semgrep scan --config "$SEMGREP_CONFIG" --error "$SEMGREP_TARGET"
fi
