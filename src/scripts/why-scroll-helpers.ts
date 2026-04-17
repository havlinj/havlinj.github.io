import {
  middlePhaseRevolverGate as computeMiddlePhaseRevolverGate,
  revolverLerpForDelta as computeRevolverLerpForDelta,
  smoothstep,
  wheelDeltaToPixels as toWheelPixels,
} from '../utils/why-scroll-math';

export function revolverLerpForDelta(
  scrollDeltaPx: number,
  instantBelowPx: number,
  lerpSpeed: number,
): number {
  return computeRevolverLerpForDelta(scrollDeltaPx, instantBelowPx, lerpSpeed);
}

export function wheelDeltaToPixels(
  deltaY: number,
  deltaZ: number,
  deltaMode: number,
  scrollClientHeight: number,
): number {
  return toWheelPixels(deltaY, deltaZ, deltaMode, scrollClientHeight || 1);
}

export function whyScrollPrefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function quantizeRevolverNormalized(n: number): number {
  if (!Number.isFinite(n)) return n;
  return Math.round(n * 40) / 40;
}

export function viewportCenterContentYStable(
  scrollTop: number,
  clientHeight: number,
): number {
  const st = Math.round(scrollTop);
  const ch = Math.round(clientHeight);
  return st + ch * 0.5;
}

export function middlePhaseRevolverGate(
  scrollTop: number,
  maxScroll: number,
  clientHeight: number,
  introRampMin: number,
  introRampFrac: number,
  endCoverBandMin: number,
  endCoverBandFrac: number,
): number {
  return computeMiddlePhaseRevolverGate(
    scrollTop,
    maxScroll,
    clientHeight,
    introRampMin,
    introRampFrac,
    endCoverBandMin,
    endCoverBandFrac,
  );
}

/** Matches why.css clamp(130px, 22vh, 230px). */
export function edgeVeilHeightPx(vh: number): number {
  return Math.min(230, Math.max(130, vh * 0.22));
}

/** Matches why.css clamp(42px, 8vh, 86px). */
export function edgeVeilEndHeightPx(vh: number): number {
  return Math.min(86, Math.max(42, vh * 0.08));
}

export function computeEndPhase(
  scrollTop: number,
  clientHeight: number,
  maxScroll: number,
  endCoverBandMin: number,
  endCoverBandFrac: number,
): number {
  const coverBandPx = Math.max(endCoverBandMin, clientHeight * endCoverBandFrac);
  const coverProgress = maxScroll
    ? Math.min(
        1,
        Math.max(0, (scrollTop - (maxScroll - coverBandPx)) / coverBandPx),
      )
    : 0;
  return smoothstep(coverProgress);
}
