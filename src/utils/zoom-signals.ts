import { isAbsurdStoredBaselineInnerWidth } from './zoom-guard-math';

/**
 * Viewport snapshot used to tell pinch, Ctrl/Cmd page zoom, window resize,
 * and display-scale changes apart. innerWidth alone is never zoom — that is
 * how squeeze was mistaken for pinch.
 */
export type ZoomViewportSnapshot = {
  dpr: number;
  vvScale: number;
  innerWidth: number;
  outerWidth: number;
};

/** Below this, pinch / page-zoom is treated as “still 100%”. */
export const ZOOM_SIGNAL_STABLE_MAX = 1.12;

/** Inner/outer changed this much, with zoom ~1, means the window was resized. */
export const ZOOM_SIGNAL_RESIZE_INNER_RATIO = 1.15;

const MIN_USABLE_WINDOW_EDGE_PX = 32;

function maxMinRatio(a: number, b: number): number {
  const larger = Math.max(a, b);
  const smaller = Math.min(a, b);
  if (!(smaller > 0) || !Number.isFinite(larger) || !Number.isFinite(smaller)) {
    return Number.POSITIVE_INFINITY;
  }
  return larger / smaller;
}

function isFinitePositive(n: number): boolean {
  return Number.isFinite(n) && n > 0;
}

export function snapshotLooksValid(s: ZoomViewportSnapshot): boolean {
  return (
    isFinitePositive(s.dpr) &&
    isFinitePositive(s.vvScale) &&
    isFinitePositive(s.innerWidth) &&
    Number.isFinite(s.outerWidth) &&
    s.outerWidth >= 0
  );
}

/** Pinch / trackpad: visualViewport.scale. Desktop Ctrl/Cmd page zoom leaves this at 1. */
export function computePinchRatio(
  baseline: ZoomViewportSnapshot,
  current: ZoomViewportSnapshot,
): number {
  const relative =
    baseline.vvScale > 0 && current.vvScale > 0
      ? current.vvScale / baseline.vvScale
      : 1;
  const absolute = current.vvScale > 0 ? current.vvScale : 1;
  return Math.max(relative, absolute);
}

/**
 * Ctrl/Cmd page zoom shrinks CSS innerWidth while the OS window (outerWidth)
 * stays put. Window resize moves both by roughly the same additive chrome
 * (toolbars). Safari page zoom does not change devicePixelRatio — this is the
 * signal that still sees it.
 */
export function computeWindowChromePageZoom(
  baseline: ZoomViewportSnapshot,
  current: ZoomViewportSnapshot,
): number {
  if (
    baseline.outerWidth < MIN_USABLE_WINDOW_EDGE_PX ||
    current.outerWidth < MIN_USABLE_WINDOW_EDGE_PX
  ) {
    return 1;
  }
  if (
    baseline.innerWidth > 0 &&
    current.innerWidth >= baseline.innerWidth / ZOOM_SIGNAL_STABLE_MAX
  ) {
    return 1;
  }
  const chromeWidth = baseline.outerWidth - baseline.innerWidth;
  const expectedInnerAtBaselineZoom = current.outerWidth - chromeWidth;
  if (expectedInnerAtBaselineZoom < MIN_USABLE_WINDOW_EDGE_PX) {
    return 1;
  }
  return expectedInnerAtBaselineZoom / Math.max(1, current.innerWidth);
}

/**
 * Chrome and Firefox raise devicePixelRatio with page zoom. Safari does not.
 * A DPR jump at the same innerWidth is a monitor / OS scale change, not zoom.
 */
export function computeDprPageZoom(
  baseline: ZoomViewportSnapshot,
  current: ZoomViewportSnapshot,
): number {
  if (!(baseline.dpr > 0)) return 1;
  const innerShrunk =
    baseline.innerWidth / Math.max(1, current.innerWidth) >
    ZOOM_SIGNAL_STABLE_MAX;
  if (!innerShrunk) return 1;
  return current.dpr / baseline.dpr;
}

export function computePageZoomRatio(
  baseline: ZoomViewportSnapshot,
  current: ZoomViewportSnapshot,
): number {
  return Math.max(
    computeWindowChromePageZoom(baseline, current),
    computeDprPageZoom(baseline, current),
  );
}

export function computeEffectiveZoomRatio(
  baseline: ZoomViewportSnapshot,
  current: ZoomViewportSnapshot,
): number {
  return Math.max(
    computePinchRatio(baseline, current),
    computePageZoomRatio(baseline, current),
  );
}

export function isZoomingPastStable(
  baseline: ZoomViewportSnapshot,
  current: ZoomViewportSnapshot,
): boolean {
  return computeEffectiveZoomRatio(baseline, current) > ZOOM_SIGNAL_STABLE_MAX;
}

/**
 * Recapture baseline only when this is a new viewport class (resize / display),
 * never while pinch or page zoom is in effect — that recapture is what made
 * freeze stick at ratio ~1.
 */
export function shouldResetZoomFreezeBaseline(
  baseline: ZoomViewportSnapshot,
  current: ZoomViewportSnapshot,
): boolean {
  if (!snapshotLooksValid(baseline) || !snapshotLooksValid(current)) {
    return true;
  }
  if (
    isAbsurdStoredBaselineInnerWidth(baseline.innerWidth, current.innerWidth)
  ) {
    return true;
  }
  if (isZoomingPastStable(baseline, current)) {
    return false;
  }

  if (current.dpr > baseline.dpr * ZOOM_SIGNAL_STABLE_MAX) {
    return false;
  }

  const dprDropped = baseline.dpr > current.dpr * ZOOM_SIGNAL_STABLE_MAX;
  if (dprDropped) return true;

  return (
    maxMinRatio(current.innerWidth, baseline.innerWidth) >
    ZOOM_SIGNAL_RESIZE_INNER_RATIO
  );
}

export function readZoomViewportSnapshot(win: Window): ZoomViewportSnapshot {
  const vv = win.visualViewport;
  return {
    dpr: win.devicePixelRatio || 1,
    vvScale: vv && vv.scale ? vv.scale : 1,
    innerWidth: win.innerWidth || 0,
    outerWidth: win.outerWidth || 0,
  };
}
