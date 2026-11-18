#!/usr/bin/env bash
# Run a command inside the same Playwright Docker image Actions uses
# (mcr.microsoft.com/playwright:v*-noble from package-lock).
#
# Usage:
#   ./scripts/ci/run-in-playwright-image.sh -- <command> [args...]
#   ./scripts/ci/run-in-playwright-image.sh npx playwright test ...
#
# Forwards only host env vars that are already set (non-empty), so script
# defaults inside the container (e.g. stricter local Lighthouse budgets) stay intact.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$ROOT_DIR"

if [[ "${1:-}" == "--" ]]; then
  shift
fi

if [[ "$#" -eq 0 ]]; then
  echo "Usage: $0 [--] <command> [args...]" >&2
  exit 2
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required to run commands in the Playwright CI image" >&2
  exit 1
fi

IMAGE="$(node "$SCRIPT_DIR/ensure-playwright.mjs" --print-docker-image)"

echo "Playwright CI image: ${IMAGE}"

docker_env=(
  -e HOME=/tmp
  -e npm_config_cache=/tmp/npm-cache
  -e PLAYWRIGHT_SKIP_OS_DEPS=1
  -e "PLAYWRIGHT_FORCE_TTY=${PLAYWRIGHT_FORCE_TTY:-1}"
)

forward_env_if_set() {
  local name="$1"
  if [[ -n "${!name:-}" ]]; then
    docker_env+=(-e "${name}=${!name}")
  fi
}

forward_env_if_set CI
forward_env_if_set PW_SERVER_MODE
forward_env_if_set PW_SKIP_BUILD
forward_env_if_set PW_SKIP_EXTREME_ZOOM_VISUAL
forward_env_if_set PW_WORKERS
forward_env_if_set PW_REUSE_SERVER
forward_env_if_set ALL_SH_CLEAN
forward_env_if_set MAINTENANCE_FORCE_OFF
forward_env_if_set MAINTENANCE_CONFIG_PATH
forward_env_if_set LIGHTHOUSE_SKIP_BUILD
forward_env_if_set LH_MAX_LCP_MS
forward_env_if_set LH_MIN_PERF_SCORE
forward_env_if_set LH_PROFILE_MAX_LCP_MS
forward_env_if_set LH_PROFILE_MIN_PERF_SCORE
forward_env_if_set LH_ATTEMPTS

exec docker run --rm --init --ipc=host --network host \
  -u "$(id -u):$(id -g)" \
  -v "${ROOT_DIR}:/work" -w /work \
  "${docker_env[@]}" \
  "$IMAGE" \
  "$@"
