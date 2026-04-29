---
title: 'Profile'
---

<div
  class="profile-section profile-section--loading"
  style="
    /* Edge-anchored controls: independent Y offsets in % of the big square */
    /* Shared vertical reference from the bottom edge of the big box */
    --profile-groups-reference-from-bottom: 0%;
    --profile-why-offset-from-reference: 59%;
    --profile-what-offset-from-reference: 6%;
    --profile-foundations-offset-from-reference: 9.5%;
    --profile-portrait-y: 22%;
    --profile-why-width: 41%;
    --profile-why-height: 32%;
    --profile-what-width: 45%;
    --profile-what-height: 45%;
    --profile-foundations-width: 36%;
    --profile-foundations-height:38%;
    --profile-portrait-size: 29%;
    --profile-portrait-frame-padding: 3%;
    --profile-portrait-frame-padding-left-multiplier: 1.2;
    --profile-portrait-frame-anchor-extension:2%;
    --profile-tile-text-inset-anchor-x: 25%;
    --profile-tile-text-inset-far-x: 10%;
    --profile-reveal-text-inset-x: 8%;
    --panel-padding-top: 10%;
    --portrait-pos-x: 40%;
    --portrait-pos-y: 62%;
    --portrait-zoom: 1.12;
    --portrait-brightness: 1.08;
    --portrait-contrast: 1;
    --portrait-opacity: 0.92;
    --profile-tile-1-bg: url('/assets/pages/profile/tommy-RCA--h6cmcU-unsplash_dichrom.png');
    --profile-tile-1-pos-x: 50%;
    --profile-tile-1-pos-y: 60%;
    --profile-tile-1-pan-x: 0%;
    --profile-tile-1-pan-y: 0%;
    --profile-tile-1-zoom: 1;
    --profile-tile-1-brightness: 1;
    --profile-tile-1-contrast: 1.2;
    --profile-tile-1-opacity: 0.9;
    --profile-tile-3-pos-x: 50%;
    --profile-tile-3-pos-y: 50%;
    --profile-tile-3-pan-x: 10%;
    --profile-tile-3-pan-y: 5%;
    --profile-tile-3-zoom: 1.39;
    --profile-tile-3-brightness: 1.1;
    --profile-tile-3-contrast: 1;
    --profile-tile-3-opacity: 0.8;
    --profile-tile-4-bg: url('/assets/pages/profile/kevin-shi-gWerWoydZtc-unsplashdichrom.png');
    --profile-tile-4-pos-x: 50%;
    --profile-tile-4-pos-y: 60%;
    --profile-tile-4-pan-x: 0%;
    --profile-tile-4-pan-y: 0%;
    --profile-tile-4-zoom: 1;
    --profile-tile-4-brightness: 1;
    --profile-tile-4-contrast: 1;
    --profile-tile-4-opacity: 1;
    --profile-reveal-text-scale: 1.5;
  "
>
  <a
    href="/why-this"
    class="profile-tile profile-image-tile page-button prof-tile"
    style="
      --tile-bg: var(--profile-tile-1-bg);
      --tile-pos-x: var(--profile-tile-1-pos-x);
      --tile-pos-y: var(--profile-tile-1-pos-y);
      --tile-pan-x: var(--profile-tile-1-pan-x);
      --tile-pan-y: var(--profile-tile-1-pan-y);
      --tile-zoom: var(--profile-tile-1-zoom);
      --tile-brightness: var(--profile-tile-1-brightness);
      --tile-contrast: var(--profile-tile-1-contrast);
      --tile-image-opacity: var(--profile-tile-1-opacity);
    "
    aria-label="Why this"
  >
    <span class="page-button__bg" aria-hidden="true"></span>
    <span class="page-button__overlay" aria-hidden="true"></span>
    <span class="page-button__inner">
      <span class="page-button__glow-wrap" aria-hidden="true"><span class="page-button__glow">Why this</span></span>
      <span class="page-button__text">Why this</span>
    </span>
  </a>
  <a
    href="/what-i-do"
    class="profile-tile profile-gif-tile page-button prof-tile"
    style="
      --tile-pos-x: var(--profile-tile-3-pos-x, 50%);
      --tile-pos-y: var(--profile-tile-3-pos-y, 50%);
      --tile-pan-x: var(--profile-tile-3-pan-x, 0%);
      --tile-pan-y: var(--profile-tile-3-pan-y, 0%);
      --tile-zoom: var(--profile-tile-3-zoom, 1);
      --tile-brightness: var(--profile-tile-3-brightness, 1);
      --tile-contrast: var(--profile-tile-3-contrast, 1);
      --tile-image-opacity: var(--profile-tile-3-opacity, 1);
    "
    aria-label="What I do"
  >
    <div class="profile-gif-tile__stack">
      <picture class="profile-gif-tile-poster" aria-hidden="true">
        <!-- sync: WHY_CLIP_VIEWPORT_MOBILE_MQ in src/constants/why-layout.ts -->
        <source
          media="(max-width: 767px)"
          srcset="/assets/pages/profile/what-i-do/fallback_mobile.jpg"
        />
        <img
          src="/assets/pages/profile/what-i-do/fallback_desktop.jpg"
          alt=""
          decoding="async"
          width="1920"
          height="1080"
        />
      </picture>
      <video
        class="profile-gif-tile__media"
        data-playback-rate="0.62"
        autoplay
        muted
        loop
        playsinline
        preload="metadata"
        aria-hidden="true"
      ></video>
    </div>
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
      class="profile-tile profile-image-tile page-button prof-tile prof-tile--foundations"
      style="
        --tile-bg: var(--profile-tile-4-bg);
        --tile-pos-x: var(--profile-tile-4-pos-x);
        --tile-pos-y: var(--profile-tile-4-pos-y);
        --tile-pan-x: var(--profile-tile-4-pan-x);
        --tile-pan-y: var(--profile-tile-4-pan-y);
        --tile-zoom: var(--profile-tile-4-zoom);
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
    <span class="prof-tile__reveal" aria-hidden="true">
      <span class="tile-state-secondary">
        <span class="tile-state-secondary__inner">
        <span class="line-1">Writing might be<br>the better place to look</span>
        <span class="line-2">Still, step in here</span>
        </span>
      </span>
    </span>
  </a>
  </div>
</div>
