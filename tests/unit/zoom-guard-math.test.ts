import { describe, expect, it } from 'vitest';
import { ZOOM_SIGNAL_STABLE_MAX } from '../../src/utils/zoom-signals';
import {
  ZOOM_GUARD_EXIT_HYSTERESIS,
  ZOOM_GUARD_FREEZE_ENTER_RATIO,
  ZOOM_GUARD_MAX_SAFE_ZOOM,
  ZOOM_GUARD_OVERFLOW_HEAL_THRESHOLD,
  ZOOM_GUARD_VEIL_ARM_RATIO,
  ZOOM_GUARD_VEIL_LOOKAHEAD,
  ZOOM_GUARD_WARM_CANCEL_RATIO,
  computeOverflowHealScale,
  computeTargetFreezeScale,
  isAbsurdStoredBaselineInnerWidth,
  shouldApplyOverflowHeal,
  shouldArmFreezeVeil,
  shouldShowFreezeVeil,
  shouldCancelWarmStart,
  shouldKeepFreeze,
} from '../../src/utils/zoom-guard-math';

describe('shouldKeepFreeze', () => {
  it('enters freeze only after the enter threshold, not at max-safe', () => {
    expect(ZOOM_GUARD_FREEZE_ENTER_RATIO).toBeLessThan(
      ZOOM_GUARD_MAX_SAFE_ZOOM,
    );
    expect(
      shouldKeepFreeze({
        ratio: ZOOM_GUARD_FREEZE_ENTER_RATIO,
        freezeActive: false,
        healLockFrames: 0,
      }),
    ).toBe(false);
    expect(
      shouldKeepFreeze({
        ratio: ZOOM_GUARD_FREEZE_ENTER_RATIO + 0.001,
        freezeActive: false,
        healLockFrames: 0,
      }),
    ).toBe(true);
    expect(
      shouldKeepFreeze({
        ratio: 2.14,
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
  it('stays 1 between freeze-enter and max-safe (no shrink until past the wall)', () => {
    expect(computeTargetFreezeScale(ZOOM_GUARD_FREEZE_ENTER_RATIO + 0.01)).toBe(
      1,
    );
    expect(computeTargetFreezeScale(ZOOM_GUARD_MAX_SAFE_ZOOM)).toBe(1);
    expect(
      computeTargetFreezeScale(ZOOM_GUARD_MAX_SAFE_ZOOM + 0.01),
    ).toBeLessThan(1);
  });

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
    expect(
      computeOverflowHealScale(800, 900, ZOOM_GUARD_OVERFLOW_HEAL_THRESHOLD),
    ).toBe(null);
  });

  it('returns width ratio when clearly overflowing', () => {
    const s = computeOverflowHealScale(
      400,
      800,
      ZOOM_GUARD_OVERFLOW_HEAL_THRESHOLD,
    );
    expect(s).toBeCloseTo(0.5, 3);
  });
});

describe('isAbsurdStoredBaselineInnerWidth', () => {
  it('detects e2e stale baseline innerWidth 3000 at 900px window', () => {
    expect(isAbsurdStoredBaselineInnerWidth(3000, 900)).toBe(true);
  });

  it('does not flag normal desktop baseline with aggressive resize', () => {
    expect(isAbsurdStoredBaselineInnerWidth(1200, 400)).toBe(false);
    expect(isAbsurdStoredBaselineInnerWidth(1920, 900)).toBe(false);
  });
});

describe('shouldArmFreezeVeil', () => {
  it('arms from current ratio at the veil threshold', () => {
    expect(ZOOM_GUARD_VEIL_ARM_RATIO).toBeLessThan(
      ZOOM_GUARD_FREEZE_ENTER_RATIO,
    );
    expect(
      shouldArmFreezeVeil({
        freezeActive: false,
        freezeSettling: false,
        lastPublishedRatio: 1,
        currentRatio: ZOOM_GUARD_VEIL_ARM_RATIO,
      }),
    ).toBe(true);
    expect(
      shouldArmFreezeVeil({
        freezeActive: false,
        freezeSettling: false,
        lastPublishedRatio: 1,
        currentRatio: ZOOM_GUARD_VEIL_ARM_RATIO - 0.01,
      }),
    ).toBe(false);
  });

  it('arms from last published ratio one lookahead tick early', () => {
    expect(
      shouldArmFreezeVeil({
        freezeActive: false,
        freezeSettling: false,
        lastPublishedRatio:
          ZOOM_GUARD_VEIL_ARM_RATIO - ZOOM_GUARD_VEIL_LOOKAHEAD,
        currentRatio: 1.5,
      }),
    ).toBe(true);
    expect(
      shouldArmFreezeVeil({
        freezeActive: false,
        freezeSettling: false,
        lastPublishedRatio:
          ZOOM_GUARD_VEIL_ARM_RATIO - ZOOM_GUARD_VEIL_LOOKAHEAD - 0.01,
        currentRatio: 1.5,
      }),
    ).toBe(false);
  });

  it('does not arm while already frozen or settling', () => {
    expect(
      shouldArmFreezeVeil({
        freezeActive: true,
        freezeSettling: false,
        lastPublishedRatio: 3,
        currentRatio: 3,
      }),
    ).toBe(false);
    expect(
      shouldArmFreezeVeil({
        freezeActive: false,
        freezeSettling: true,
        lastPublishedRatio: 3,
        currentRatio: 3,
      }),
    ).toBe(false);
  });
});

describe('shouldShowFreezeVeil', () => {
  it('does not cover the page at rest, including the approach band', () => {
    expect(
      shouldShowFreezeVeil({ freezeSettling: false }),
    ).toBe(false);
  });

  it('covers freeze-pending, then hides after freeze has settled', () => {
    expect(
      shouldShowFreezeVeil({ freezeSettling: true }),
    ).toBe(true);
    expect(
      shouldShowFreezeVeil({ freezeSettling: false }),
    ).toBe(false);
  });
});

describe('shouldApplyOverflowHeal', () => {
  it('is false while freeze is already active', () => {
    expect(shouldApplyOverflowHeal({ freezeActive: true, zoomRatio: 1 })).toBe(
      false,
    );
  });

  it('is false during page or pinch zoom', () => {
    expect(
      shouldApplyOverflowHeal({ freezeActive: false, zoomRatio: 1.5 }),
    ).toBe(false);
  });

  it('is true only when unfrozen and zoom is still ~1 (same ceiling as signal stable-max)', () => {
    expect(shouldApplyOverflowHeal({ freezeActive: false, zoomRatio: 1 })).toBe(
      true,
    );
    expect(
      shouldApplyOverflowHeal({
        freezeActive: false,
        zoomRatio: ZOOM_SIGNAL_STABLE_MAX,
      }),
    ).toBe(true);
    expect(
      shouldApplyOverflowHeal({
        freezeActive: false,
        zoomRatio: ZOOM_SIGNAL_STABLE_MAX + 0.001,
      }),
    ).toBe(false);
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
