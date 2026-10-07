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

/**
 * A heavier file must beat the lightest near-best score by more than this
 * before it is worth the bytes. A hair of extra cleanliness is still the same beat.
 */
const HEAVIER_TIER_MARGIN = 0.04;

/**
 * A 1:1 file this far from the device grid is the moiré the phone actually shows.
 * An essentially exact 2:1 or 3:1 downsample replaces it.
 */
const SLOPPY_UNITY_ERROR = 0.02;

/** Raw log-distance at which a coarser integer still counts as a clean downsample. */
const CLEAN_DOWNSAMPLE_ERROR = 0.02;

/**
 * How much worse a downsample may score than a slight upscale and still replace it.
 * Upscaling a Bayer cell duplicates columns; a near integer reduction does not.
 */
const UPSCALE_SCORE_SLACK = 0.015;

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

function nearestRatio(
  bitmapWidth: number,
  devicePx: number,
): { step: number; error: number; sourcePerDevice: number } {
  const sourcePerDevice = bitmapWidth / devicePx;
  let step: number = RATIO_STEPS[0];
  let error = Number.POSITIVE_INFINITY;
  for (const candidateStep of RATIO_STEPS) {
    const candidateError = Math.abs(Math.log(sourcePerDevice / candidateStep));
    if (candidateError < error) {
      error = candidateError;
      step = candidateStep;
    }
  }
  return { step, error, sourcePerDevice };
}

/**
 * The byte rule keeps a slightly small 1:1 file over a heavier exact downsample.
 * On a phone that stretch is the moiré that stays on screen. An exact coarser
 * integer replaces a sloppy 1:1, and a near-integer reduction replaces an upscale.
 */
function preferReadableBitmap(
  candidates: readonly DichromCandidate[],
  devicePx: number,
  preferred: { candidate: DichromCandidate; score: number },
): { candidate: DichromCandidate; score: number } {
  const preferredRatio = nearestRatio(preferred.candidate.w, devicePx);

  if (preferredRatio.step === 1 && preferredRatio.error > SLOPPY_UNITY_ERROR) {
    let clean: { candidate: DichromCandidate; score: number } | null = null;
    for (const candidate of candidates) {
      const ratio = nearestRatio(candidate.w, devicePx);
      if (ratio.step < 2 || ratio.error > CLEAN_DOWNSAMPLE_ERROR) continue;
      const candidateScore = dichromTierScore(candidate.w, devicePx);
      if (
        !clean ||
        candidateScore < clean.score ||
        (candidateScore === clean.score && candidate.w < clean.candidate.w)
      ) {
        clean = { candidate, score: candidateScore };
      }
    }
    if (clean) return clean;
  }

  if (preferredRatio.sourcePerDevice < 1) {
    let downsample: { candidate: DichromCandidate; score: number } | null =
      null;
    for (const candidate of candidates) {
      if (candidate.w < devicePx) continue;
      const candidateScore = dichromTierScore(candidate.w, devicePx);
      if (candidateScore > preferred.score + UPSCALE_SCORE_SLACK) continue;
      if (
        !downsample ||
        candidateScore < downsample.score ||
        (candidateScore === downsample.score &&
          candidate.w < downsample.candidate.w)
      ) {
        downsample = { candidate, score: candidateScore };
      }
    }
    if (downsample) return downsample;
  }

  return preferred;
}

function lightestCandidateNearBest(
  candidates: readonly DichromCandidate[],
  devicePx: number,
): { candidate: DichromCandidate; score: number } | null {
  const scored = candidates.map((candidate) => ({
    candidate,
    score: dichromTierScore(candidate.w, devicePx),
  }));
  let bestScore = Number.POSITIVE_INFINITY;
  for (const row of scored) {
    if (row.score < bestScore) bestScore = row.score;
  }

  let chosen: (typeof scored)[number] | null = null;
  for (const row of scored) {
    if (row.score > bestScore + HEAVIER_TIER_MARGIN) continue;
    if (!chosen || row.candidate.w < chosen.candidate.w) chosen = row;
  }
  return chosen;
}

export function selectDichromCandidate(
  candidates: readonly DichromCandidate[],
  devicePx: number,
  current?: DichromCandidate,
): DichromCandidate | null {
  if (candidates.length === 0 || !(devicePx > 0)) return null;

  const lightest = lightestCandidateNearBest(candidates, devicePx);
  if (!lightest) return null;
  const preferred = preferReadableBitmap(candidates, devicePx, lightest);
  if (!current || current.href === preferred.candidate.href) {
    return preferred.candidate;
  }
  const currentScore = dichromTierScore(current.w, devicePx);
  if (currentScore - preferred.score < TIER_SWITCH_MARGIN) {
    return preferReadableBitmap(candidates, devicePx, {
      candidate: current,
      score: currentScore,
    }).candidate;
  }
  return preferred.candidate;
}
