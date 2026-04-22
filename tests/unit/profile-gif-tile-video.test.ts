import { describe, expect, it } from 'vitest';
import { profileGifTileVideoPathForViewport } from '../../src/scripts/profile-gif-tile-video';
import {
  PROFILE_GIF_TILE_VIDEO_DESKTOP,
  PROFILE_GIF_TILE_VIDEO_MOBILE,
} from '../../src/constants/profile-media';

describe('profileGifTileVideoPathForViewport', () => {
  it('uses mobile path when matchMedia reports mobile', () => {
    expect(profileGifTileVideoPathForViewport({ matches: true })).toBe(
      PROFILE_GIF_TILE_VIDEO_MOBILE,
    );
  });

  it('uses desktop path when not mobile', () => {
    expect(profileGifTileVideoPathForViewport({ matches: false })).toBe(
      PROFILE_GIF_TILE_VIDEO_DESKTOP,
    );
  });
});
