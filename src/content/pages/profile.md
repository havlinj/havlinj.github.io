---
title: 'Profile'
---

<div
  class="profile-section profile-section--loading"
  style="
    --portrait-tile-inset: 2.5rem;
    --portrait-pos-x: 40%;
    --portrait-pos-y: 65%;
    --portrait-zoom: 1.05;
    --portrait-saturation: 1;
    --portrait-brightness: 1;
    --portrait-contrast: 1;
    --panel-bg: url('/assets/pages/profile/dillon-shook-ADxOq184yk8-unsplash_dichrom.png');
    --panel-bg-pos-x: 100%;
    --panel-bg-pos-y: 45%;
    --panel-bg-saturation: 1;
    --panel-bg-brightness: 0.75;
    --panel-bg-contrast: 0.9;
    --panel-margin-top: 0;
    --panel-padding-top: 2rem;
    --panel-padding-left: 0;
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
    --profile-tile-4-saturation: 1;
    --profile-tile-4-brightness: 1;
    --profile-tile-4-contrast: 1;
  "
>
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
  <div class="profile-tile page-buttons-zone">
    <div class="page-buttons-panel" aria-label="Profile image + navigation">
      <nav class="profile-links" aria-label="Profile sections">
        <a href="/intro" class="page-button">
          <span class="page-button__bg" aria-hidden="true"></span>
          <span class="page-button__overlay" aria-hidden="true"></span>
          <span class="page-button__inner">
            <span class="page-button__glow-wrap" aria-hidden="true"><span class="page-button__glow">Intro</span></span>
            <span class="page-button__text">Intro</span>
          </span>
        </a>
        <a href="/professional" class="page-button">
          <span class="page-button__bg" aria-hidden="true"></span>
          <span class="page-button__overlay" aria-hidden="true"></span>
          <span class="page-button__inner">
            <span class="page-button__glow-wrap" aria-hidden="true"><span class="page-button__glow">Professional</span></span>
            <span class="page-button__text">Professional</span>
          </span>
        </a>
        <a href="/personal" class="page-button">
          <span class="page-button__bg" aria-hidden="true"></span>
          <span class="page-button__overlay" aria-hidden="true"></span>
          <span class="page-button__inner">
            <span class="page-button__glow-wrap" aria-hidden="true"><span class="page-button__glow">Personal</span></span>
            <span class="page-button__text">Personal</span>
          </span>
        </a>
      </nav>
    </div>
  </div>
  <div
    class="profile-tile profile-image-tile"
    style="
      --tile-bg: var(--profile-tile-3-bg);
      --tile-pos-x: var(--profile-tile-3-pos-x);
      --tile-pos-y: var(--profile-tile-3-pos-y);
      --tile-zoom: var(--profile-tile-3-zoom);
      --tile-saturation: var(--profile-tile-3-saturation);
      --tile-brightness: var(--profile-tile-3-brightness);
      --tile-contrast: var(--profile-tile-3-contrast);
    "
    aria-label="Profile image tile 3"
  ></div>
  <div
    class="profile-tile profile-image-tile"
    style="
      --tile-bg: var(--profile-tile-4-bg);
      --tile-pos-x: var(--profile-tile-4-pos-x);
      --tile-pos-y: var(--profile-tile-4-pos-y);
      --tile-zoom: var(--profile-tile-4-zoom);
      --tile-saturation: var(--profile-tile-4-saturation);
      --tile-brightness: var(--profile-tile-4-brightness);
      --tile-contrast: var(--profile-tile-4-contrast);
    "
    aria-label="Profile image tile 4"
  ></div>
</div>
