/**
 * Shared layout tokens for /why (WhyContent script, markup, and e2e).
 * CSS that cannot read TS should duplicate with a “sync:” comment to this file.
 */

/** Shared /why clip asset for desktop + mobile. */
export const WHY_CLIP_VIDEO =
  '/assets/pages/profile/why/deconjpa_12374259_1440_1080_60fps_pexels_inversed_clean.mp4';

/** Shared /why clip fallback image for poster and errors. */
export const WHY_CLIP_FALLBACK_IMAGE =
  '/assets/pages/profile/why/deconjpa_12374259_1440_1080_60fps_pexels_fallback_image_desktop.jpg';

/** Horizontal CTA anchor: fraction of `.why-box` width from the left (arrow center; CSS uses translateX(-50%)). */
export const WHY_CTA_BOX_WIDTH_FRAC = 0.5;

/**
 * GIF band from scroll inner edge (custom property on `.why-wrapper`).
 * ~2.3rem at ~1.09rem body (2.3/1.09); `em` resolves on `.why-clip-holder` (inherits scroll font-size).
 * Set from `WhyContent.astro`; do not redefine in `why.css`.
 */
export const WHY_GIF_TOP_INSET = '2.11em';

/**
 * Multiplier for GIF opacity (0–1). Final opacity = scroll-script factor × this.
 * Set on `.why-wrapper` as `--why-gif-base-opacity`; sync `why.css` `.why-clip-holder`.
 */
export const WHY_GIF_BASE_OPACITY = 1;

/** Constant playback speed for /why background clip. */
export const WHY_CLIP_PLAYBACK_RATE = 1;

/** Scroll-hint arrow: `AnimatedArrow` `containerCqw` (width vs `.why-box`). */
export const WHY_SCROLL_CTA_CONTAINER_CQW = 9;

/** CTA chevron blink: peak path opacity (clamped strictly below 1 in `AnimatedArrow`). */
export const WHY_CTA_ARROW_PEAK_OPACITY = 0.45;

/**
 * CTA blink: minimum path opacity at the dimmest point (never 0 — arrow stays faintly visible).
 * Must stay below `WHY_CTA_ARROW_PEAK_OPACITY`; `AnimatedArrow` clamps if needed.
 */
export const WHY_CTA_ARROW_FLOOR_OPACITY = 0.05;

/**
 * JS fallback when computed padding-right is missing (≈ 3rem at 16px root).
 * sync: `--why-text-right-gutter: 2.75em` in `src/styles/why.css`
 */
export const WHY_TEXT_RIGHT_GUTTER_REM = 3;

/** Max revolver translateX (rem) for non-lead lines; must match `why-box-scroll.ts` / CSS revolver. */
export const WHY_BODY_MAX_INSET_REM = 4;
