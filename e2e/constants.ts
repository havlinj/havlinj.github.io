/** Tolerance in px for position/layout assertions (subpixel, zoom). */
export const LAYOUT_TOLERANCE = 8;

/** Min/max gap in px for spacing (1rem ≈ 16px; allow variance). */
export const MIN_GAP = 8;
export const MAX_GAP = 80;

/** Content container width limits (must match special-typography.css :root). */
export const MIN_CONTENT_WIDTH_CH = 40; /* --content-min-width */
export const MAX_CONTENT_WIDTH_CH = 70; /* --content-width */

/** /why layout — single source: `src/constants/why-layout.ts` */
export {
  WHY_CTA_EDGE_MIN_PX,
  WHY_CTA_EDGE_WIDTH_FRAC,
  WHY_CTA_LEAD_TRACK,
  WHY_GIF_TOP_INSET,
  WHY_SCROLL_CTA_CONTAINER_CQW,
} from '../src/constants/why-layout';
