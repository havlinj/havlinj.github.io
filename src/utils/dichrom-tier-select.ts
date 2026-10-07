/**
 * Bayer 16×16 moiré is a beat between the dither period and the device pixel grid.
 * It is smallest when bitmap pixels per device pixel is a small integer: 1:1 keeps
 * the grain, 2:1 and 3:1 are clean downsamples. Picking the nearest file by width
 * alone lands on ratios like 1.3–1.5, which is the band that looks broken.
 */

export type DichromCandidate = {
  href: string;
  w: number;
};

const RATIO_STEPS = [1, 2, 3, 4] as const;

/** A coarser integer (2:1, 3:1, …) must beat 1:1 by this much before we take it. */
const COARSER_RATIO_PENALTY = 0.05;

/** Upscale (bitmap smaller than the screen) looks chunkier than the same downsample error. */
const UPSCALE_PENALTY = 0.04;

/** Stay on the current file until another tier is clearly cleaner. Stops boundary flicker. */
const TIER_SWITCH_MARGIN = 0.03;

export function parseDichromCandidates(srcset: string): DichromCandidate[] {
  const candidates: DichromCandidate[] = [];
  for (const part of srcset.split(',')) {
    const bits = part.trim().split(/\s+/);
    if (bits.length < 2) continue;
    const widthToken = bits[bits.length - 1];
    if (!widthToken?.endsWith('w')) continue;
    const w = Number(widthToken.slice(0, -1));
    const href = bits.slice(0, -1).join(' ');
    if (!href || !Number.isFinite(w) || w <= 0) continue;
    candidates.push({ href, w });
  }
  return candidates;
}

/**
 * Bitmap width that would put one source pixel on one device pixel along the
 * axis `object-fit` actually scales. The box is the painted element, so CSS
 * zoom and transforms are already inside `boxWidthCss` / `boxHeightCss`.
 */
export function neededDichromBitmapWidth(input: {
  boxWidthCss: number;
  boxHeightCss: number;
  aspectWOverH: number;
  objectFit: string;
  deviceScale: number;
}): number {
  const scale = input.deviceScale > 0 ? input.deviceScale : 1;
  const boxWidth = Math.max(0, input.boxWidthCss) * scale;
  const boxHeight = Math.max(0, input.boxHeightCss) * scale;
  const aspect = input.aspectWOverH;
  if (!(aspect > 0)) return boxWidth;
  const heightDrivenWidth = boxHeight * aspect;
  if (input.objectFit === 'contain') {
    return Math.min(boxWidth, heightDrivenWidth);
  }
  if (input.objectFit === 'cover') {
    return Math.max(boxWidth, heightDrivenWidth);
  }
  return boxWidth;
}

export function dichromTierScore(
  bitmapWidth: number,
  devicePx: number,
): number {
  if (!(bitmapWidth > 0) || !(devicePx > 0)) return Number.POSITIVE_INFINITY;
  const sourcePerDevice = bitmapWidth / devicePx;
  let best = Number.POSITIVE_INFINITY;
  for (const step of RATIO_STEPS) {
    const distance = Math.abs(Math.log(sourcePerDevice / step));
    const grainPenalty = (step - 1) * COARSER_RATIO_PENALTY;
    const upscalePenalty =
      sourcePerDevice < 1 && step === 1 ? UPSCALE_PENALTY : 0;
    best = Math.min(best, distance + grainPenalty + upscalePenalty);
  }
  return best;
}

/**
 * `dprPageZoom` is Chrome/Firefox page zoom (already inside devicePixelRatio).
 * `cssPageZoom` is Safari page zoom, which shrinks CSS pixels and leaves DPR put.
 * Applying both would double-count Chrome and miss Safari.
 */
export function dichromDeviceScale(input: {
  devicePixelRatio: number;
  visualViewportScale: number;
  dprPageZoom: number;
  cssPageZoom: number;
}): number {
  const dpr = input.devicePixelRatio > 0 ? input.devicePixelRatio : 1;
  const pinch = input.visualViewportScale > 0 ? input.visualViewportScale : 1;
  const dprZoom = input.dprPageZoom > 0 ? input.dprPageZoom : 1;
  const cssZoom = input.cssPageZoom > 0 ? input.cssPageZoom : 1;
  const safariExtra = dprZoom > 1.01 ? 1 : cssZoom;
  return dpr * pinch * safariExtra;
}

export function selectDichromCandidate(
  candidates: readonly DichromCandidate[],
  devicePx: number,
  current?: DichromCandidate,
): DichromCandidate | null {
  if (candidates.length === 0 || !(devicePx > 0)) return null;

  let best = candidates[0];
  if (!best) return null;
  let bestScore = dichromTierScore(best.w, devicePx);
  for (const candidate of candidates) {
    const score = dichromTierScore(candidate.w, devicePx);
    const cleaner = score < bestScore - 1e-9;
    const tiePreferSmaller =
      Math.abs(score - bestScore) <= 1e-9 && candidate.w < best.w;
    if (cleaner || tiePreferSmaller) {
      best = candidate;
      bestScore = score;
    }
  }

  if (!current || current.href === best.href) return best;
  const currentScore = dichromTierScore(current.w, devicePx);
  if (currentScore - bestScore < TIER_SWITCH_MARGIN) return current;
  return best;
}
