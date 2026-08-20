/** Sync with `src/scripts/zoom-guard-init.ts` / Layout zoom guard. */
export const ZOOM_GUARD_MAX_SAFE_ZOOM = 2.3;
export const ZOOM_GUARD_EXIT_HYSTERESIS = 0.15;
/** Warm-start is skipped when ratio exceeds this factor of max safe zoom. */
export const ZOOM_GUARD_WARM_CANCEL_RATIO = 1.05;
/** Document scrollWidth vs innerWidth — overflow self-heal when unfrozen. */
export const ZOOM_GUARD_OVERFLOW_HEAL_THRESHOLD = 1.22;

/**
 * Tampered or impossible sessionStorage baseline (e.g. innerWidth: 3000 on a ~900px window).
 * Must not drive getZoomRatio() into false freeze; reset baseline from current view instead.
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
    m.baselineInnerWidth > 0 ? m.baselineInnerWidth / Math.max(1, cw) : 1;
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

/** Sync with `src/scripts/zoom-guard-init.ts`. */
export const ZOOM_GUARD_DPR_BASELINE_MISMATCH_RATIO = 1.12;
export const ZOOM_GUARD_DESKTOP_BASELINE_INNER_WIDTH_MIN = 640;
export const ZOOM_GUARD_NARROW_VIEWPORT_MAX = 520;

export type ZoomFreezeBaselineResetInput = {
  baselineDpr: number;
  baselineVvScale: number;
  baselineInnerWidth: number;
  currentDpr: number;
  currentVvScale: number;
  currentInnerWidth: number;
};

/**
 * True when the stored baseline no longer describes this viewport class
 * (e.g. desktop → phone resize). Caller must reset baseline and clear freeze;
 * plain viewport squeeze must not be treated as pinch zoom.
 */
export function shouldResetZoomFreezeBaseline(
  m: ZoomFreezeBaselineResetInput,
): boolean {
  if (
    !(
      Number.isFinite(m.baselineDpr) &&
      m.baselineDpr > 0 &&
      Number.isFinite(m.baselineVvScale) &&
      m.baselineVvScale > 0 &&
      Number.isFinite(m.baselineInnerWidth) &&
      m.baselineInnerWidth > 0
    )
  ) {
    return true;
  }

  const dprBaselineMismatch =
    Math.max(m.currentDpr, m.baselineDpr) /
      Math.min(m.currentDpr, m.baselineDpr) >
    ZOOM_GUARD_DPR_BASELINE_MISMATCH_RATIO;

  const scaleDropped =
    m.currentDpr < m.baselineDpr * 0.9 ||
    m.currentVvScale < m.baselineVvScale * 0.9;

  const widthExpanded = m.currentInnerWidth > m.baselineInnerWidth * 1.15;

  const likelyNarrowViewportZoomContext =
    m.currentInnerWidth <= ZOOM_GUARD_NARROW_VIEWPORT_MAX;
  const narrowButBaselineLooksDesktop =
    likelyNarrowViewportZoomContext &&
    m.baselineInnerWidth >= ZOOM_GUARD_DESKTOP_BASELINE_INNER_WIDTH_MIN &&
    m.baselineInnerWidth > m.currentInnerWidth * 1.25;

  const absurdStoredInnerWidth = isAbsurdStoredBaselineInnerWidth(
    m.baselineInnerWidth,
    m.currentInnerWidth,
  );

  return (
    dprBaselineMismatch ||
    scaleDropped ||
    widthExpanded ||
    narrowButBaselineLooksDesktop ||
    absurdStoredInnerWidth
  );
}
