#!/usr/bin/env node
/**
 * One-off breakdown of veilRemoved timeline (local diagnostic).
 * Usage: npm run build && node scripts/benchmark/profile-load-breakdown.mjs [--runs=30]
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const URL = 'http://127.0.0.1:4321/profile';
const RUNS =
  Number(process.argv.find((a) => a.startsWith('--runs='))?.slice(7)) || 30;

function stats(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const mean = sorted.reduce((a, b) => a + b, 0) / n;
  return {
    mean,
    median: sorted[Math.floor(n / 2)],
    p95: sorted[Math.floor(n * 0.95)],
  };
}

function startPreview() {
  return spawn(
    'npm',
    ['run', 'preview', '--', '--host', '127.0.0.1', '--port', '4321'],
    {
      cwd: ROOT,
      stdio: 'ignore',
      env: { ...process.env, FORCE_COLOR: '0' },
    },
  );
}

async function waitForServer() {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(URL, { signal: AbortSignal.timeout(2000) });
      if (res.ok) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('preview not ready');
}

async function measureRun(browser) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  await context.addInitScript(() => {
    const navStart = () =>
      performance.getEntriesByType('navigation')[0]?.startTime ?? 0;
    const marks = {};
    const mark = (key) => {
      if (marks[key] != null) return;
      marks[key] = performance.now() - navStart();
    };

    window.__veilBreakdown = marks;

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () =>
        mark('domContentLoaded'),
      );
    } else {
      mark('domContentLoaded');
    }

    document.addEventListener(
      'profileTileTypeFit',
      () => mark('typeFitEvent'),
      {
        once: true,
      },
    );

    const poll = () => {
      const section = document.querySelector('.profile-section');
      if (section instanceof HTMLElement) {
        const labelVar = section.style
          .getPropertyValue('--profile-tile-label-font-size')
          .trim();
        if (/^\d/.test(labelVar)) mark('typeFitLabelVar');
        if (!section.classList.contains('profile-section--loading')) {
          mark('veilRemoved');
        }
      }
      const img = document.querySelector('.profile-photo-frame img');
      if (
        img instanceof HTMLImageElement &&
        img.complete &&
        img.naturalWidth > 0
      ) {
        mark('portraitComplete');
      }
      if (marks.veilRemoved == null) requestAnimationFrame(poll);
    };
    requestAnimationFrame(poll);

    document.fonts?.ready?.then(() => mark('fontsReady'));

    const cssPoll = () => {
      const tile = document.querySelector('.profile-section .prof-tile');
      if (
        tile instanceof HTMLElement &&
        getComputedStyle(tile).maxHeight === 'none'
      ) {
        mark('profileCssApplied');
        return;
      }
      if (performance.now() - navStart() < 5000) requestAnimationFrame(cssPoll);
    };
    requestAnimationFrame(cssPoll);
  });

  const page = await context.newPage();
  await page.goto(URL, { waitUntil: 'commit', timeout: 30_000 });
  await page.waitForFunction(
    () => window.__veilBreakdown?.veilRemoved != null,
    undefined,
    { timeout: 15_000 },
  );

  const data = await page.evaluate(() => {
    const marks = { ...window.__veilBreakdown };
    const resources = performance
      .getEntriesByType('resource')
      .filter((e) =>
        /portrait_bayer|profile\.css|inter-latin-700|fallback_desktop|tommy-RCA|uve-sanchez/.test(
          e.name,
        ),
      )
      .map((e) => ({
        name: e.name.split('/').pop(),
        start: Math.round(e.startTime),
        duration: Math.round(e.duration),
        end: Math.round(e.startTime + e.duration),
      }));
    return { marks, resources };
  });

  await context.close();
  return data;
}

function meanKey(runs, key) {
  const vals = runs.map((r) => r.marks[key]).filter((v) => v != null);
  return stats(vals);
}

const preview = startPreview();
await waitForServer();
const browser = await chromium.launch({ args: ['--disable-http-cache'] });
const runs = [];
for (let i = 0; i < RUNS; i += 1) {
  runs.push(await measureRun(browser));
  process.stdout.write(`\r${i + 1}/${RUNS}`);
}
console.log('\n');

await browser.close();
preview.kill('SIGTERM');

const keys = [
  'domContentLoaded',
  'fontsReady',
  'profileCssApplied',
  'typeFitLabelVar',
  'typeFitEvent',
  'portraitComplete',
  'veilRemoved',
];

console.log('=== Milestone means (ms from navigation) ===\n');
for (const key of keys) {
  const s = meanKey(runs, key);
  console.log(
    `${key.padEnd(20)} mean=${s.mean.toFixed(1)}  median=${s.median.toFixed(1)}  p95=${s.p95.toFixed(1)}`,
  );
}

console.log('\n=== Typical resource timing (mean end ms) ===\n');
const byName = new Map();
for (const run of runs) {
  for (const r of run.resources) {
    if (!byName.has(r.name)) byName.set(r.name, []);
    byName.get(r.name).push(r.end);
  }
}
for (const [name, ends] of [...byName.entries()].sort((a, b) =>
  a[0].localeCompare(b[0]),
)) {
  const s = stats(ends);
  console.log(`${name.padEnd(40)} end mean=${s.mean.toFixed(1)}ms`);
}

const typeFit = meanKey(runs, 'typeFitEvent');
const portrait = meanKey(runs, 'portraitComplete');
const veil = meanKey(runs, 'veilRemoved');
console.log('\n=== Gate analysis ===');
console.log(`typeFitEvent mean:      ${typeFit.mean.toFixed(1)} ms`);
console.log(`portraitComplete mean:  ${portrait.mean.toFixed(1)} ms`);
console.log(`veilRemoved mean:       ${veil.mean.toFixed(1)} ms`);
console.log(
  `slow gate (approx):     ${Math.max(typeFit.mean, portrait.mean).toFixed(1)} ms`,
);
console.log(
  `+rAF after slow gate:  ~${(veil.mean - Math.max(typeFit.mean, portrait.mean)).toFixed(1)} ms`,
);
