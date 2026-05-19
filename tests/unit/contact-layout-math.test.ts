import { describe, expect, it } from 'vitest';
import { CONTACT_LAYOUT } from '../../src/constants/contact-layout';
import {
  applyContactFitPasses,
  computeDesiredFontPx,
  computeIntroLinksGapPx,
  computeMinFontPx,
  resolveContactFluidFontPx,
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

describe('computeDesiredFontPx', () => {
  it('scales linearly with edge above small-panel breakpoint', () => {
    const edge = 600;
    const ref = CONTACT_LAYOUT.fontBaselineReferenceEdgePx;
    const expected = Math.min(
      CONTACT_LAYOUT.maxFontPx,
      Math.max(
        computeMinFontPx(edge),
        (edge * CONTACT_LAYOUT.baselineFontPx) / ref,
      ),
    );
    expect(computeDesiredFontPx(edge)).toBeCloseTo(expected, 5);
  });

  it('applies small/tiny/micro dampers on narrow squares', () => {
    const micro = CONTACT_LAYOUT.microPanelEdgePx;
    const ref = CONTACT_LAYOUT.fontBaselineReferenceEdgePx;
    let expected = (micro * CONTACT_LAYOUT.baselineFontPx) / ref;
    expected *= CONTACT_LAYOUT.smallPanelFontScale;
    expected *= CONTACT_LAYOUT.tinyPanelFontExtraScale;
    expected *= CONTACT_LAYOUT.microPanelFontExtraScale;
    const minPx = computeMinFontPx(micro);
    expected = Math.min(CONTACT_LAYOUT.maxFontPx, Math.max(minPx, expected));
    expect(computeDesiredFontPx(micro)).toBeCloseTo(expected, 5);
  });

  it('never exceeds maxFontPx', () => {
    expect(computeDesiredFontPx(10_000)).toBe(CONTACT_LAYOUT.maxFontPx);
  });
});

describe('resolveContactFluidFontPx', () => {
  it('uses curve on narrow panels regardless of CSS font', () => {
    const edge = CONTACT_LAYOUT.curveFontBaselineEdgePx;
    expect(resolveContactFluidFontPx(edge, 22)).toBe(
      computeDesiredFontPx(edge),
    );
  });

  it('keeps inherited CSS font on wide panels when valid', () => {
    const edge = CONTACT_LAYOUT.curveFontBaselineEdgePx + 100;
    expect(resolveContactFluidFontPx(edge, 16.5)).toBe(16.5);
  });

  it('falls back to curve when CSS font is invalid on wide panels', () => {
    const edge = 800;
    expect(resolveContactFluidFontPx(edge, Number.NaN)).toBe(
      computeDesiredFontPx(edge),
    );
  });
});

describe('applyContactFitPasses', () => {
  it('reduces overflow when remeasured size scales with font', () => {
    const panelEdge = 500;
    const avail = panelEdge;
    const initialW = avail * 1.1;
    const widthPerFontPx = initialW / 16;
    const result = applyContactFitPasses({
      panelEdge,
      desiredFontPx: 16,
      neededWidth: initialW,
      neededHeight: avail,
      measureAtFont: (fontPx) => ({
        neededWidth: widthPerFontPx * fontPx,
        neededHeight: avail,
      }),
    });
    expect(result.neededWidth).toBeLessThan(initialW);
    expect(result.desiredFontPx).toBeLessThan(16);
  });

  it('shrinks font when remeasured size stays oversized', () => {
    const panelEdge = 400;
    const avail = panelEdge * CONTACT_LAYOUT.insetMaxRatio;
    const result = applyContactFitPasses({
      panelEdge,
      desiredFontPx: 16,
      neededWidth: avail + 50,
      neededHeight: avail + 50,
      measureAtFont: () => ({
        neededWidth: avail + 50,
        neededHeight: avail + 50,
      }),
    });
    expect(result.desiredFontPx).toBeLessThan(16);
    expect(result.neededWidth).toBeGreaterThan(avail);
  });

  it('stops after maxFitPasses even if still overflowing', () => {
    const panelEdge = 300;
    const avail = panelEdge;
    const result = applyContactFitPasses({
      panelEdge,
      desiredFontPx: 20,
      neededWidth: avail * 2,
      neededHeight: avail * 2,
      measureAtFont: () => ({
        neededWidth: avail * 2,
        neededHeight: avail * 2,
      }),
    });
    expect(result.neededWidth).toBeGreaterThan(avail);
    expect(result.desiredFontPx).toBeLessThan(20);
  });
});
