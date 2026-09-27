/** Sync with `src/scripts/zoom-guard-init.ts` / Layout zoom guard. */
export const ZOOM_GUARD_MAX_SAFE_ZOOM = 2.3;
export const ZOOM_GUARD_EXIT_HYSTERESIS = 0.15;
/** Enter freeze a little before max-safe so a fast wheel tick cannot skip the wall. */
export const ZOOM_GUARD_FREEZE_ENTER_RATIO = 2.15;
/** Cover the page before the first unfrozen paint past this ratio. */
export const ZOOM_GUARD_VEIL_ARM_RATIO = 2.0;
/** Arm one Ctrl-wheel tick early so the veil can cover the next paint. */
export const ZOOM_GUARD_VEIL_LOOKAHEAD = 0.25;
export const ZOOM_FREEZE_VEIL_CLASS = 'zoom-freeze-veil-active';
export const ZOOM_FREEZE_PENDING_CLASS = 'zoom-freeze-pending';
/** Warm-start is skipped when ratio exceeds this factor of max safe zoom. */
export const ZOOM_GUARD_WARM_CANCEL_RATIO = 1.05;
/** Document scrollWidth vs innerWidth — overflow self-heal when unfrozen. */
export const ZOOM_GUARD_OVERFLOW_HEAL_THRESHOLD = 1.22;

/**
 * Tampered or impossible sessionStorage baseline (e.g. innerWidth: 3000 on a ~900px window).
 * Must not drive zoom ratio into false freeze; reset baseline from current view instead.
 * Sync with e2e: `zoom guard does not freeze from stale stored baseline alone`.
 */
export const ZOOM_GUARD_ABSURD_BASELINE_INNER_WIDTH_MIN = 2600;
export const ZOOM_GUARD_ABSURD_BASELINE_WIDTH_FACTOR = 2.2;

export function isAbsurdStoredBaselineInnerWidth(
  baselineInnerWidth: number,
  innerWidthNow: number,
): boolean {
  return (
    baselineInnerWidth >= ZOOM_GUARD_ABSURD_BASELINE_INNER_WIDTH_MIN &&
    baselineInnerWidth >
      innerWidthNow * ZOOM_GUARD_ABSURD_BASELINE_WIDTH_FACTOR &&
    innerWidthNow >= 400
  );
}

export function shouldArmFreezeVeil(opts: {
  freezeActive: boolean;
  freezeSettling: boolean;
  lastPublishedRatio: number;
  currentRatio: number;
  armRatio?: number;
  lookahead?: number;
}): boolean {
  if (opts.freezeActive || opts.freezeSettling) return false;
  const arm = opts.armRatio ?? ZOOM_GUARD_VEIL_ARM_RATIO;
  const look = opts.lookahead ?? ZOOM_GUARD_VEIL_LOOKAHEAD;
  return opts.lastPublishedRatio >= arm - look || opts.currentRatio >= arm;
}

export function shouldShowFreezeVeil(opts: {
  freezeSettling: boolean;
}): boolean {
  return opts.freezeSettling;
}

export function shouldKeepFreeze(opts: {
  ratio: number;
  freezeActive: boolean;
  healLockFrames: number;
  maxSafe?: number;
  hysteresis?: number;
  enterRatio?: number;
}): boolean {
  const max = opts.maxSafe ?? ZOOM_GUARD_MAX_SAFE_ZOOM;
  const hys = opts.hysteresis ?? ZOOM_GUARD_EXIT_HYSTERESIS;
  const enter = opts.enterRatio ?? ZOOM_GUARD_FREEZE_ENTER_RATIO;
  if (opts.healLockFrames > 0) return true;
  if (!opts.freezeActive) return opts.ratio > enter;
  return opts.ratio > max - hys;
}

export function computeTargetFreezeScale(
  ratio: number,
  maxSafe = ZOOM_GUARD_MAX_SAFE_ZOOM,
): number {
  return Math.max(0.1, Math.min(1, maxSafe / ratio));
}

/** Returns heal scale or null when overflow is not bad enough. */
export function computeOverflowHealScale(
  innerWidth: number,
  scrollWidth: number,
  threshold = ZOOM_GUARD_OVERFLOW_HEAL_THRESHOLD,
): number | null {
  const iw = innerWidth || 1;
  const sw = scrollWidth || iw;
  if (sw <= iw * threshold) return null;
  return Math.min(1, Math.max(0.12, iw / sw));
}

/** Overflow heal is a last resort when zoom is ~1. Never during page/pinch zoom. */
export function shouldApplyOverflowHeal(opts: {
  freezeActive: boolean;
  zoomRatio: number;
  stableMax?: number;
}): boolean {
  if (opts.freezeActive) return false;
  const stable = opts.stableMax ?? 1.12;
  return opts.zoomRatio <= stable;
}

export function shouldCancelWarmStart(
  ratio: number,
  maxSafe = ZOOM_GUARD_MAX_SAFE_ZOOM,
  factor = ZOOM_GUARD_WARM_CANCEL_RATIO,
): boolean {
  return ratio > maxSafe * factor;
}
