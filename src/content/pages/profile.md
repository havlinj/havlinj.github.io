---
title: 'Profile'
---

<div
  class="profile-section profile-section--loading"
  style="
    --portrait-tile-inset: 0;
    --portrait-pos-x: 40%;
    --portrait-pos-y: 65%;
    --portrait-zoom: 1.05;
    --portrait-saturation: 1;
    --portrait-brightness: 1;
    --portrait-contrast: 1;
    --profile-tile-1-bg: url('/assets/pages/profile/dillon-shook-ADxOq184yk8-unsplash_dichrom.png');
    --profile-tile-1-pos-x: 100%;
    --profile-tile-1-pos-y: 45%;
    --profile-tile-1-zoom: 1;
    --profile-tile-1-saturation: 1;
    --profile-tile-1-brightness: 0.75;
    --profile-tile-1-contrast: 0.9;
    --profile-tile-3-bg: url('/assets/pages/profile/tai-bui-yKX7wC_VioM-unsplash_dichrom.png');
    --profile-tile-3-pos-x: 50%;
    --profile-tile-3-pos-y: 50%;
    --profile-tile-3-zoom: 1;
    --profile-tile-3-saturation: 1;
    --profile-tile-3-brightness: 1;
    --profile-tile-3-contrast: 1;
    --profile-tile-4-bg: url('/assets/pages/profile/atelierbyvineeth-e9JnKvY6O5A-unsplash_dichrom.png');
    --profile-tile-4-pos-x: 50%;
    --profile-tile-4-pos-y: 50%;
    --profile-tile-4-zoom: 1.05;
    --profile-tile-4-saturation: 2;
    --profile-tile-4-brightness: 1;
    --profile-tile-4-contrast: 1;
    --profile-tile-4-opacity: 0.3;
  "
>
  <a
    href="/why"
    class="profile-tile profile-image-tile page-button profile-tile-button"
    style="
      --tile-bg: var(--profile-tile-1-bg);
      --tile-pos-x: var(--profile-tile-1-pos-x);
      --tile-pos-y: var(--profile-tile-1-pos-y);
      --tile-zoom: var(--profile-tile-1-zoom);
      --tile-saturation: var(--profile-tile-1-saturation);
      --tile-brightness: var(--profile-tile-1-brightness);
      --tile-contrast: var(--profile-tile-1-contrast);
    "
    aria-label="Why"
  >
    <span class="page-button__bg" aria-hidden="true"></span>
    <span class="page-button__overlay" aria-hidden="true"></span>
    <span class="page-button__inner">
      <span class="page-button__glow-wrap" aria-hidden="true"><span class="page-button__glow">Why</span></span>
      <span class="page-button__text">Why</span>
    </span>
  </a>
  <div class="profile-tile profile-photo-frame">
    <div class="profile-photo-box">
      <img
        src="/assets/pages/profile/portrait_bayer16_style.png"
        alt="Jan Havlín"
        fetchpriority="high"
        decoding="async"
      />
    </div>
  </div>
  <a
    href="/professional"
    class="profile-tile profile-image-tile page-button profile-tile-button"
    style="
      --tile-bg: var(--profile-tile-3-bg);
      --tile-pos-x: var(--profile-tile-3-pos-x);
      --tile-pos-y: var(--profile-tile-3-pos-y);
      --tile-zoom: var(--profile-tile-3-zoom);
      --tile-saturation: var(--profile-tile-3-saturation);
      --tile-brightness: var(--profile-tile-3-brightness);
      --tile-contrast: var(--profile-tile-3-contrast);
    "
    aria-label="Professional"
  >
    <span class="page-button__bg" aria-hidden="true"></span>
    <span class="page-button__overlay" aria-hidden="true"></span>
    <span class="page-button__inner">
      <span class="page-button__glow-wrap" aria-hidden="true"><span class="page-button__glow">Professional</span></span>
      <span class="page-button__text">Professional</span>
    </span>
  </a>
  <a
    href="/perspective"
    class="profile-tile profile-image-tile page-button profile-tile-button profile-tile-button--perspective"
    style="
      --tile-bg: var(--profile-tile-4-bg);
      --tile-pos-x: var(--profile-tile-4-pos-x);
      --tile-pos-y: var(--profile-tile-4-pos-y);
      --tile-zoom: var(--profile-tile-4-zoom);
      --tile-saturation: var(--profile-tile-4-saturation);
      --tile-brightness: var(--profile-tile-4-brightness);
      --tile-contrast: var(--profile-tile-4-contrast);
      --tile-image-opacity: var(--profile-tile-4-opacity);
    "
    aria-label="Perspective"
  >
    <span class="page-button__bg" aria-hidden="true"></span>
    <span class="page-button__overlay" aria-hidden="true"></span>
    <span class="page-button__inner">
      <span class="page-button__glow-wrap" aria-hidden="true"><span class="page-button__glow">Perspective</span></span>
      <span class="page-button__text">Perspective</span>
    </span>
    <span class="profile-tile-button__reveal" aria-hidden="true">
      Worldview &amp; identity.<br />
      Useful context.<br />
      Not essential.
    </span>
  </a>
</div>

<script is:inline>
  document.addEventListener('DOMContentLoaded', () => {
    const perspectiveTile = document.querySelector('.profile-tile-button--perspective');
    if (!(perspectiveTile instanceof HTMLAnchorElement)) return;

    perspectiveTile.addEventListener('click', (event) => {
      if (perspectiveTile.classList.contains('is-revealed')) return;
      event.preventDefault();
      perspectiveTile.classList.add('is-revealed');
    });
  });
</script>
