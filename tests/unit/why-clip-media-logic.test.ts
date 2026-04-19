import { describe, expect, it } from 'vitest';
import {
  WHY_CLIP_VIDEO_DESKTOP,
  WHY_CLIP_VIDEO_MOBILE,
} from '../../src/constants/why-layout';
import {
  clipVideoPathForViewport,
  pathnameOfMediaSrc,
} from '../../src/utils/why-clip-media-logic';

describe('clipVideoPathForViewport', () => {
  it('returns mobile path when mq.matches', () => {
    expect(clipVideoPathForViewport({ matches: true })).toBe(
      WHY_CLIP_VIDEO_MOBILE,
    );
  });

  it('returns desktop path when mq does not match', () => {
    expect(clipVideoPathForViewport({ matches: false })).toBe(
      WHY_CLIP_VIDEO_DESKTOP,
    );
  });
});

describe('pathnameOfMediaSrc', () => {
  it('prefers currentSrc over src', () => {
    expect(
      pathnameOfMediaSrc(
        '/assets/pages/profile/why/desktop/x.mp4',
        '',
        'https://example.com/why/',
      ),
    ).toBe('/assets/pages/profile/why/desktop/x.mp4');
  });

  it('falls back to src when currentSrc empty', () => {
    expect(
      pathnameOfMediaSrc('', '/why/video.mp4', 'https://example.com'),
    ).toBe('/why/video.mp4');
  });

  it('returns empty string when both empty', () => {
    expect(pathnameOfMediaSrc('', '', 'https://example.com')).toBe('');
  });

  it('returns empty when resolution throws (invalid base)', () => {
    expect(pathnameOfMediaSrc('x', '', 'not-a-valid-base-href')).toBe('');
  });
});
