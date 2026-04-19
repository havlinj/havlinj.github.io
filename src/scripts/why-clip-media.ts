import { WHY_CLIP_VIEWPORT_MOBILE_MQ } from '../constants/why-layout';
import {
  clipVideoPathForViewport,
  pathnameOfMediaSrc,
} from '../utils/why-clip-media-logic';

function pathnameOfVideo(el: HTMLVideoElement): string {
  return pathnameOfMediaSrc(el.currentSrc, el.src, window.location.href);
}

(function setupWhyClipMedia(): void {
  const pageRoot = document.querySelector('.why-page');
  if (!pageRoot) return;

  const videoEl = pageRoot.querySelector('video.why-clip');
  const posterEl = pageRoot.querySelector('picture.why-clip-poster');
  if (!(videoEl instanceof HTMLVideoElement)) return;
  if (!(posterEl instanceof HTMLPictureElement)) return;

  const clipVideo = videoEl;
  const clipPoster = posterEl;

  const mobileMq = window.matchMedia(WHY_CLIP_VIEWPORT_MOBILE_MQ);

  const hidePoster = (): void => {
    clipPoster.classList.add('is-hidden');
  };
  const showPoster = (): void => {
    clipPoster.classList.remove('is-hidden');
  };

  clipVideo.addEventListener('playing', hidePoster);

  clipVideo.addEventListener('error', () => {
    showPoster();
  });

  function applyViewportVideo(): void {
    const next = clipVideoPathForViewport(mobileMq);
    if (pathnameOfVideo(clipVideo) === next) return;

    showPoster();
    clipVideo.src = next;
    clipVideo.load();
    void clipVideo.play().catch(() => {
      showPoster();
    });
  }

  applyViewportVideo();
  mobileMq.addEventListener('change', () => {
    applyViewportVideo();
  });
})();
