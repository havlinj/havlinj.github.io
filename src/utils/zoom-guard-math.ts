/** Sync with `src/scripts/zoom-guard-init.ts` / Layout zoom guard. */
export const ZOOM_GUARD_MAX_SAFE_ZOOM = 2.3;
export const ZOOM_GUARD_EXIT_HYSTERESIS = 0.15;
/** Warm-start is skipped when ratio exceeds this factor of max safe zoom. */
export const ZOOM_GUARD_WARM_CANCEL_RATIO = 1.05;
/** Document scrollWidth vs innerWidth — overflow self-heal when unfrozen. */
export const ZOOM_GUARD_OVERFLOW_HEAL_THRESHOLD = 1.22;

export type ZoomRatioInput = {
  baselineDpr: number;
  baselineVvScale: number;
  baselineInnerWidth: number;
  currentDpr: number;
  currentVvScale: number;
  currentInnerWidth: number;
};

export function computeZoomRatio(m: ZoomRatioInput): number {
  const vvRatio =
    m.currentVvScale > 0 ? m.currentVvScale / m.baselineVvScale : 1;
  const vvAbsoluteRatio = m.currentVvScale > 0 ? m.currentVvScale : 1;
  const dprRatio = m.currentDpr / m.baselineDpr;
  const cw = m.currentInnerWidth || m.baselineInnerWidth || 1;
  const innerWidthRatio =
    m.baselineInnerWidth > 0
      ? m.baselineInnerWidth / Math.max(1, cw)
      : 1;
  return Math.max(vvRatio, vvAbsoluteRatio, dprRatio, innerWidthRatio);
}

export function shouldKeepFreeze(opts: {
  ratio: number;
  freezeActive: boolean;
  healLockFrames: number;
  maxSafe?: number;
  hysteresis?: number;
}): boolean {
  const max = opts.maxSafe ?? ZOOM_GUARD_MAX_SAFE_ZOOM;
  const hys = opts.hysteresis ?? ZOOM_GUARD_EXIT_HYSTERESIS;
  if (opts.healLockFrames > 0) return true;
  if (!opts.freezeActive) return opts.ratio > max;
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

export function shouldCancelWarmStart(
  ratio: number,
  maxSafe = ZOOM_GUARD_MAX_SAFE_ZOOM,
  factor = ZOOM_GUARD_WARM_CANCEL_RATIO,
): boolean {
  return ratio > maxSafe * factor;
}
