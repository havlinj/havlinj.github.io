#!/usr/bin/env node
/**
 * Compare two saved Profile load benchmark JSON files (from profile-load-measure.mjs).
 * Usage: node scripts/benchmark/profile-load-compare-results.mjs before.json after.json
 */

import { readFileSync } from 'node:fs';

function load(file) {
  const data = JSON.parse(readFileSync(file, 'utf8'));
  if (!data.summary || !data.label) {
    throw new Error(`Invalid benchmark file: ${file}`);
  }
  return data;
}

function delta(before, after) {
  const diff = after.mean - before.mean;
  const pct = before.mean !== 0 ? (diff / before.mean) * 100 : 0;
  return { diff, pct };
}

function main() {
  const [, , beforePath, afterPath] = process.argv;
  if (!beforePath || !afterPath) {
    console.error(
      'Usage: node scripts/benchmark/profile-load-compare-results.mjs <before.json> <after.json>',
    );
    process.exit(1);
  }

  const before = load(beforePath);
  const after = load(afterPath);

  console.log(`\nCompare: ${before.label} → ${after.label}`);
  console.log(
    `Runs: ${before.config?.runs ?? '?'} → ${after.config?.runs ?? '?'}\n`,
  );

  const metrics = Object.keys(before.summary);
  for (const metric of metrics) {
    const b = before.summary[metric];
    const a = after.summary[metric];
    if (!a) continue;
    const { diff, pct } = delta(b, a);
    const sign = diff <= 0 ? '✓' : '✗';
    console.log(
      `${sign} ${metric.padEnd(18)} ${b.mean.toFixed(1)}ms → ${a.mean.toFixed(1)}ms  (${diff >= 0 ? '+' : ''}${diff.toFixed(1)}ms, ${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%)  p95: ${b.p95.toFixed(1)} → ${a.p95.toFixed(1)}ms`,
    );
  }
  console.log('');
}

main();
