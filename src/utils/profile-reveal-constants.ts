/**
 * Foundations reveal layout: shared by profile-tile-type-fit.ts and e2e.
 * Keep `padding-inline-end` calc in profile.css (`* N` on `--profile-tile-text-inset-x`) in sync with
 * {@link REVEAL_RIGHT_MARGIN_RATIO_MIN}.
 */
export const REVEAL_RIGHT_MARGIN_RATIO_MIN = 1.18;

/** JS fit: right margin must exceed `left * ratio` by at least this (px). */
export const REVEAL_RIGHT_RENDER_PAD_PX = 5;

/** JS fit: `rightMargin + epsilon >= left * ratio + pad`. */
export const REVEAL_RIGHT_MARGIN_FIT_EPSILON_PX = 0.5;

/** E2e: computed padding-right vs padding-left * ratio (subpixel / rounding). */
export const REVEAL_PADDING_RATIO_ASSERT_TOLERANCE_PX = 0.5;
