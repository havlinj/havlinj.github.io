/**
 * Shared layout tokens for /why (WhyContent script, markup, and e2e).
 * CSS that cannot read TS should duplicate with a “sync:” comment to this file.
 */

/** Horizontal CTA anchor: fraction of `.why-lead` first-line width from line start. */
export const WHY_CTA_LEAD_TRACK = 0.42;

/** Min px from `.why-box` edge when clamping CTA `left`. */
export const WHY_CTA_EDGE_MIN_PX = 8;

/** `.why-box` width fraction for CTA horizontal edge clamp. */
export const WHY_CTA_EDGE_WIDTH_FRAC = 0.02;

/**
 * GIF band from scroll inner edge (custom property on `.why-wrapper`).
 * Set from `WhyContent.astro`; do not redefine in `why.css`.
 */
export const WHY_GIF_TOP_INSET = '2.3rem';

/** Scroll-hint arrow: `AnimatedArrow` `containerCqw` (width vs `.why-box`). */
export const WHY_SCROLL_CTA_CONTAINER_CQW = 9;

/**
 * Min gap from longest line to inner right of `.why-scroll` (paragraph padding-right).
 * sync: `--why-text-right-gutter` in `src/styles/why.css`
 */
export const WHY_TEXT_RIGHT_GUTTER_REM = 3;

/** Max revolver translateX (rem) for non-lead lines; must match `why-box-scroll.ts` / CSS revolver. */
export const WHY_BODY_MAX_INSET_REM = 4;
