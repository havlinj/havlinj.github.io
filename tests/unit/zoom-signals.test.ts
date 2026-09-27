import { describe, expect, it } from 'vitest';
import {
  ZOOM_GUARD_MAX_SAFE_ZOOM,
  shouldKeepFreeze,
} from '../../src/utils/zoom-guard-math';
import {
  computeDprPageZoom,
  computeEffectiveZoomRatio,
  computePinchRatio,
  computeWindowChromePageZoom,
  shouldResetZoomFreezeBaseline,
  type ZoomViewportSnapshot,
} from '../../src/utils/zoom-signals';

const DESKTOP: ZoomViewportSnapshot = {
  dpr: 1,
  vvScale: 1,
  innerWidth: 1200,
  outerWidth: 1400,
};

type Case = {
  name: string;
  baseline?: ZoomViewportSnapshot;
  current: ZoomViewportSnapshot;
  ratio: number;
  reset: boolean;
  freeze: boolean;
};

const CASES: readonly Case[] = [
  {
    name: 'stable desktop',
    current: DESKTOP,
    ratio: 1,
    reset: false,
    freeze: false,
  },
  {
    name: 'Chrome/Firefox Ctrl+/- 300% (DPR tracks, outer stays)',
    current: { dpr: 3, vvScale: 1, innerWidth: 400, outerWidth: 1400 },
    ratio: 3,
    reset: false,
    freeze: true,
  },
  {
    name: 'Safari Cmd+/- 300% (DPR static, outer stays)',
    current: { dpr: 1, vvScale: 1, innerWidth: 400, outerWidth: 1400 },
    ratio: 3,
    reset: false,
    freeze: true,
  },
  {
    name: 'window squeeze desktop→phone (outer and inner shrink, chrome holds)',
    current: { dpr: 1, vvScale: 1, innerWidth: 390, outerWidth: 590 },
    ratio: 1,
    reset: true,
    freeze: false,
  },
  {
    name: 'Playwright-like squeeze (outerWidth === innerWidth)',
    baseline: { dpr: 1, vvScale: 1, innerWidth: 1200, outerWidth: 1200 },
    current: { dpr: 1, vvScale: 1, innerWidth: 360, outerWidth: 360 },
    ratio: 1,
    reset: true,
    freeze: false,
  },
  {
    name: 'Playwright-like page zoom (inner mocked, outer unchanged)',
    baseline: { dpr: 1, vvScale: 1, innerWidth: 1200, outerWidth: 1200 },
    current: { dpr: 1, vvScale: 1, innerWidth: 400, outerWidth: 1200 },
    ratio: 3,
    reset: false,
    freeze: true,
  },
  {
    name: 'pinch 3× at same window size',
    current: { dpr: 1, vvScale: 3, innerWidth: 1200, outerWidth: 1400 },
    ratio: 3,
    reset: false,
    freeze: true,
  },
  {
    name: 'display scale 1→2 at same window (DPR-up is zoom-in, not a reset)',
    current: { dpr: 2, vvScale: 1, innerWidth: 1200, outerWidth: 1400 },
    ratio: 1,
    reset: false,
    freeze: false,
  },
  {
    name: 'window expand',
    current: { dpr: 1, vvScale: 1, innerWidth: 1600, outerWidth: 1800 },
    ratio: 1,
    reset: true,
    freeze: false,
  },
  {
    name: 'Chrome 150% stays under freeze threshold',
    current: { dpr: 1.5, vvScale: 1, innerWidth: 800, outerWidth: 1400 },
    ratio: 1.5,
    reset: false,
    freeze: false,
  },
  {
    name: 'Chrome 210% still below freeze-enter (2.15)',
    current: { dpr: 2.1, vvScale: 1, innerWidth: 571, outerWidth: 1400 },
    ratio: 1200 / 571,
    reset: false,
    freeze: false,
  },
  {
    name: 'Chrome 220% past freeze-enter, still under max-safe',
    current: { dpr: 2.2, vvScale: 1, innerWidth: 545, outerWidth: 1400 },
    ratio: 1200 / 545,
    reset: false,
    freeze: true,
  },
  {
    name: 'fast Ctrl-wheel first tick: DPR jumps, innerWidth unchanged (must not recapture)',
    current: { dpr: 2.5, vvScale: 1, innerWidth: 1200, outerWidth: 1400 },
    ratio: 1,
    reset: false,
    freeze: false,
  },
  {
    name: 'step zoom-out still extreme (300%→250%)',
    current: { dpr: 2.5, vvScale: 1, innerWidth: 480, outerWidth: 1400 },
    ratio: 2.5,
    reset: false,
    freeze: true,
  },
];

describe('zoom signals (cross-browser decision table)', () => {
  it.each(CASES)('$name', ({ baseline, current, ratio, reset, freeze }) => {
    const from = baseline ?? DESKTOP;
    expect(computeEffectiveZoomRatio(from, current)).toBeCloseTo(ratio, 5);
    expect(shouldResetZoomFreezeBaseline(from, current)).toBe(reset);
    expect(
      shouldKeepFreeze({
        ratio: computeEffectiveZoomRatio(from, current),
        freezeActive: false,
        healLockFrames: 0,
        maxSafe: ZOOM_GUARD_MAX_SAFE_ZOOM,
      }),
    ).toBe(freeze);
  });
});

describe('zoom signal pieces', () => {
  it('pinch ignores Ctrl-style innerWidth shrink', () => {
    expect(
      computePinchRatio(DESKTOP, {
        ...DESKTOP,
        innerWidth: 400,
      }),
    ).toBe(1);
  });

  it('window-chrome zoom sees Safari Cmd+/-; DPR zoom does not', () => {
    const safariZoom: ZoomViewportSnapshot = {
      dpr: 1,
      vvScale: 1,
      innerWidth: 400,
      outerWidth: 1400,
    };
    expect(computeWindowChromePageZoom(DESKTOP, safariZoom)).toBeCloseTo(3, 5);
    expect(computeDprPageZoom(DESKTOP, safariZoom)).toBe(1);
  });

  it('DPR zoom ignores monitor change at the same innerWidth', () => {
    expect(computeDprPageZoom(DESKTOP, { ...DESKTOP, dpr: 2 })).toBe(1);
  });

  it('outerWidth jitter at the same innerWidth is not page zoom', () => {
    expect(
      computeWindowChromePageZoom(DESKTOP, {
        ...DESKTOP,
        outerWidth: 2200,
      }),
    ).toBe(1);
  });

  it('unusable outerWidth does not invent page zoom (iframe / missing chrome)', () => {
    const noOuter: ZoomViewportSnapshot = {
      dpr: 1,
      vvScale: 1,
      innerWidth: 1200,
      outerWidth: 0,
    };
    expect(
      computeWindowChromePageZoom(noOuter, {
        ...noOuter,
        innerWidth: 400,
      }),
    ).toBe(1);
  });
});
