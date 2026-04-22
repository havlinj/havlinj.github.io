import {
  PROFILE_GIF_TILE_VIDEO_DESKTOP,
  PROFILE_GIF_TILE_VIDEO_MOBILE,
} from '../constants/profile-media';
import { WHY_CLIP_VIEWPORT_MOBILE_MQ } from '../constants/why-layout';
import { pathnameOfMediaSrc } from '../utils/why-clip-media-logic';

const MIN_RATE = 0.0625;
const MAX_RATE = 4;

export function profileGifTileVideoPathForViewport(mobileMq: {
  matches: boolean;
}): string {
  return mobileMq.matches
    ? PROFILE_GIF_TILE_VIDEO_MOBILE
    : PROFILE_GIF_TILE_VIDEO_DESKTOP;
}

function pathnameOfVideo(el: HTMLVideoElement): string {
  return pathnameOfMediaSrc(el.currentSrc, el.src, window.location.href);
}

function applyPlaybackRateToVideo(el: HTMLVideoElement): void {
  const raw = el.dataset.playbackRate?.trim();
  if (!raw) return;
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n) || n <= 0) return;
  const rate = Math.min(MAX_RATE, Math.max(MIN_RATE, n));
  try {
    el.playbackRate = rate;
  } catch {
    /* ignore */
  }
}

/**
 * Desktop vs mobile MP4 by viewport (same pattern as `why-clip-media.ts`), optional
 * `data-playback-rate`, and poster `picture.profile-gif-tile-poster` hide on `playing` /
 * show on `error` like Why clip.
 */
export function wireProfileGifTileMedia(root: ParentNode = document): void {
  const section = root.querySelector('.profile-section');
  if (!section) return;

  const stacks = section.querySelectorAll('.profile-gif-tile__stack');
  if (stacks.length === 0) {
    /* Backward compat: bare video without stack */
    for (const el of section.querySelectorAll(
      'video.profile-gif-tile__media',
    )) {
      if (!(el instanceof HTMLVideoElement)) continue;
      wireSingleVideoWithoutPoster(el);
    }
    return;
  }

  const mobileMq = window.matchMedia(WHY_CLIP_VIEWPORT_MOBILE_MQ);

  for (const stack of stacks) {
    const rawClip = stack.querySelector('video.profile-gif-tile__media');
    const posterEl = stack.querySelector('picture.profile-gif-tile-poster');
    if (!(rawClip instanceof HTMLVideoElement)) continue;
    /* Typed binding so nested `applySrc` (matchMedia callback) keeps HTMLVideoElement, not Element | null. */
    const clipVideo: HTMLVideoElement = rawClip;

    const hidePoster = (): void => {
      if (posterEl instanceof HTMLPictureElement) {
        posterEl.classList.add('is-hidden');
      }
    };
    const showPoster = (): void => {
      if (posterEl instanceof HTMLPictureElement) {
        posterEl.classList.remove('is-hidden');
      }
    };

    clipVideo.addEventListener('playing', hidePoster);
    clipVideo.addEventListener('error', showPoster);

    function applySrc(): void {
      const next = profileGifTileVideoPathForViewport(mobileMq);
      if (pathnameOfVideo(clipVideo) === next) {
        applyPlaybackRateToVideo(clipVideo);
        return;
      }

      showPoster();
      clipVideo.src = next;
      clipVideo.load();
      clipVideo.addEventListener(
        'loadedmetadata',
        () => {
          applyPlaybackRateToVideo(clipVideo);
        },
        { once: true },
      );
      void clipVideo.play().catch(() => {
        showPoster();
      });
      applyPlaybackRateToVideo(clipVideo);
    }

    applySrc();
    mobileMq.addEventListener('change', applySrc);
  }
}

function wireSingleVideoWithoutPoster(clipVideo: HTMLVideoElement): void {
  const mobileMq = window.matchMedia(WHY_CLIP_VIEWPORT_MOBILE_MQ);

  function applySrc(): void {
    const next = profileGifTileVideoPathForViewport(mobileMq);
    if (pathnameOfVideo(clipVideo) === next) {
      applyPlaybackRateToVideo(clipVideo);
      return;
    }
    clipVideo.src = next;
    clipVideo.load();
    clipVideo.addEventListener(
      'loadedmetadata',
      () => applyPlaybackRateToVideo(clipVideo),
      { once: true },
    );
    void clipVideo.play().catch(() => {});
    applyPlaybackRateToVideo(clipVideo);
  }

  applySrc();
  mobileMq.addEventListener('change', applySrc);
}
