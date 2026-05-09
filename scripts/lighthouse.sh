#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

PORT="${LIGHTHOUSE_PORT:-4321}"
HOST="${LIGHTHOUSE_HOST:-127.0.0.1}"
URL="http://${HOST}:${PORT}/"
REPORT_DIR="${LIGHTHOUSE_REPORT_DIR:-lighthouse-report}"
REPORT_JSON="${REPORT_DIR}/home.json"
SKIP_BUILD="${LIGHTHOUSE_SKIP_BUILD:-0}"
SKIP_PREVIEW="${LIGHTHOUSE_SKIP_PREVIEW:-0}"

# Default thresholds: stricter locally; GitHub Actions sets LH_MAX_LCP_MS in deploy.yml (noisy runners).
MIN_PERF_SCORE="${LH_MIN_PERF_SCORE:-0.85}"
MAX_LCP_MS="${LH_MAX_LCP_MS:-3000}"
MAX_CLS="${LH_MAX_CLS:-0.10}"
MAX_TBT_MS="${LH_MAX_TBT_MS:-200}"

kill_process_tree() {
  local pid="$1"
  local children
  children="$(ps -o pid= --ppid "$pid" 2>/dev/null || true)"
  for child in $children; do
    kill_process_tree "$child"
  done
  kill "$pid" 2>/dev/null || true
}

pid_listening_on_port() {
  lsof -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null | head -n1 || true
}

is_project_preview_process() {
  local pid="$1"
  local cmd
  cmd="$(ps -p "$pid" -o args= 2>/dev/null || true)"
  [[ "$cmd" == *"$ROOT_DIR/node_modules/.bin/astro preview"* ]] &&
    [[ "$cmd" == *"--port $PORT"* ]]
}

cleanup_port_if_our_stale_preview() {
  local pid
  pid="$(pid_listening_on_port)"
  if [[ -z "$pid" ]]; then
    return
  fi
  if is_project_preview_process "$pid"; then
    echo "Stopping stale project preview on port $PORT (pid $pid)..."
    kill_process_tree "$pid"
    sleep 0.2
  fi
}

cleanup() {
  if [[ -n "${PREVIEW_PID:-}" ]] && kill -0 "$PREVIEW_PID" 2>/dev/null; then
    kill_process_tree "$PREVIEW_PID"
    wait "$PREVIEW_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

mkdir -p "$REPORT_DIR"

cleanup_port_if_our_stale_preview

if [[ "$SKIP_BUILD" != "1" ]]; then
  echo "Building site for Lighthouse..."
  npm run build
fi

if [[ "$SKIP_PREVIEW" != "1" ]]; then
  existing_pid="$(pid_listening_on_port)"
  if [[ -n "$existing_pid" ]]; then
    if is_project_preview_process "$existing_pid"; then
      echo "Stopping stale project preview on port $PORT (pid $existing_pid)..."
      kill_process_tree "$existing_pid"
      sleep 0.2
    else
      echo "Port $PORT is already in use. Set LIGHTHOUSE_SKIP_PREVIEW=1 to reuse an existing server."
      exit 1
    fi
  fi
  echo "Starting Astro preview on ${HOST}:${PORT}..."
  npm run preview -- --host "$HOST" --port "$PORT" >/tmp/lighthouse-preview.log 2>&1 &
  PREVIEW_PID=$!
fi

echo "Waiting for ${URL}..."
for _ in $(seq 1 40); do
  if curl -fsS --max-time 2 "$URL" >/dev/null 2>&1; then
    break
  fi
  sleep 0.5
done
curl -fsS --max-time 2 "$URL" >/dev/null

CHROME_PATH="$(node -e "console.log(require('@playwright/test').chromium.executablePath())")"

echo "Running Lighthouse against ${URL}..."
npx lighthouse "$URL" \
  --chrome-path="$CHROME_PATH" \
  --chrome-flags="--headless=new --no-sandbox --disable-dev-shm-usage" \
  --output=json \
  --output-path="$REPORT_JSON" \
  --only-categories=performance \
  --quiet

node - "$REPORT_JSON" "$MIN_PERF_SCORE" "$MAX_LCP_MS" "$MAX_CLS" "$MAX_TBT_MS" <<'EOF'
const fs = require('node:fs');

const [reportPath, minScoreRaw, maxLcpRaw, maxClsRaw, maxTbtRaw] = process.argv.slice(2);
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const audits = report.audits || {};
const categories = report.categories || {};

const perfScore = (categories.performance?.score ?? 0) * 100;
const lcp = audits['largest-contentful-paint']?.numericValue ?? Infinity;
const cls = audits['cumulative-layout-shift']?.numericValue ?? Infinity;
const tbt = audits['total-blocking-time']?.numericValue ?? Infinity;

const minScore = Number(minScoreRaw) * 100;
const maxLcp = Number(maxLcpRaw);
const maxCls = Number(maxClsRaw);
const maxTbt = Number(maxTbtRaw);

console.log(`Lighthouse performance score: ${perfScore.toFixed(1)} (min ${minScore.toFixed(1)})`);
console.log(`LCP: ${lcp.toFixed(0)} ms (max ${maxLcp})`);
console.log(`CLS: ${cls.toFixed(3)} (max ${maxCls})`);
console.log(`TBT: ${tbt.toFixed(0)} ms (max ${maxTbt})`);

const failures = [];
if (perfScore < minScore) failures.push(`performance score ${perfScore.toFixed(1)} < ${minScore.toFixed(1)}`);
if (lcp > maxLcp) failures.push(`LCP ${lcp.toFixed(0)}ms > ${maxLcp}ms`);
if (cls > maxCls) failures.push(`CLS ${cls.toFixed(3)} > ${maxCls}`);
if (tbt > maxTbt) failures.push(`TBT ${tbt.toFixed(0)}ms > ${maxTbt}ms`);

if (failures.length > 0) {
  console.error('\nLighthouse budget failed:');
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}
EOF

echo "Lighthouse budget passed."
