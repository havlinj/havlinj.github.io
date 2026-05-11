import { describe, expect, it } from 'vitest';
import {
  ZOOM_GUARD_EXIT_HYSTERESIS,
  ZOOM_GUARD_MAX_SAFE_ZOOM,
  ZOOM_GUARD_OVERFLOW_HEAL_THRESHOLD,
  ZOOM_GUARD_WARM_CANCEL_RATIO,
  computeOverflowHealScale,
  computeTargetFreezeScale,
  computeZoomRatio,
  shouldCancelWarmStart,
  shouldKeepFreeze,
} from '../../src/utils/zoom-guard-math';

describe('computeZoomRatio', () => {
  it('uses max of vv, dpr, and innerWidth ratio', () => {
    const r = computeZoomRatio({
      baselineDpr: 1,
      baselineVvScale: 1,
      baselineInnerWidth: 1200,
      currentDpr: 1,
      currentVvScale: 1,
      currentInnerWidth: 400,
    });
    expect(r).toBeCloseTo(3, 5);
  });

  it('treats vv scale 0 as 1 for ratio branches', () => {
    const r = computeZoomRatio({
      baselineDpr: 1,
      baselineVvScale: 1,
      baselineInnerWidth: 800,
      currentDpr: 1,
      currentVvScale: 0,
      currentInnerWidth: 800,
    });
    expect(r).toBe(1);
  });
});

describe('shouldKeepFreeze', () => {
  it('enters freeze when ratio exceeds max and not active', () => {
    expect(
      shouldKeepFreeze({
        ratio: 2.4,
        freezeActive: false,
        healLockFrames: 0,
      }),
    ).toBe(true);
    expect(
      shouldKeepFreeze({
        ratio: 2.29,
        freezeActive: false,
        healLockFrames: 0,
      }),
    ).toBe(false);
  });

  it('uses hysteresis when already frozen', () => {
    const max = ZOOM_GUARD_MAX_SAFE_ZOOM;
    const h = ZOOM_GUARD_EXIT_HYSTERESIS;
    expect(
      shouldKeepFreeze({
        ratio: max - h * 0.5,
        freezeActive: true,
        healLockFrames: 0,
      }),
    ).toBe(true);
    expect(
      shouldKeepFreeze({
        ratio: max - h * 1.1,
        freezeActive: true,
        healLockFrames: 0,
      }),
    ).toBe(false);
  });

  it('forces stay-frozen while heal lock is active', () => {
    expect(
      shouldKeepFreeze({
        ratio: 1,
        freezeActive: false,
        healLockFrames: 2,
      }),
    ).toBe(true);
  });
});

describe('computeTargetFreezeScale', () => {
  it('clamps to MAX_SAFE_ZOOM / ratio', () => {
    expect(computeTargetFreezeScale(4.6)).toBeCloseTo(0.5, 5);
    expect(computeTargetFreezeScale(2.3)).toBe(1);
  });

  it('floors at 0.1 for extreme ratio', () => {
    expect(computeTargetFreezeScale(100)).toBe(0.1);
  });
});

describe('computeOverflowHealScale', () => {
  it('returns null when within threshold', () => {
    expect(computeOverflowHealScale(800, 900, ZOOM_GUARD_OVERFLOW_HEAL_THRESHOLD)).toBe(
      null,
    );
  });

  it('returns width ratio when clearly overflowing', () => {
    const s = computeOverflowHealScale(400, 800, ZOOM_GUARD_OVERFLOW_HEAL_THRESHOLD);
    expect(s).toBeCloseTo(0.5, 3);
  });
});

describe('shouldCancelWarmStart', () => {
  it('is true above warm-cancel factor of max safe zoom', () => {
    expect(
      shouldCancelWarmStart(
        ZOOM_GUARD_MAX_SAFE_ZOOM * ZOOM_GUARD_WARM_CANCEL_RATIO + 0.01,
      ),
    ).toBe(true);
    expect(
      shouldCancelWarmStart(
        ZOOM_GUARD_MAX_SAFE_ZOOM * ZOOM_GUARD_WARM_CANCEL_RATIO - 0.001,
      ),
    ).toBe(false);
  });
});
