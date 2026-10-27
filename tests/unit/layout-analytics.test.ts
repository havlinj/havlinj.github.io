import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  UMAMI_SCRIPT_SRC,
  UMAMI_WEBSITE_ID,
} from '../../src/constants/analytics';

const layoutPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../src/layouts/Layout.astro',
);

function readLayoutHead(source: string): string {
  const headMatch = source.match(/<head>([\s\S]*?)<\/head>/);
  if (!headMatch) {
    throw new Error('Layout.astro is missing <head>');
  }
  return headMatch[1];
}

function scriptOpeningTags(head: string): string[] {
  return [...head.matchAll(/<script\b([^>]*)>/g)].map((match) => match[1]);
}

describe('layout analytics script', () => {
  it('keeps the Umami tracker in <head>', () => {
    expect(UMAMI_SCRIPT_SRC).toBe('https://cloud.umami.is/script.js');
    expect(UMAMI_WEBSITE_ID).toBe('a31bdde7-af25-4ba8-b894-65eab45a804f');

    const layout = readFileSync(layoutPath, 'utf8');
    expect(layout).toContain("from '../constants/analytics'");

    const head = readLayoutHead(layout);
    const tracker = scriptOpeningTags(head).find(
      (attributes) =>
        /\bis:inline\b/.test(attributes) &&
        /\bdefer\b/.test(attributes) &&
        attributes.includes('src={UMAMI_SCRIPT_SRC}') &&
        attributes.includes('data-website-id={UMAMI_WEBSITE_ID}'),
    );

    expect(tracker).toBeTruthy();
  });

  it('keeps e2e aborting the Umami host', () => {
    const fixture = readFileSync(
      path.join(
        path.dirname(fileURLToPath(import.meta.url)),
        '../../e2e/pw-test.ts',
      ),
      'utf8',
    );
    const stub = readFileSync(
      path.join(
        path.dirname(fileURLToPath(import.meta.url)),
        '../../e2e/helpers/block-third-party-network.ts',
      ),
      'utf8',
    );

    expect(fixture).toContain('UMAMI_SCRIPT_SRC');
    expect(fixture).toContain('route.abort()');
    expect(fixture).toContain('context.route');
    expect(stub).toContain('route.abort()');
  });
});
