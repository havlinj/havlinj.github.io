/**
 * Contract tests: TS constants ↔ CSS literals ↔ e2e helpers must stay aligned.
 * When changing one side, update the paired source and this file if needed.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  WHY_CTA_ARROW_FLOOR_OPACITY,
  WHY_CTA_ARROW_PEAK_OPACITY,
  WHY_CTA_BOX_WIDTH_FRAC,
} from '../../src/constants/why-layout';
import {
  MIN_CONTENT_WIDTH_CH,
  MAX_CONTENT_WIDTH_CH,
  WHY_CTA_VEIL_CLEARANCE_BELOW_LEAD_PX,
  WHY_CTA_VEIL_MIN_GAP_ABOVE_ARROW_PX,
  WHY_FIT_FAIL_LOCK_VIEWPORT_WIDTH,
} from '../../e2e/constants';
import {
  PROFILE_SEAM_MEDIA_MIN_WIDTHS,
  PROFILE_SHARED_EDGE_RATIO_BY_STEP,
} from '../../e2e/profile-seam-ratios';
import {
  REVEAL_PADDING_RATIO_ASSERT_TOLERANCE_PX,
  REVEAL_RIGHT_MARGIN_FIT_EPSILON_PX,
  REVEAL_RIGHT_MARGIN_RATIO_MIN,
  REVEAL_RIGHT_RENDER_PAD_PX,
} from '../../src/utils/profile-reveal-constants';

const repoRoot = path.join(fileURLToPath(new URL('../..', import.meta.url)));

function readRepoFile(relPath: string): string {
  return readFileSync(path.join(repoRoot, relPath), 'utf8');
}

function cssCustomProp(css: string, name: string): string | null {
  const re = new RegExp(
    `${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:\\s*([^;]+);`,
  );
  const m = css.match(re);
  return m ? m[1].trim() : null;
}

function whyBoxScrollLiteral(name: string): number {
  const src = readRepoFile('src/scripts/why-box-scroll.ts');
  const re = new RegExp(`${name}:\\s*([\\d.]+)`);
  const m = src.match(re);
  expect(m, `why-box-scroll.ts should define ${name}`).toBeTruthy();
  return Number(m![1]);
}

describe('layout contracts: profile seam ratios (CSS ↔ e2e/profile-seam-ratios.ts)', () => {
  const css = readRepoFile('src/styles/profile.css');

  it('CSS custom props match PROFILE_SHARED_EDGE_RATIO_BY_STEP', () => {
    const pairs: [string, keyof typeof PROFILE_SHARED_EDGE_RATIO_BY_STEP][] = [
      ['--profile-shared-edge-ratio-base', 'base'],
      ['--profile-shared-edge-ratio-360', 'at360'],
      ['--profile-shared-edge-ratio-480', 'at480'],
      ['--profile-shared-edge-ratio-720', 'at720'],
      ['--profile-shared-edge-ratio-960', 'at960'],
    ];
    for (const [varName, key] of pairs) {
      const raw = cssCustomProp(css, varName);
      expect(raw, varName).toBeTruthy();
      expect(Number.parseFloat(raw!)).toBe(
        PROFILE_SHARED_EDGE_RATIO_BY_STEP[key],
      );
    }
  });

  it('@media min-width breakpoints match PROFILE_SEAM_MEDIA_MIN_WIDTHS', () => {
    const found = [...css.matchAll(/@media\s*\(min-width:\s*(\d+)px\)/g)].map(
      (m) => Number(m[1]),
    );
    const seamBreakpoints = found.filter((w) =>
      (PROFILE_SEAM_MEDIA_MIN_WIDTHS as readonly number[]).includes(w),
    );
    expect(seamBreakpoints).toEqual([...PROFILE_SEAM_MEDIA_MIN_WIDTHS]);
  });
});

describe('layout contracts: global content width (CSS ↔ e2e/constants.ts)', () => {
  const css = readRepoFile('src/styles/global.css');

  it('--content-min-width and --content-width match e2e ch constants', () => {
    expect(cssCustomProp(css, '--content-min-width')).toBe(
      `${MIN_CONTENT_WIDTH_CH}ch`,
    );
    expect(cssCustomProp(css, '--content-width')).toBe(
      `${MAX_CONTENT_WIDTH_CH}ch`,
    );
  });
});

describe('layout contracts: why layout (constants ↔ Astro ↔ why-box-scroll ↔ e2e)', () => {
  it('WhyContent.astro sets CTA horizontal from WHY_CTA_BOX_WIDTH_FRAC', () => {
    const astro = readRepoFile('src/components/WhyContent.astro');
    expect(astro).toContain(
      "'--why-cta-horizontal': `${WHY_CTA_BOX_WIDTH_FRAC * 100}%`",
    );
    expect(WHY_CTA_BOX_WIDTH_FRAC).toBe(0.5);
  });

  it('e2e/constants re-exports match src/constants/why-layout.ts', () => {
    expect(WHY_CTA_ARROW_PEAK_OPACITY).toBe(0.47);
    expect(WHY_CTA_ARROW_FLOOR_OPACITY).toBe(0.08);
  });

  it('CTA veil px literals match e2e/constants.ts and why-box-scroll.ts', () => {
    expect(whyBoxScrollLiteral('CTA_VEIL_CLEARANCE_BELOW_LEAD_PX')).toBe(
      WHY_CTA_VEIL_CLEARANCE_BELOW_LEAD_PX,
    );
    expect(whyBoxScrollLiteral('CTA_VEIL_MIN_GAP_ABOVE_ARROW_PX')).toBe(
      WHY_CTA_VEIL_MIN_GAP_ABOVE_ARROW_PX,
    );
  });

  it('FIT_FAIL lock padding matches why-box-scroll (e2e viewport is documented intent)', () => {
    expect(whyBoxScrollLiteral('FIT_FAIL_LOCK_PADDING_PX')).toBe(6);
    expect(whyBoxScrollLiteral('FIT_FAIL_FRAMES')).toBe(4);
    expect(WHY_FIT_FAIL_LOCK_VIEWPORT_WIDTH).toBe(400);
  });
});

describe('layout contracts: profile reveal (TS ↔ CSS calc)', () => {
  it('profile.css uses REVEAL_RIGHT_MARGIN_RATIO_MIN in reveal inset calc', () => {
    const css = readRepoFile('src/styles/profile.css');
    expect(css).toContain(`* ${REVEAL_RIGHT_MARGIN_RATIO_MIN}`);
    expect(REVEAL_RIGHT_MARGIN_RATIO_MIN).toBe(1.02);
    expect(REVEAL_RIGHT_RENDER_PAD_PX).toBe(1);
    expect(REVEAL_RIGHT_MARGIN_FIT_EPSILON_PX).toBe(0.5);
    expect(REVEAL_PADDING_RATIO_ASSERT_TOLERANCE_PX).toBe(0.5);
  });
});
