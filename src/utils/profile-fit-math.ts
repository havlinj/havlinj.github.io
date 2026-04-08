// eslint-disable-next-line no-unused-vars -- function type argument name is descriptive only
export type FontMeasure = (fontSizePx: number) => number;

export function fitFontSize(
  available: number,
  minPx: number,
  maxPx: number,
  measure: FontMeasure,
): number {
  if (available <= 1) return minPx;
  const cap = available * 0.996;
  if (measure(maxPx) <= cap) return maxPx;
  if (measure(minPx) > cap) return minPx;
  let lo = minPx;
  let hi = maxPx;
  for (let i = 0; i < 26; i += 1) {
    const mid = (lo + hi) / 2;
    if (measure(mid) <= cap) lo = mid;
    else hi = mid;
  }
  return lo;
}

export function roundPx(n: number): number {
  return Math.round(n * 100) / 100;
}

export function normalizePositiveScale(raw: string): number {
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function baseWidthFromEffectiveScale(
  measuredWidth: number,
  effectiveScale: number,
): number {
  if (!Number.isFinite(measuredWidth) || measuredWidth <= 0) return 0;
  if (!Number.isFinite(effectiveScale) || effectiveScale <= 0)
    return measuredWidth;
  return measuredWidth / effectiveScale;
}
