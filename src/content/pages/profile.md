---
title: 'Profile'
---

<div
  class="profile-section profile-section--loading"
  style="
    /* Reveal idle = 50/50; Foundations expands upward (column - portrait side) with portrait */
    --profile-inner-gutter: 12%;
    --portrait-pos-x: 40%;
    --portrait-pos-y: 62%;
    --portrait-zoom: 1;
    --portrait-saturation: 1;
    --portrait-brightness: 1;
    --portrait-contrast: 1;
    --portrait-opacity: 1;
    --profile-tile-1-bg: url('/assets/pages/profile/illia-kholin-i51OubmBtw8-unsplash_dichrom.png');
    --profile-tile-1-pos-x: 50%;
    --profile-tile-1-pos-y: 50%;
    --profile-tile-1-pan-x: 10%;
    --profile-tile-1-pan-y: 15%;
    --profile-tile-1-zoom: 1.5;
    --profile-tile-1-saturation: 1;
    --profile-tile-1-brightness: 1.2;
    --profile-tile-1-contrast: 1;
    --profile-tile-1-opacity: 0.8;
    --profile-tile-3-pos-x: 50%;
    --profile-tile-3-pos-y: 50%;
    --profile-tile-3-pan-x: 10%;
    --profile-tile-3-pan-y: 5%;
    --profile-tile-3-zoom: 1.39;
    --profile-tile-3-saturation: 1;
    --profile-tile-3-brightness: 1.2;
    --profile-tile-3-contrast: 1;
    --profile-tile-3-opacity: 0.8;
    --profile-tile-4-bg: url('/assets/pages/profile/pedro-henrique-rWbEip80LN0-unsplash_dichrom.png');
    --profile-tile-4-pos-x: 50%;
    --profile-tile-4-pos-y: 50%;
    --profile-tile-4-pan-x: 15%;
       --profile-tile-4-pan-y: 20%;
    /* --profile-tile-4-pan-y: 20%; */
    --profile-tile-4-zoom: 1.4;
    --profile-tile-4-saturation: 1;
    --profile-tile-4-brightness: 1.2;
    --profile-tile-4-contrast: 1;
    --profile-tile-4-opacity: 0.8;
  "
>
  <a
    href="/why"
    class="profile-tile profile-image-tile page-button profile-tile-button"
    style="
      --tile-bg: var(--profile-tile-1-bg);
      --tile-pos-x: var(--profile-tile-1-pos-x);
      --tile-pos-y: var(--profile-tile-1-pos-y);
      --tile-pan-x: var(--profile-tile-1-pan-x);
      --tile-pan-y: var(--profile-tile-1-pan-y);
      --tile-zoom: var(--profile-tile-1-zoom);
      --tile-saturation: var(--profile-tile-1-saturation);
      --tile-brightness: var(--profile-tile-1-brightness);
      --tile-contrast: var(--profile-tile-1-contrast);
      --tile-image-opacity: var(--profile-tile-1-opacity);
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
  <a
    href="/what-i-do"
    class="profile-tile profile-gif-tile page-button profile-tile-button"
    style="
      --tile-pos-x: var(--profile-tile-3-pos-x, 50%);
      --tile-pos-y: var(--profile-tile-3-pos-y, 50%);
      --tile-pan-x: var(--profile-tile-3-pan-x, 0%);
      --tile-pan-y: var(--profile-tile-3-pan-y, 0%);
      --tile-zoom: var(--profile-tile-3-zoom, 1);
      --tile-saturation: var(--profile-tile-3-saturation, 1);
      --tile-brightness: var(--profile-tile-3-brightness, 1);
      --tile-contrast: var(--profile-tile-3-contrast, 1);
      --tile-image-opacity: var(--profile-tile-3-opacity, 1);
    "
    aria-label="What I do"
  >
    <video
      class="profile-gif-tile__media"
      autoplay
      muted
      loop
      playsinline
      preload="auto"
      aria-hidden="true"
    >
      <source src="/assets/pages/profile/raddy_13522186-hd_1920_1080_25fps_pexels_dichrom.webm" type="video/webm" />
      <source src="/assets/pages/profile/raddy_13522186-hd_1920_1080_25fps_pexels_dichrom.mp4" type="video/mp4" />
    </video>
    <span class="page-button__bg" aria-hidden="true"></span>
    <span class="page-button__overlay" aria-hidden="true"></span>
    <span class="page-button__inner">
      <span class="page-button__glow-wrap" aria-hidden="true"><span class="page-button__glow">What I do</span></span>
      <span class="page-button__text">What I do</span>
    </span>
  </a>
  <div class="profile-right-column">
    <div class="profile-tile profile-photo-frame">
      <div class="profile-photo-shell">
        <div class="profile-photo-box">
          <img
            src="/assets/pages/profile/portrait_bayer16_style.png"
            alt="Jan Havlín"
            fetchpriority="high"
            decoding="async"
          />
        </div>
      </div>
    </div>
    <a
      href="/foundations"
      class="profile-tile profile-image-tile page-button profile-tile-button profile-tile-button--foundations"
      style="
        --tile-bg: var(--profile-tile-4-bg);
        --tile-pos-x: var(--profile-tile-4-pos-x);
        --tile-pos-y: var(--profile-tile-4-pos-y);
        --tile-pan-x: var(--profile-tile-4-pan-x);
        --tile-pan-y: var(--profile-tile-4-pan-y);
        --tile-zoom: var(--profile-tile-4-zoom);
        --tile-saturation: var(--profile-tile-4-saturation);
        --tile-brightness: var(--profile-tile-4-brightness);
        --tile-contrast: var(--profile-tile-4-contrast);
        --tile-image-opacity: var(--profile-tile-4-opacity);
      "
      aria-label="Foundations"
    >
    <span class="page-button__bg" aria-hidden="true"></span>
    <span class="page-button__overlay" aria-hidden="true"></span>
    <span class="page-button__inner">
      <span class="page-button__glow-wrap" aria-hidden="true"><span class="page-button__glow">Foundations</span></span>
      <span class="page-button__text">Foundations</span>
    </span>
    <span class="profile-tile-button__reveal" aria-hidden="true">
      <span class="profile-tile-button__reveal-copy profile-tile-button__reveal-copy--center-left">
        <span class="profile-tile-button__reveal-stanza profile-tile-button__reveal-stanza--center-left"
          >Additional<br />context</span
        >
        <span class="profile-tile-button__reveal-stanza profile-tile-button__reveal-stanza--sub"
          >Beyond<br />the core</span
        >
      </span>
    </span>
  </a>
  </div>
</div>
