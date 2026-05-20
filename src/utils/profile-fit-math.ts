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

/** Inner copy box vs stanza (Foundations reveal uniform scale). */
export function computeRevealCopyUniformScale(
  innerW: number,
  innerH: number,
  stanzaClientW: number,
  stanzaClientH: number,
  padPx: number,
): number {
  if (innerW < 2 || innerH < 2) return 1;
  const sw = Math.max(stanzaClientW - padPx, 1);
  const sh = Math.max(stanzaClientH - padPx, 1);
  return Math.min(1, sw / innerW, sh / innerH);
}

/** Hard cap by stanza box vs preferred cap (profile-tile-type-fit-reveal-fit). */
export function computeFoundationsRevealMaxFontPx(
  minPx: number,
  stanzaClientW: number,
  stanzaClientH: number,
  preferredPx: number,
): number {
  const boxCapPx = Math.max(minPx, Math.min(stanzaClientW, stanzaClientH));
  return Math.max(minPx, Math.min(boxCapPx, preferredPx));
}
