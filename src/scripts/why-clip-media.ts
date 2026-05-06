(function setupWhyClipMedia(): void {
  const pageRoot = document.querySelector('.why-page');
  if (!pageRoot) return;

  const videoEl = pageRoot.querySelector('video.why-clip');
  if (!(videoEl instanceof HTMLVideoElement)) return;

  // `autoplay` can be blocked on some browsers despite muted+playsinline.
  // Keep runtime behavior robust and avoid unhandled promise warnings.
  void videoEl.play().catch(() => {});
})();
