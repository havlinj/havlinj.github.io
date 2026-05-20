import { describe, expect, it } from 'vitest';
import {
  advanceWhyFitFailStreak,
  computeWhyFitOverflowPx,
  nextRevolverIdleStreak,
  resolveWhyRuntimeMinWidthLockPx,
  revolverIdleAfterFrames,
} from '../../src/utils/why-fit-runtime-math';

describe('why-fit-runtime-math', () => {
  it('computeWhyFitOverflowPx matches probe − (content + safety)', () => {
    expect(computeWhyFitOverflowPx(100, 90, 1)).toBe(9);
    expect(computeWhyFitOverflowPx(90, 90, 1)).toBe(-1);
  });

  it('advanceWhyFitFailStreak resets when no overflow', () => {
    expect(advanceWhyFitFailStreak(3, false)).toBe(0);
    expect(advanceWhyFitFailStreak(3, true)).toBe(4);
  });

  it('resolveWhyRuntimeMinWidthLockPx preserves existing lock', () => {
    expect(
      resolveWhyRuntimeMinWidthLockPx({
        currentLockPx: 400,
        failStreak: 0,
        failFramesThreshold: 4,
        boxWidth: 100,
        lockPaddingPx: 6,
      }),
    ).toBe(400);
  });

  it('resolveWhyRuntimeMinWidthLockPx applies after streak threshold', () => {
    expect(
      resolveWhyRuntimeMinWidthLockPx({
        currentLockPx: 0,
        failStreak: 4,
        failFramesThreshold: 4,
        boxWidth: 399.2,
        lockPaddingPx: 6,
      }),
    ).toBe(406);
  });

  it('resolveWhyRuntimeMinWidthLockPx returns 0 when box width unknown', () => {
    expect(
      resolveWhyRuntimeMinWidthLockPx({
        currentLockPx: 0,
        failStreak: 10,
        failFramesThreshold: 4,
        boxWidth: 0,
        lockPaddingPx: 6,
      }),
    ).toBe(0);
  });

  it('revolver idle streak and gate match why-box-scroll semantics', () => {
    expect(nextRevolverIdleStreak(2, true)).toBe(3);
    expect(nextRevolverIdleStreak(2, false)).toBe(0);
    expect(revolverIdleAfterFrames(false, 5, 3)).toBe(false);
    expect(revolverIdleAfterFrames(true, 2, 3)).toBe(false);
    expect(revolverIdleAfterFrames(true, 3, 3)).toBe(true);
  });
});
