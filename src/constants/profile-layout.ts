/** Assets preloaded on /profile for faster veil + tile paint (Layout head). */

import {
  buildDichromResponsive,
  buildDichromTileResponsive,
  DICHROM_INTRINSIC_WIDTHS,
} from './dichrom-responsive';

export const PROFILE_PORTRAIT_BG_STEM =
  '/assets/pages/profile/portrait/portrait_dimmed_mirrored_dichrom_collage';

export const PROFILE_PORTRAIT_BG = buildDichromTileResponsive(
  PROFILE_PORTRAIT_BG_STEM,
);

/** Bitmap height of the portrait `w320` file, used as the `<img height>`. */
export const PROFILE_PORTRAIT_BG_HEIGHT = 974;

/**
 * Panel background. Filename suffix is the display tier; widths are the shared
 * full-frame PNG IHDR widths (same generator profiles as the other pages).
 */
export const PROFILE_PANEL_BG_FILE_STEM =
  'jiesuang-ng-WKL3Q906OR4-unsplash_dichrom';

export const PROFILE_PANEL_BG_STEM = `/assets/pages/profile/${PROFILE_PANEL_BG_FILE_STEM}`;

export const PROFILE_PANEL_BG_INTRINSIC_WIDTHS = DICHROM_INTRINSIC_WIDTHS;

export const PROFILE_PANEL_BG = buildDichromResponsive(
  PROFILE_PANEL_BG_STEM,
  PROFILE_PANEL_BG_INTRINSIC_WIDTHS,
);

/** Bitmap height of the `w1440` file, used as the `<img width/height>` pair. */
export const PROFILE_PANEL_BG_HEIGHT = 1920;

/**
 * Conservative `sizes` for Why / Foundations / portrait tile `<picture>`s.
 * Keep in sync with the `<picture>` `sizes` in profile.md.
 */
export const PROFILE_DICHROM_TILE_SIZES =
  '(max-width: 767px) 92vw, min(70ch, 92vw)';

export const PROFILE_WHY_BG_STEM =
  '/assets/pages/profile/why-this/t-RCA--h6cmcU-unsplash_dichrom_collage';

export const PROFILE_WHY_BG = buildDichromTileResponsive(PROFILE_WHY_BG_STEM);

export const PROFILE_FOUNDATIONS_BG_STEM =
  '/assets/pages/profile/foundations/museum-of-new-zealand-te-papa-tongarewa-bAdYMC4JXlQ-unsplash_dichrom_collage';

export const PROFILE_FOUNDATIONS_BG = buildDichromTileResponsive(
  PROFILE_FOUNDATIONS_BG_STEM,
);

export const PROFILE_FOUNDATIONS_TILE_SIZES = PROFILE_DICHROM_TILE_SIZES;

/** What I do tile poster (113 KB desktop) — preload for reveal; MP4 waits until after veil. */
export { PROFILE_GIF_TILE_POSTER_DESKTOP as PROFILE_WHAT_I_DO_FALLBACK_HREF } from './profile-media';
