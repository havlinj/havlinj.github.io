#!/usr/bin/env node
/**
 * Measure Profile load times — N cold-context navigations to /profile, write JSON results.
 * See docs/profile-load-performance.md for methodology.
 */

import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const OUT_DIR = path.join(ROOT, 'benchmarks/profile-load');

const DEFAULTS = {
  runs: 100,
  baseUrl: 'http://127.0.0.1:4321',
  path: '/profile',
  viewport: { width: 1280, height: 900 },
  label: 'baseline',
  serverTimeoutMs: 60_000,
  navigationTimeoutMs: 30_000,
};

function parseArgs(argv) {
  const opts = { ...DEFAULTS, startServer: true, prefetchViaHome: false };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--no-server') opts.startServer = false;
    else if (arg.startsWith('--runs=')) opts.runs = Number(arg.slice(7));
    else if (arg.startsWith('--label=')) opts.label = arg.slice(8);
    else if (arg.startsWith('--base-url=')) opts.baseUrl = arg.slice(11);
    else if (arg === '--prefetch-via-home') opts.prefetchViaHome = true;
    else if (arg === '--help' || arg === '-h') {
      console.log(`Usage: node scripts/benchmark/profile-load-measure.mjs [options]

  --runs=100          Number of navigations (default 100)
  --label=baseline    Result label (default baseline)
  --base-url=URL      Server base (default http://127.0.0.1:4321)
  --no-server         Do not start astro preview; assume server is up
  --prefetch-via-home Visit / first, hover Profile nav link, then measure /profile
                      (browser cache enabled — not comparable to cold baseline KPI)
`);
      process.exit(0);
    }
  }
  if (!Number.isFinite(opts.runs) || opts.runs < 1) {
    throw new Error('--runs must be a positive number');
  }
  return opts;
}

function stats(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const mean = sorted.reduce((a, b) => a + b, 0) / n;
  const median =
    n % 2 === 0
      ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
      : sorted[(n - 1) / 2];
  const p95 = sorted[Math.min(n - 1, Math.floor(n * 0.95))];
  const min = sorted[0];
  const max = sorted[n - 1];
  const variance =
    sorted.reduce((acc, v) => acc + (v - mean) ** 2, 0) / n;
  const stddev = Math.sqrt(variance);
  return { mean, median, p95, min, max, stddev, n };
}

async function waitForServer(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (res.ok || res.status === 404) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Server not ready at ${url} within ${timeoutMs}ms`);
}

function startPreviewServer(baseUrl) {
  const child = spawn(
    'npm',
    ['run', 'preview', '--', '--host', '127.0.0.1', '--port', '4321'],
    {
      cwd: ROOT,
      stdio: 'ignore',
      env: { ...process.env, FORCE_COLOR: '0' },
    },
  );
  return child;
}

async function measureOneRun(
  browser,
  url,
  viewport,
  navigationTimeoutMs,
  prefetchViaHome,
) {
  const context = await browser.newContext({ viewport });

  await context.addInitScript(() => {
    /** @type {{
     *   domContentLoaded: number | null;
     *   typeFitLabelVar: number | null;
     *   veilRemoved: number | null;
     *   fullyVisible: number | null;
     * }} */
    window.__profileLoadBench = {
      domContentLoaded: null,
      typeFitLabelVar: null,
      veilRemoved: null,
      fullyVisible: null,
    };

    const navStart = () =>
      performance.getEntriesByType('navigation')[0]?.startTime ?? 0;

    const mark = (key) => {
      const bench = window.__profileLoadBench;
      if (bench[key] != null) return;
      bench[key] = performance.now() - navStart();
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        mark('domContentLoaded');
      });
    } else {
      mark('domContentLoaded');
    }

    const tick = () => {
      const section = document.querySelector('.profile-section');
      if (section instanceof HTMLElement) {
        const labelVar = section.style
          .getPropertyValue('--profile-tile-label-font-size')
          .trim();
        if (/^\d/.test(labelVar)) mark('typeFitLabelVar');
        if (!section.classList.contains('profile-section--loading')) {
          mark('veilRemoved');
        }
        const opacity = Number.parseFloat(getComputedStyle(section).opacity);
        if (
          !section.classList.contains('profile-section--loading') &&
          opacity >= 0.99
        ) {
          mark('fullyVisible');
        }
      }
      if (window.__profileLoadBench.fullyVisible == null) {
        requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame(tick);
  });

  const page = await context.newPage();

  try {
    if (prefetchViaHome) {
      const homeUrl = `${new URL(url).origin}/`;
      await page.goto(homeUrl, {
        waitUntil: 'domcontentloaded',
        timeout: navigationTimeoutMs,
      });
      await page.locator('a.site-nav__link[href="/profile"]').hover();
      await page.waitForTimeout(150);
    }

    await page.goto(url, {
      waitUntil: 'commit',
      timeout: navigationTimeoutMs,
    });

    const handle = await page.waitForFunction(
      () => {
        const bench = window.__profileLoadBench;
        if (bench?.fullyVisible != null) {
          return {
            domContentLoaded: bench.domContentLoaded,
            typeFitLabelVar: bench.typeFitLabelVar,
            veilRemoved: bench.veilRemoved,
            fullyVisible: bench.fullyVisible,
          };
        }
        return null;
      },
      { timeout: navigationTimeoutMs, polling: 16 },
    );

    const value = await handle.jsonValue();
    if (!value?.fullyVisible) {
      throw new Error('Benchmark finished without fullyVisible sample');
    }
    return value;
  } finally {
    await context.close();
  }
}

function summarizeRuns(runs) {
  const keys = [
    'domContentLoaded',
    'typeFitLabelVar',
    'veilRemoved',
    'fullyVisible',
  ];
  /** @type {Record<string, ReturnType<typeof stats>>} */
  const summary = {};
  for (const key of keys) {
    const values = runs
      .map((r) => r[key])
      .filter((v) => typeof v === 'number' && Number.isFinite(v));
    if (values.length > 0) summary[key] = stats(values);
  }
  return summary;
}

function printSummary(summary, label) {
  console.log(`\n=== Profile load benchmark: ${label} ===\n`);
  for (const [metric, s] of Object.entries(summary)) {
    console.log(
      `${metric.padEnd(18)} mean=${s.mean.toFixed(1)}ms  median=${s.median.toFixed(1)}ms  p95=${s.p95.toFixed(1)}ms  min=${s.min.toFixed(1)}ms  max=${s.max.toFixed(1)}ms  σ=${s.stddev.toFixed(1)}ms`,
    );
  }
  console.log('');
}

async function main() {
  const opts = parseArgs(process.argv);
  const url = `${opts.baseUrl.replace(/\/$/, '')}${opts.path}`;

  mkdirSync(OUT_DIR, { recursive: true });

  /** @type {import('node:child_process').ChildProcess | null} */
  let server = null;
  if (opts.startServer) {
    console.log('Starting astro preview on :4321…');
    server = startPreviewServer(opts.baseUrl);
    await waitForServer(`${opts.baseUrl}/`, opts.serverTimeoutMs);
    console.log('Preview ready.\n');
  } else {
    await waitForServer(`${opts.baseUrl}/`, 5_000);
  }

  const browser = await chromium.launch({
    args: opts.prefetchViaHome ? [] : ['--disable-http-cache'],
  });

  /** @type {Array<Record<string, number | null>>} */
  const runs = [];
  const startedAt = new Date().toISOString();

  try {
    for (let i = 0; i < opts.runs; i += 1) {
      process.stdout.write(`Run ${i + 1}/${opts.runs}…\r`);
      try {
        const sample = await measureOneRun(
          browser,
          url,
          opts.viewport,
          opts.navigationTimeoutMs,
          opts.prefetchViaHome,
        );
        runs.push(sample);
      } catch (err) {
        console.error(`\nRun ${i + 1} failed:`, err);
        throw err;
      }
    }
    console.log(`Run ${opts.runs}/${opts.runs} — done.   `);
  } finally {
    await browser.close();
    if (server) {
      server.kill('SIGTERM');
    }
  }

  const summary = summarizeRuns(runs);
  printSummary(summary, opts.label);

  const payload = {
    label: opts.label,
    startedAt,
    finishedAt: new Date().toISOString(),
    config: {
      runs: opts.runs,
      url,
      viewport: opts.viewport,
      coldContextPerRun: true,
      disableHttpCache: !opts.prefetchViaHome,
      prefetchViaHome: opts.prefetchViaHome,
    },
    summary,
    runs,
  };

  const timestamp = startedAt.replace(/[:.]/g, '-');
  const fileBase = `${opts.label}-${timestamp}`;
  writeFileSync(
    path.join(OUT_DIR, `${fileBase}.json`),
    `${JSON.stringify(payload, null, 2)}\n`,
  );
  writeFileSync(
    path.join(OUT_DIR, `${opts.label}-latest.json`),
    `${JSON.stringify(payload, null, 2)}\n`,
  );

  console.log(`Wrote benchmarks/profile-load/${fileBase}.json`);
  console.log(`Wrote benchmarks/profile-load/${opts.label}-latest.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
