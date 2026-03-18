/** Tolerance in px for position/layout assertions (subpixel, zoom). */
export const LAYOUT_TOLERANCE = 8;

/** Min/max gap in px for spacing (1rem ≈ 16px; allow variance). */
export const MIN_GAP = 8;
export const MAX_GAP = 80;

/** Content container width limits (must match global.css :root). */
export const MIN_CONTENT_WIDTH_CH = 40; /* --content-min-width */
export const MAX_CONTENT_WIDTH_CH = 70; /* --content-width */
/** Approx min width in px for assertions (40ch ≈ 320px at Inter 16px). */
export const MIN_CONTENT_WIDTH_PX = 320;
