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
    --profile-tile-1-bg: url('/assets/pages/profile/erwan-hesry-EMVhWOm4-qo-unsplash_dichrom_inverted.png');
    --profile-tile-1-pos-x: 30%;
    --profile-tile-1-pos-y: 50%;
    --profile-tile-1-zoom: 1.5;
    --profile-tile-1-saturation: 1;
    --profile-tile-1-brightness: 0.75;
    --profile-tile-1-contrast: 0.9;
    --profile-tile-3-bg: url('/assets/pages/profile/dillon-shook-ADxOq184yk8-unsplash_dichrom.png');
    --profile-tile-3-pos-x: 50%;
    --profile-tile-3-pos-y: 80%;
    --profile-tile-3-zoom: 1;
    --profile-tile-3-saturation: 1;
    --profile-tile-3-brightness: 1;
    --profile-tile-3-contrast: 1;
    --profile-tile-4-bg: url('/assets/pages/profile/nur-shahirah-ahmad-tarmizi-uS1u31FtAHk-unsplash_dichrom.png');
    --profile-tile-4-pos-x: 50%;
    --profile-tile-4-pos-y: 120%;
    --profile-tile-4-zoom: 1.2;
    --profile-tile-4-saturation: 1;
    --profile-tile-4-brightness: 1;
    --profile-tile-4-contrast: 1;
    --profile-tile-4-opacity: 0.6;
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
  <a
    href="/what-i-do"
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
    aria-label="What I do"
  >
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
      <span class="profile-tile-button__reveal-copy">
        <span class="profile-tile-button__reveal-stanza">
          What shaped me<br />
          Beyond the craft
        </span>
        <span class="profile-tile-button__reveal-stanza">
          More reading<br />
          more meaning
        </span>
      </span>
    </span>
  </a>
  </div>
</div>
