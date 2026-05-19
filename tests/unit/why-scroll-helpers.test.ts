import { describe, expect, it } from 'vitest';
import {
  computeEndPhase,
  edgeVeilEndHeightPx,
  edgeVeilHeightPx,
  quantizeRevolverNormalized,
  viewportCenterContentYStable,
} from '../../src/scripts/why-scroll-helpers';

describe('quantizeRevolverNormalized', () => {
  it('rounds to 1/40 steps', () => {
    expect(quantizeRevolverNormalized(0.512)).toBe(0.5);
    expect(quantizeRevolverNormalized(0.5375)).toBe(0.55);
  });

  it('passes through non-finite values', () => {
    expect(quantizeRevolverNormalized(Number.NaN)).toBeNaN();
    expect(quantizeRevolverNormalized(Number.POSITIVE_INFINITY)).toBe(
      Number.POSITIVE_INFINITY,
    );
  });
});

describe('viewportCenterContentYStable', () => {
  it('rounds scrollTop and clientHeight before centering', () => {
    expect(viewportCenterContentYStable(100.4, 799.6)).toBe(100 + 400);
  });
});

describe('edgeVeilHeightPx', () => {
  it('matches clamp(130px, 22vh, 230px)', () => {
    expect(edgeVeilHeightPx(400)).toBe(130);
    expect(edgeVeilHeightPx(590)).toBe(130);
    expect(edgeVeilHeightPx(1000)).toBe(220);
    expect(edgeVeilHeightPx(1046)).toBe(230);
  });
});

describe('edgeVeilEndHeightPx', () => {
  it('matches clamp(42px, 8vh, 86px)', () => {
    expect(edgeVeilEndHeightPx(400)).toBe(42);
    expect(edgeVeilEndHeightPx(800)).toBe(64);
    expect(edgeVeilEndHeightPx(1200)).toBe(86);
  });
});

describe('computeEndPhase', () => {
  it('is zero when maxScroll is zero', () => {
    expect(computeEndPhase(100, 500, 0, 70, 0.22)).toBe(0);
  });

  it('ramps up in the end cover band', () => {
    const clientHeight = 500;
    const endBandMin = 70;
    const endBandFrac = 0.22;
    const coverBandPx = Math.max(endBandMin, clientHeight * endBandFrac);
    const maxScroll = 2000;
    const atStart = computeEndPhase(
      maxScroll - coverBandPx,
      clientHeight,
      maxScroll,
      endBandMin,
      endBandFrac,
    );
    const atEnd = computeEndPhase(
      maxScroll,
      clientHeight,
      maxScroll,
      endBandMin,
      endBandFrac,
    );
    expect(atStart).toBe(0);
    expect(atEnd).toBe(1);
  });
});
