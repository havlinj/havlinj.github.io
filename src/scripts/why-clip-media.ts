(function setupWhyClipMedia(): void {
  const pageRoot = document.querySelector('.why-page');
  if (!pageRoot) return;

  const videoEl = pageRoot.querySelector('video.why-clip');
  if (!(videoEl instanceof HTMLVideoElement)) return;

  // Let native `loop` handle seam playback; manual seeks/restarts can add a hitch.
  videoEl.loop = true;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      if (videoEl.paused) {
        void videoEl.play().catch(() => {});
      }
    }
  });

  // `autoplay` can be blocked on some browsers despite muted+playsinline.
  // Keep runtime behavior robust and avoid unhandled promise warnings.
  void videoEl.play().catch(() => {});
})();
