/** Tolerance in px for position/layout assertions (subpixel, zoom). */
export const LAYOUT_TOLERANCE = 8;

/** Min/max gap in px for spacing (1rem ≈ 16px; allow variance). */
export const MIN_GAP = 8;
export const MAX_GAP = 88;

/** Content container width limits (must match special-typography.css :root). */
export const MIN_CONTENT_WIDTH_CH = 40; /* --content-min-width */
export const MAX_CONTENT_WIDTH_CH = 70; /* --content-width */

/**
 * Viewport width for e2e that forces Why wide-line fit past `FONT_MIN` so the
 * runtime `main.content` min-width lock engages (guards extreme zoom / narrow layout).
 * Sync intent with `FIT_FAIL_*` in `src/scripts/why-box-scroll.ts`.
 */
export const WHY_FIT_FAIL_LOCK_VIEWPORT_WIDTH = 400;

/** Sync: `CTA_VEIL_CLEARANCE_BELOW_LEAD_PX` in `src/scripts/why-box-scroll.ts`. */
export const WHY_CTA_VEIL_CLEARANCE_BELOW_LEAD_PX = 28;
/** Sync: `CTA_VEIL_MIN_GAP_ABOVE_ARROW_PX` in `src/scripts/why-box-scroll.ts`. */
export const WHY_CTA_VEIL_MIN_GAP_ABOVE_ARROW_PX = 16;

/** /why layout — single source: `src/constants/why-layout.ts` */
export {
  WHY_CTA_ARROW_FLOOR_OPACITY,
  WHY_CTA_ARROW_PEAK_OPACITY,
  WHY_CTA_BOX_WIDTH_FRAC,
  WHY_GIF_TOP_INSET,
  WHY_SCROLL_CTA_CONTAINER_CQW,
} from '../src/constants/why-layout';
