/**
 * Profile “What I do” tile loop + poster fallbacks (`profile-gif-tile-video.ts`, `profile.md`).
 */

const BASE = '/assets/pages/profile/what-i-do';

/** Viewport breakpoint for profile tile desktop/mobile media switch. */
export const PROFILE_GIF_TILE_VIEWPORT_MOBILE_MQ = '(max-width: 767px)';

export const PROFILE_GIF_TILE_VIDEO_DESKTOP = `${BASE}/raddy_13522186-hd_1920_1080_25fps_dichrom_desktop.mp4`;

export const PROFILE_GIF_TILE_VIDEO_MOBILE = `${BASE}/raddy_13522186-hd_1920_1080_25fps_dichrom_mobile.mp4`;

export const PROFILE_GIF_TILE_POSTER_DESKTOP = `${BASE}/fallback_desktop.jpg`;

export const PROFILE_GIF_TILE_POSTER_MOBILE = `${BASE}/fallback_mobile.jpg`;
