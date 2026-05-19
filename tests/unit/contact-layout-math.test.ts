import { describe, expect, it } from 'vitest';
import { CONTACT_LAYOUT } from '../../src/constants/contact-layout';
import {
  computeIntroLinksGapPx,
  computeMinFontPx,
} from '../../src/utils/contact-layout-math';

describe('computeIntroLinksGapPx', () => {
  it('never goes below introLinksGapMinPx', () => {
    expect(computeIntroLinksGapPx(0, 0)).toBe(
      CONTACT_LAYOUT.introLinksGapMinPx,
    );
  });

  it('picks intro-height ratio when it is tighter than panel ratio', () => {
    // 200 * 0.74 = 148, 400 * 0.072 = 28.8 → min = 28.8, above min 32 → 32
    expect(computeIntroLinksGapPx(200, 400)).toBe(32);
  });

  it('picks panel-edge ratio when it is tighter than intro height', () => {
    // 80 * 0.74 = 59.2, 500 * 0.072 = 36 → min = 36
    expect(computeIntroLinksGapPx(80, 500)).toBe(36);
  });

  it('caps at panel ratio when intro block is tall', () => {
    const panelEdge = 500;
    const fromPanel = panelEdge * CONTACT_LAYOUT.introLinksGapPanelRatio;
    expect(computeIntroLinksGapPx(10_000, panelEdge)).toBe(
      Math.round(fromPanel),
    );
  });
});

describe('computeMinFontPx', () => {
  it('returns max band at large panel edges', () => {
    expect(computeMinFontPx(CONTACT_LAYOUT.minFontEdgeHi)).toBe(
      CONTACT_LAYOUT.minFontPx,
    );
    expect(computeMinFontPx(900)).toBe(CONTACT_LAYOUT.minFontPx);
  });

  it('returns small band at tiny panel edges', () => {
    expect(computeMinFontPx(CONTACT_LAYOUT.minFontEdgeLo)).toBe(
      CONTACT_LAYOUT.minFontPxSmall,
    );
    expect(computeMinFontPx(1)).toBe(CONTACT_LAYOUT.minFontPxSmall);
  });

  it('linearly interpolates between lo and hi edges', () => {
    const lo = CONTACT_LAYOUT.minFontEdgeLo;
    const hi = CONTACT_LAYOUT.minFontEdgeHi;
    const mid = (lo + hi) / 2;
    const expected =
      CONTACT_LAYOUT.minFontPxSmall +
      ((CONTACT_LAYOUT.minFontPx - CONTACT_LAYOUT.minFontPxSmall) *
        (mid - lo)) /
        (hi - lo);
    expect(computeMinFontPx(mid)).toBeCloseTo(expected, 10);
  });
});
