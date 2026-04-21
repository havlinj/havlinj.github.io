/**
 * Shared layout tokens for /why (WhyContent script, markup, and e2e).
 * CSS that cannot read TS should duplicate with a “sync:” comment to this file.
 */

/** Viewport: mobile clip assets (picture + video src in `why-clip-media.ts`). */
export const WHY_CLIP_VIEWPORT_MOBILE_MQ = '(max-width: 767px)';

export const WHY_CLIP_VIDEO_MOBILE =
  '/assets/pages/profile/why/mobile/nicola_narraci_15717076_1280_720_30fps_pexels_reverse_loop_dichrom_mobile.mp4';

export const WHY_CLIP_VIDEO_DESKTOP =
  '/assets/pages/profile/why/desktop/nicola_narraci_15717076_1280_720_30fps_pexels_reverse_loop_dichrom.mp4';

export const WHY_CLIP_POSTER_MOBILE =
  '/assets/pages/profile/why/mobile/fallback_mobile.jpg';

export const WHY_CLIP_POSTER_DESKTOP =
  '/assets/pages/profile/why/desktop/fallback_desktop.jpg';

/** Horizontal CTA anchor: fraction of `.why-box` width from the left (arrow center; CSS uses translateX(-50%)). */
export const WHY_CTA_BOX_WIDTH_FRAC = 0.488;

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
export const WHY_GIF_BASE_OPACITY = 0.7;

/**
 * Background clip `playbackRate` oscillates in time only (not tied to scroll / wheel).
 * Tuning (if the effect feels invisible): (1) shorten `SINE_PERIOD_MS` — long periods mean
 * glacial change; (2) widen `SINE_HIGH − SINE_LOW` — e.g. 0.35→1.15 reads clearly on motion;
 * (3) try `WAVE: 'triangle'` — linear sweep through speeds vs smooth sine dwell near extrema.
 * Phase: `phase = 2π * tSec / (SINE_PERIOD_MS/1000) + SINE_PHASE_RAD`, `tSec = performance.now()/1000`.
 */
export const WHY_CLIP_PLAYBACK_SINE_LOW = 0.32;
export const WHY_CLIP_PLAYBACK_SINE_HIGH = 1.12;
/** Duration of one full wave cycle (milliseconds). */
export const WHY_CLIP_PLAYBACK_SINE_PERIOD_MS = 5200;
/** Added to wave phase (radians). */
export const WHY_CLIP_PLAYBACK_SINE_PHASE_RAD = 0;

/** `sine` — smooth; `triangle` — constant rate of change through LOW↔HIGH (often easier to notice). */
export const WHY_CLIP_PLAYBACK_WAVE: 'sine' | 'triangle' = 'triangle';

/** Scroll-hint arrow: `AnimatedArrow` `containerCqw` (width vs `.why-box`). */
export const WHY_SCROLL_CTA_CONTAINER_CQW = 9;

/**
 * Solid CTA chevron blink: peak path opacity (clamped strictly below 1 in `AnimatedArrow`).
 * Tune down if the page-bg fill reads too bright on `#111`. Passed as `solidBlinkPeakOpacity` from `WhyContent.astro`.
 */
export const WHY_CTA_ARROW_PEAK_OPACITY = 0.26;

/**
 * Solid CTA blink: minimum path opacity at the dimmest point (never 0 — arrow stays faintly visible).
 * Must stay below `WHY_CTA_ARROW_PEAK_OPACITY`; `AnimatedArrow` clamps if needed.
 */
export const WHY_CTA_ARROW_FLOOR_OPACITY = 0.1;

/**
 * JS fallback when computed padding-right is missing (≈ 3rem at 16px root).
 * sync: `--why-text-right-gutter: 2.75em` in `src/styles/why.css`
 */
export const WHY_TEXT_RIGHT_GUTTER_REM = 3;

/** Max revolver translateX (rem) for non-lead lines; must match `why-box-scroll.ts` / CSS revolver. */
export const WHY_BODY_MAX_INSET_REM = 4;
