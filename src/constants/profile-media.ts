/**
 * Profile “What I do” tile loop + poster fallbacks (`profile-gif-tile-video.ts`, `profile.md`).
 * Viewport breakpoint: sync `WHY_CLIP_VIEWPORT_MOBILE_MQ` in `why-layout.ts` (same as /why clip).
 */

const BASE = '/assets/pages/profile/what-i-do';

export const PROFILE_GIF_TILE_VIDEO_DESKTOP = `${BASE}/raddy_13522186-hd_1920_1080_25fps_dichrom_desktop.mp4`;

export const PROFILE_GIF_TILE_VIDEO_MOBILE = `${BASE}/raddy_13522186-hd_1920_1080_25fps_dichrom_mobile.mp4`;

export const PROFILE_GIF_TILE_POSTER_DESKTOP = `${BASE}/fallback_desktop.jpg`;

export const PROFILE_GIF_TILE_POSTER_MOBILE = `${BASE}/fallback_mobile.jpg`;
