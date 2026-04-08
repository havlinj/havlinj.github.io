export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export function smoothstep(x: number): number {
  return x * x * (3 - 2 * x);
}

export function wheelDeltaToPixels(
  deltaY: number,
  deltaZ: number,
  deltaMode: number,
  clientHeight: number,
): number {
  let d = deltaY + (deltaZ || 0);
  if (deltaMode === 1) d *= 16;
  else if (deltaMode === 2) d *= clientHeight || 1;
  return d;
}

export function middlePhaseRevolverGate(
  scrollTop: number,
  maxScroll: number,
  clientHeight: number,
  introRampMin: number,
  introRampFrac: number,
  endBandMin: number,
  endBandFrac: number,
): number {
  if (maxScroll <= 1) return 0;
  const introRampPx = Math.max(introRampMin, clientHeight * introRampFrac);
  const endBandPx = Math.max(endBandMin, clientHeight * endBandFrac);
  const startGate = smoothstep(clamp(scrollTop / introRampPx, 0, 1));
  const distFromEnd = Math.max(0, maxScroll - scrollTop);
  const endGate = smoothstep(clamp(distFromEnd / endBandPx, 0, 1));
  return startGate * endGate;
}

export function revolverLerpForDelta(
  scrollDeltaPx: number,
  instantBelowPx: number,
  lerpSpeed: number,
): number {
  if (scrollDeltaPx < instantBelowPx) return 1;
  const raw = clamp(0.15 + scrollDeltaPx / 250, 0.15, 0.34);
  return raw * lerpSpeed;
}
