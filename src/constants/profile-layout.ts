/** Assets preloaded on /profile for faster veil + tile paint (Layout head). */

import { buildDichromTileResponsive } from './dichrom-responsive';

export const PROFILE_PORTRAIT_HREF =
  '/assets/pages/profile/portrait_bayer16_style.png';

/**
 * Paint box is the overscanned image-tile surface (~2.3× tile).
 * Keep in sync with the `<picture>` `sizes` on Why / Foundations tiles in profile.md.
 */
export const PROFILE_DICHROM_TILE_SIZES =
  '(max-width: 767px) 92vw, min(70ch, 92vw)';

export const PROFILE_WHY_BG_STEM =
  '/assets/pages/profile/why-this/t-RCA--h6cmcU-unsplash_dichrom_collage';

export const PROFILE_WHY_BG = buildDichromTileResponsive(PROFILE_WHY_BG_STEM);

export const PROFILE_FOUNDATIONS_BG_STEM =
  '/assets/pages/profile/foundations/andrew-charney-e3iwXJhT3Zk-unsplash_dichrom_collage';

export const PROFILE_FOUNDATIONS_BG = buildDichromTileResponsive(
  PROFILE_FOUNDATIONS_BG_STEM,
);

export const PROFILE_FOUNDATIONS_TILE_SIZES = PROFILE_DICHROM_TILE_SIZES;

/** What I do tile poster (113 KB desktop) — preload for reveal; MP4 waits until after veil. */
export { PROFILE_GIF_TILE_POSTER_DESKTOP as PROFILE_WHAT_I_DO_FALLBACK_HREF } from './profile-media';
