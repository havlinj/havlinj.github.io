/**
 * Pure fragments of `/why` font-fit + main min-width lock (see why-box-scroll.ts).
 * Keep formulas identical when touching the runtime script.
 */

/** Positive when the fit probe is wider than column budget (+ safety). */
export function computeWhyFitOverflowPx(
  probeWidthPx: number,
  contentWidthPx: number,
  lockSafetyPx: number,
): number {
  return probeWidthPx - (contentWidthPx + lockSafetyPx);
}

export function advanceWhyFitFailStreak(
  prevStreak: number,
  hasOverflow: boolean,
): number {
  return hasOverflow ? prevStreak + 1 : 0;
}

/**
 * Once `currentLockPx` is set it is never recomputed here (caller owns persistence).
 */
export function resolveWhyRuntimeMinWidthLockPx(opts: {
  currentLockPx: number;
  failStreak: number;
  failFramesThreshold: number;
  boxWidth: number;
  lockPaddingPx: number;
}): number {
  if (opts.currentLockPx > 0) return opts.currentLockPx;
  if (opts.failStreak < opts.failFramesThreshold || opts.boxWidth <= 0) {
    return 0;
  }
  return Math.ceil(opts.boxWidth) + opts.lockPaddingPx;
}

export function nextRevolverIdleStreak(prev: number, rawIdle: boolean): number {
  return rawIdle ? prev + 1 : 0;
}

export function revolverIdleAfterFrames(
  hasAppliedOnce: boolean,
  idleStreak: number,
  requiredFrames: number,
): boolean {
  return hasAppliedOnce && idleStreak >= requiredFrames;
}
