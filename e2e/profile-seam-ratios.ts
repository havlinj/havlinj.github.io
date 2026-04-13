/**
 * Sync with `src/styles/profile.css` — `.profile-section` block
 * `--profile-shared-edge-ratio-base` / `-360` / `-480` / `-720` / `-960`
 * and matching `@media (min-width: …)` breakpoints (same numbers as in that file).
 */
export const PROFILE_SHARED_EDGE_RATIO_BY_STEP = {
  base: 0.77,
  at360: 0.85,
  at480: 1.05,
  at720: 1.14,
  at960: 1.25,
} as const;

/** Must match `@media (min-width: …)` order in profile.css (ascending). */
export const PROFILE_SEAM_MEDIA_MIN_WIDTHS = [360, 480, 720, 960] as const;

/** Same cascade as CSS: which ratio applies for this layout viewport width (CSS px). */
export function activeProfileSeamRatio(layoutWidthPx: number): number {
  const r = PROFILE_SHARED_EDGE_RATIO_BY_STEP;
  let ratio = r.base;
  if (layoutWidthPx >= PROFILE_SEAM_MEDIA_MIN_WIDTHS[0]) ratio = r.at360;
  if (layoutWidthPx >= PROFILE_SEAM_MEDIA_MIN_WIDTHS[1]) ratio = r.at480;
  if (layoutWidthPx >= PROFILE_SEAM_MEDIA_MIN_WIDTHS[2]) ratio = r.at720;
  if (layoutWidthPx >= PROFILE_SEAM_MEDIA_MIN_WIDTHS[3]) ratio = r.at960;
  return ratio;
}

/** Why / Foundations stitched border = 2×(frame×ratio) − frame (see profile.css). */
export function expectedProfileStitchedBorderPx(
  framePx: number,
  ratio: number,
): number {
  return framePx * (2 * ratio - 1);
}

/**
 * Layout viewport widths to assert (use `innerWidth` from the page for ratio pick).
 * Skip below ~360px width: Chromium can round border-bottom-width away from raw calc() px
 * on very narrow layout viewports, so we start at 380 (still the 360px media step).
 */
export const PROFILE_SEAM_VIEWPORT_WIDTHS = [
  380, 500, 800, 1280,
] as const;
