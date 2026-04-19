/* eslint-disable @typescript-eslint/ban-ts-comment -- intentional for this DOM-only entry */
// @ts-nocheck — DOM-heavy client script; early returns narrow types; full HTMLElement typing is noisy.
import './why-clip-media';
import { WHY_FIT_REFERENCE_LINE } from '../constants/why-fit-reference';
import {
  WHY_BODY_MAX_INSET_REM,
  WHY_CLIP_PLAYBACK_SINE_HIGH,
  WHY_CLIP_PLAYBACK_SINE_LOW,
  WHY_CLIP_PLAYBACK_SINE_PERIOD_MS,
  WHY_CLIP_PLAYBACK_SINE_PHASE_RAD,
  WHY_CLIP_PLAYBACK_WAVE,
  WHY_TEXT_RIGHT_GUTTER_REM,
} from '../constants/why-layout';
import { clamp } from '../utils/why-scroll-math';
import {
  applyCtaAttachedVeil,
  applyCtaFade,
  applyCtaScale,
  applyCtaVerticalMidpoint,
  buildCtaZone,
} from './why-scroll-cta';
import {
  computeEndPhase,
  middlePhaseRevolverGate,
  wheelDeltaToPixels,
  whyScrollPrefersReducedMotion,
} from './why-scroll-helpers';
import { readRootRemPx } from './why-scroll-dom';
import { createWhyScrollLayout } from './why-scroll-layout';
import { createWhyScrollRevolver } from './why-scroll-revolver';
import { createWhyScrollVeils } from './why-scroll-veils';

(function () {
  const scrollEl = document.querySelector('.why-page .why-scroll');
  if (!scrollEl) return;
  const boxEl = scrollEl.closest('.why-box');
  if (!boxEl) return;
  const pageMainEl = document.querySelector('main.content');
  const ctaEl = boxEl.querySelector('.why-scroll-cta');
  const contentEl = scrollEl.querySelector('.why-content');
  if (!contentEl) return;
  const topSpacer = scrollEl.querySelector('.why-spacer--top');
  const bottomSpacer = scrollEl.querySelector('.why-spacer--bottom');
  if (!topSpacer || !bottomSpacer) return;

  const lines = Array.from(scrollEl.querySelectorAll('p'));
  if (lines.length === 0) return;

  const gifEl = scrollEl.querySelector('.why-clip-holder');
  const introTopBandEl = boxEl.querySelector('.why-intro-top-band');
  const clipVideo = scrollEl.querySelector('video.why-clip');
  const clipPlaybackMid =
    (WHY_CLIP_PLAYBACK_SINE_LOW + WHY_CLIP_PLAYBACK_SINE_HIGH) / 2;
  if (clipVideo instanceof HTMLVideoElement) {
    clipVideo.playbackRate = clipPlaybackMid;
  }

  let clipSineRaf = 0;
  function stopClipPlaybackSineLoop() {
    if (clipSineRaf) {
      cancelAnimationFrame(clipSineRaf);
      clipSineRaf = 0;
    }
  }
  function tickClipPlaybackSine() {
    clipSineRaf = 0;
    if (!(clipVideo instanceof HTMLVideoElement)) return;
    if (whyScrollPrefersReducedMotion()) {
      clipVideo.playbackRate = clipPlaybackMid;
      return;
    }
    const periodSec = Math.max(1e-3, WHY_CLIP_PLAYBACK_SINE_PERIOD_MS / 1000);
    const tSec = performance.now() * 0.001;
    const phase =
      (tSec * (Math.PI * 2)) / periodSec + WHY_CLIP_PLAYBACK_SINE_PHASE_RAD;
    let wave;
    if (WHY_CLIP_PLAYBACK_WAVE === 'triangle') {
      const twoPi = Math.PI * 2;
      let p = phase % twoPi;
      if (p < 0) p += twoPi;
      wave = p < Math.PI ? p / Math.PI : 2 - p / Math.PI;
    } else {
      wave = (Math.sin(phase) + 1) * 0.5;
    }
    const rate =
      WHY_CLIP_PLAYBACK_SINE_LOW +
      wave * (WHY_CLIP_PLAYBACK_SINE_HIGH - WHY_CLIP_PLAYBACK_SINE_LOW);
    clipVideo.playbackRate = clamp(rate, 0.08, 4);
    clipSineRaf = requestAnimationFrame(tickClipPlaybackSine);
  }
  function startClipPlaybackSineLoop() {
    if (!(clipVideo instanceof HTMLVideoElement)) return;
    if (whyScrollPrefersReducedMotion()) {
      clipVideo.playbackRate = clipPlaybackMid;
      return;
    }
    if (clipSineRaf) return;
    clipSineRaf = requestAnimationFrame(tickClipPlaybackSine);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      stopClipPlaybackSineLoop();
      if (clipVideo instanceof HTMLVideoElement) {
        clipVideo.playbackRate = clipPlaybackMid;
      }
    } else {
      startClipPlaybackSineLoop();
    }
  });

  const leadForCta = scrollEl.querySelector('p.why-lead');
  const wideP = scrollEl.querySelector('.why-p--wide');
  const fitProbe = scrollEl.querySelector('.why-fit-probe');
  if (fitProbe) {
    fitProbe.textContent = WHY_FIT_REFERENCE_LINE;
  }

  /**
   * Magic numbers for /why scroll script only (tune here; behavior should stay intentional).
   */
  const T = {
    FONT_MIN: 0.52,
    /** Slower = less hunt with browser zoom / fractional layout. */
    FONT_LERP: 0.12,
    FONT_SNAP: 0.012,
    /** Tightens column budget so the width guard engages before obvious clipping. */
    FIT_SAFETY_PX: 6,
    START_COVER_BAND_MIN: 85,
    START_COVER_BAND_FRAC: 0.26,
    /** Intro top band on `.why-box`: full opacity until this scroll distance, then fades. */
    INTRO_TOP_BAND_HOLD_SCROLL_PX: 228,
    INTRO_TOP_BAND_FADE_SCROLL_PX: 340,
    /** Keep the start bottom cover fully visible for the first tiny scroll move(s). */
    START_COVER_HOLD_PX: 52,
    /** Fade span after hold; starts later so cover removal happens around the third notch. */
    START_COVER_FADE_PX: 58,
    /** Keep intro veil in "hard" state through the second notch. */
    INTRO_BOTTOM_VEIL_HARD_HOLD_PX: 112,
    /** Then release hard state smoothly during the next notch. */
    INTRO_BOTTOM_VEIL_HARD_FADE_PX: 52,
    /** Keep bottom fade band below `.why-p--wide` last line (+ this gap); drives --why-start-cover-height. */
    START_COVER_BELOW_WIDE_REM: 0.9,
    /** Cap JS-computed start-cover height (px); fallback CSS clamp when measurement skipped. */
    START_COVER_HEIGHT_MAX: 300,
    /**
     * Floor for start-cover / intro-veil band height vs `.why-box` outer height so veils track
     * the black panel when the viewport or box grows (not only the text gap below `.why-p--wide`).
     */
    START_COVER_FRAC_OF_BOX: 0.165,
    /**
     * When the text gap cannot be measured (`raw < 8`), derive height only from box height.
     */
    START_COVER_BOX_ONLY_FRAC: 0.155,
    /** After intro band: 1 = same "full" layer intensity as the top ::before (it only scales the gradient). */
    BOTTOM_VEIL_MAX_O: 1,
    /** Step-3-only veil window (short, mild helper veil after step-2). */
    STEP3_VEIL_IN_PX: 118,
    STEP3_VEIL_PEAK_PX: 150,
    STEP3_VEIL_OUT_PX: 214,
    STEP3_VEIL_MAX_O: 0.58,
    /**
     * At scrollTop ≈ 0, intro-only narrow bottom veil opacity (separate layer).
     * Keeps incoming body lines softened at the viewport edge without dimming the second intro line.
     */
    INTRO_BOTTOM_VEIL_BASE: 1,
    /** Intro-only veil fades out faster than start-cover so only the opening moment is affected. */
    INTRO_BOTTOM_VEIL_FADE_BAND_FRAC: 0.48,
    /** Intro-only bottom veil height vs measured start-cover height (cap INTRO_BOTTOM_VEIL_HEIGHT_MAX). */
    INTRO_BOTTOM_VEIL_HEIGHT_FRAC: 0.68,
    INTRO_BOTTOM_VEIL_HEIGHT_MIN: 64,
    INTRO_BOTTOM_VEIL_HEIGHT_MAX: 145,
    CTA_FADE_PX: 56,
    CTA_O_HIDDEN: 0.002,
    CTA_ZONE_MIN_O: 0.04,
    CTA_RECT_MIN: 4,
    CTA_ZONE_PAD_H_MIN: 24,
    CTA_ZONE_PAD_H_FRAC: 0.35,
    CTA_ZONE_PAD_TOP: 16,
    CTA_ZONE_PAD_BOTTOM: 28,
    /** CTA grows as the box gets narrower than baseline captured at init. */
    CTA_SCALE_NARROW_RANGE_PX: 520,
    CTA_SCALE_MAX_BOOST: 0.28,
    /** CTA center is this fraction from lead-bottom toward box-bottom. */
    CTA_FROM_LEAD_TO_BOTTOM_FRAC: 0.6,
    /** Min px below bottom of `.why-lead` / `.why-p--wide` before veil may start (zoom-stable air gap). */
    CTA_VEIL_CLEARANCE_BELOW_LEAD_PX: 28,
    /** Preferred offset: veil top this many px above arrow top (soft target). */
    CTA_VEIL_ABOVE_ARROW_PX: 6,
    /**
     * Hard cap: veil top must stay at least this many px above arrow top at all zooms
     * (smaller topEdge in px = higher on box). Tighten if black creeps toward the chevron.
     */
    CTA_VEIL_MIN_GAP_ABOVE_ARROW_PX: 16,
    /** Hysteresis for CTA overlap dimming to avoid early dim/bright flicker. */
    CTA_TEXT_DIM_ENTER_PX: 116,
    CTA_TEXT_DIM_EXIT_PX: 92,
    /** 0.5 = halfway between ref line bottom and box bottom; higher = closer to box bottom. */
    CTA_VERTICAL_FRAC_FROM_BOX_BOTTOM: 0.55,
    /** Keep CTA vertical center inside the box if geometry goes odd while scrolling. */
    CTA_TOP_CLAMP_MARGIN: 8,
    END_COVER_BAND_MIN: 70,
    END_COVER_BAND_FRAC: 0.22,
    /** Wider band (px): top ::before grows toward showcase line as scroll nears maxScroll. */
    END_TOP_VEIL_GROW_BAND_MIN: 100,
    END_TOP_VEIL_GROW_BAND_FRAC: 0.34,
    /** Clearance above “There are no project showcases…” (matches --why-edge-veil-height vh terms). */
    END_TOP_VEIL_MARGIN_ABOVE_SHOWCASE_REM: 0.62,
    /** Do not let the top veil swallow almost the whole panel. */
    END_TOP_VEIL_MAX_FRAC_OF_BOX: 0.78,
    INTRO_LINE_COUNT: 2,
    INTRO_RAMP_MIN: 100,
    INTRO_RAMP_FRAC: 0.22,
    /** Hysteresis around strict-start lock threshold to prevent on/off flicker at handoff. */
    INTRO_STRICT_LOCK_ENTER_FRAC: 0.33,
    INTRO_STRICT_LOCK_EXIT_FRAC: 0.39,
    /**
     * Top of `.why-lead` sits at LEAD_TOP_FRAC × .why-box height from the box top (scroll panel).
     * padTop + topSpacer + introGifPad = H * LEAD_TOP_FRAC − padTop. (Older “from bottom” baseline
     * wording differed; this matches "lead top edge at half height".)
     */
    LEAD_TOP_FRAC: 0.5,
    GIF_NARROW_REF_PX: 520,
    GIF_NARROW_RANGE: 220,
    /** Target drawn GIF height vs `.why-box` outer height (uniform scale); not tied to font zoom. */
    GIF_MAX_BOX_FRAC: 0.4,
    /** On narrow panels, max GIF height × (1 − this × narrowness). */
    GIF_BOX_NARROW_SHAVE: 0.12,
    GIF_MIN_LEAD_MULT: 0.68,
    GIF_MIN_BOX_FRAC: 0.065,
    GIF_MIN_ABS_PX: 24,
    /** Extra intro padding below the GIF band, as a fraction of lead line height (proportional air). */
    GIF_TO_LEAD_CLEARANCE_MULT: 0.08,
    /** Cap intro GIF pad vs scroll height so tiny boxes don’t collapse. */
    GIF_INTRO_PAD_MAX_FRAC: 0.48,
    GIF_BASE_SCALE_MIN: 0.5,
    END_SCROLL_EXTRA_FRAC: 0.32,
    /*
     * Narrower center focus band: fewer lines stay at "max scale + min inset".
     * This makes the highlighted reading window tighter in the middle phase.
     */
    REVOLVER_CENTER_BAND: 0.28,
    REVOLVER_TRANSITION_BAND: 0.38,
    /** Temporal smoothing for revolver transforms (middle phase feels less jittery). */
    REVOLVER_BLEND_SNAP: 0.01,
    LEAD_SCALE_DROP: 0.3,
    BODY_SCALE_DROP: 0.5,
    LEAD_MAX_INSET_REM: 2.4,
    BODY_MAX_INSET_REM: 4,
    /** Lower = GIF sits slightly lower, more air above lead (optical gap). */
    GIF_LIFT_LEAD_MULT: 0.62,
    GIF_SCALE_DROP: 0.35,
    GIF_MAX_INSET_REM: 3.2,
    GIF_OPACITY_DROP: 0.75,
    LINE_OVERLAP_Y: 0.92,
    LINE_OVERLAP_X: 0.12,
    GIF_OVERLAP_Y: 0.9,
    GIF_OVERLAP_X: 0.1,
    /**
     * Compare integer scrollTop so subpixel / zoom noise does not flip “is scrolling”.
     */
    REVOLVER_SCROLL_SNAP_PX: 1,
    /**
     * If |ΔscrollTop| is below this, treat as idle for skip + snap lerp (px).
     */
    REVOLVER_SCROLL_IDLE_EPS: 2.75,
    /** Ignore maxScroll jitter below this when deciding layout changed (px). */
    REVOLVER_MAX_SCROLL_JITTER_EPS: 3,
    /** Consecutive “would idle” rAF passes before we stop writing revolver (needs settle/font rAF). */
    REVOLVER_IDLE_FRAMES: 3,
    /** Snap revolver blend to target when scroll movement is tiny (stops ring at zoom). */
    REVOLVER_LERP_INSTANT_BELOW_PX: 2.5,
    /** Quantize --why-font-scale steps to reduce wrap-width ping-pong at odd zoom. */
    FONT_SCALE_QUANT: 0.005,
    /** Consecutive rAF passes with probe overflow before `main` min-width lock (no FONT_MIN gate — lerp can lag). */
    FIT_FAIL_FRAMES: 4,
    FIT_FAIL_LOCK_PADDING_PX: 6,
    /** Safety reserve so widest line still fits with a tiny buffer. */
    FIT_LOCK_SAFETY_PX: 1,
    /** <1 = mouse wheel moves the panel slower (only when we handle wheel below). */
    WHEEL_SCROLL_FACTOR: 0.78,
    /** Per-frame catch-up toward wheel target scrollTop (higher = quicker, lower = smoother). */
    WHEEL_TARGET_EASE: 0.42,
    /** Snap to wheel target when close to avoid endless tiny increments. */
    WHEEL_TARGET_SNAP_PX: 0.45,
    /**
     * ~1 keeps revolver catching up while lines move through the band (too low = they never
     * read as smaller + inset). Wheel damping already slows scroll; lerp stays fairly snappy.
     */
    REVOLVER_LERP_SPEED: 0.94,
  };

  const revolver = createWhyScrollRevolver({
    scrollEl,
    lines,
    gifEl,
    leadForCta,
    T,
  });

  let whyFontScale = 1;
  let fontScaleSettled = false;
  let fitFailStreak = 0;
  let runtimeLockedMinBoxWidth = 0;
  let lastScrollTopSnapped = Math.round(
    scrollEl.scrollTop / T.REVOLVER_SCROLL_SNAP_PX,
  );
  let lastMaxScrollForRevolverFreeze = -1;
  let hasAppliedRevolverOnce = false;
  let revolverIdleStreak = 0;
  /** When true, skip font fit this frame — breaks measure↔scale feedback while revolver is frozen. */
  let prevFrameRevolverIdle = false;

  let rafId = 0;
  let settleFrames = 0;
  let resizeQuietTimer = 0;
  let wheelTargetTop = Number.NaN;
  /** Gap (box top → frame top) last sampled at scroll top; frozen once the user scrolls so the band can overlap the clip without growing past the live inset. */
  let introTopBandAnchorPx = 0;
  let layoutObserver: ResizeObserver | null = null;
  let ctaScaleBaselineBoxWidth = 0;

  const layout = createWhyScrollLayout({
    scrollEl,
    boxEl,
    contentEl,
    topSpacer,
    bottomSpacer,
    lines,
    gifEl,
    leadForCta,
    T,
    bumpSettleFrames: (n) => {
      settleFrames = Math.max(settleFrames, n);
    },
  });

  const veils = createWhyScrollVeils({
    scrollEl,
    boxEl,
    wideP,
    T,
  });

  /**
   * Revolver should be strongest in the middle scroll phase only.
   * - start edge: keep opening paragraphs fully stable (no revolver transform)
   * - end edge: keep final paragraphs fully stable (no revolver transform)
   * Smooth ramps preserve continuity into/out of the effect.
   */
  function middlePhaseRevolverGateForFrame(m) {
    return middlePhaseRevolverGate(
      scrollEl.scrollTop,
      m.maxScroll,
      scrollEl.clientHeight,
      T.INTRO_RAMP_MIN,
      T.INTRO_RAMP_FRAC,
      T.END_COVER_BAND_MIN,
      T.END_COVER_BAND_FRAC,
    );
  }

  function wideColumnContentWidthPx() {
    if (!(wideP instanceof HTMLElement)) return 0;
    const rootRem = readRootRemPx();
    const pCs = getComputedStyle(wideP);
    const padL = Number.parseFloat(pCs.paddingLeft) || 0;
    const padR =
      Number.parseFloat(pCs.paddingRight) ||
      WHY_TEXT_RIGHT_GUTTER_REM * rootRem;
    const innerW = Math.max(0, wideP.clientWidth - padL - padR);
    const reserveRevolver = WHY_BODY_MAX_INSET_REM * rootRem;
    return Math.max(0, innerW - reserveRevolver - T.FIT_SAFETY_PX);
  }

  function computeWhyFontTarget() {
    if (!(wideP instanceof HTMLElement) || !(fitProbe instanceof HTMLElement))
      return 1;
    const contentW = wideColumnContentWidthPx();
    scrollEl.style.setProperty('--why-font-scale', whyFontScale.toFixed(4));
    void scrollEl.offsetWidth;
    const w = fitProbe.getBoundingClientRect().width;
    if (w < 2) return 1;
    const wPerUnit = w / Math.max(1e-4, whyFontScale);
    return clamp(contentW / wPerUnit, T.FONT_MIN, 1);
  }

  function measureFitOverflowPx() {
    if (!(wideP instanceof HTMLElement) || !(fitProbe instanceof HTMLElement))
      return 0;
    const contentW = wideColumnContentWidthPx();
    scrollEl.style.setProperty('--why-font-scale', whyFontScale.toFixed(4));
    void scrollEl.offsetWidth;
    const probeW = fitProbe.getBoundingClientRect().width;
    // Positive value means widest sentence is already clipping in available column width.
    return probeW - (contentW + T.FIT_LOCK_SAFETY_PX);
  }

  function applyFontScaleStep() {
    const fontTarget = computeWhyFontTarget();
    whyFontScale += (fontTarget - whyFontScale) * T.FONT_LERP;
    if (Math.abs(fontTarget - whyFontScale) < T.FONT_SNAP) {
      whyFontScale = fontTarget;
    }
    const q =
      Math.round(whyFontScale / T.FONT_SCALE_QUANT) * T.FONT_SCALE_QUANT;
    scrollEl.style.setProperty('--why-font-scale', q.toFixed(4));
    whyFontScale = q;
    fontScaleSettled = Math.abs(fontTarget - whyFontScale) <= T.FONT_SNAP * 2.5;
    if (Math.abs(fontTarget - whyFontScale) > T.FONT_SNAP * 2) {
      settleFrames = Math.max(settleFrames, 2);
    }
  }

  const schedule = () => {
    if (rafId) return;
    rafId = requestAnimationFrame(update);
  };

  const requestZoomSettle = (frames = 4) => {
    settleFrames = Math.max(settleFrames, frames);
    schedule();
  };

  /** One rAF per burst while resizing; extra passes only after zoom/resize is quiet. */
  function onViewportResize() {
    introTopBandAnchorPx = 0;
    prevFrameRevolverIdle = false;
    revolverIdleStreak = 0;
    revolver.resetGifRevolverStyleKey();
    schedule();
    if (resizeQuietTimer) window.clearTimeout(resizeQuietTimer);
    resizeQuietTimer = window.setTimeout(() => {
      resizeQuietTimer = 0;
      settleFrames = Math.max(settleFrames, 4);
      schedule();
    }, 110);
  }

  function applyIntroTopBand(metrics: { boxOuterRect: DOMRect }) {
    if (!(introTopBandEl instanceof HTMLElement)) return;
    if (whyScrollPrefersReducedMotion()) {
      introTopBandEl.style.setProperty('--why-intro-top-band-opacity', '0');
      introTopBandEl.style.setProperty('--why-intro-top-band-height', '0px');
      return;
    }
    const boxR = metrics.boxOuterRect;
    const frame = scrollEl.querySelector('.why-clip-frame');
    if (!(frame instanceof HTMLElement)) {
      introTopBandEl.style.setProperty('--why-intro-top-band-height', '0px');
      introTopBandEl.style.setProperty('--why-intro-top-band-opacity', '0');
      return;
    }
    const fr = frame.getBoundingClientRect();
    const gapNow = Math.max(0, Math.round(fr.top - boxR.top));
    const st = scrollEl.scrollTop;
    const AT_TOP_PX = 1;
    if (st <= AT_TOP_PX) {
      introTopBandAnchorPx = gapNow;
    }
    const heightPx =
      introTopBandAnchorPx > 0
        ? Math.max(1, introTopBandAnchorPx)
        : Math.max(1, gapNow);
    const hold = T.INTRO_TOP_BAND_HOLD_SCROLL_PX;
    const fadeSpan = T.INTRO_TOP_BAND_FADE_SCROLL_PX;
    let op = 1;
    if (st <= hold) op = 1;
    else if (st >= hold + fadeSpan) op = 0;
    else {
      const t = clamp((st - hold) / fadeSpan, 0, 1);
      op = Math.pow(1 - t, 2.4);
    }
    op = clamp(op, 0, 1);
    introTopBandEl.style.setProperty(
      '--why-intro-top-band-height',
      op <= 0 ? '0px' : `${heightPx}px`,
    );
    introTopBandEl.style.setProperty(
      '--why-intro-top-band-opacity',
      String(op),
    );
  }

  function update() {
    rafId = 0;

    if (Number.isFinite(wheelTargetTop)) {
      const cur = scrollEl.scrollTop;
      const target = wheelTargetTop;
      const dist = target - cur;
      if (Math.abs(dist) <= T.WHEEL_TARGET_SNAP_PX) {
        scrollEl.scrollTop = target;
        wheelTargetTop = Number.NaN;
      } else {
        scrollEl.scrollTop = cur + dist * T.WHEEL_TARGET_EASE;
      }
    }

    const m = layout.readLayoutMetrics();
    if (!prevFrameRevolverIdle) {
      applyFontScaleStep();
    }
    applyIntroTopBand(m);
    const overflowPx = measureFitOverflowPx();
    const fitAtLimit = overflowPx > 0;
    if (fitAtLimit) fitFailStreak++;
    else fitFailStreak = 0;
    if (
      runtimeLockedMinBoxWidth <= 0 &&
      fitFailStreak >= T.FIT_FAIL_FRAMES &&
      m.boxRect.width > 0
    ) {
      runtimeLockedMinBoxWidth =
        Math.ceil(m.boxRect.width) + T.FIT_FAIL_LOCK_PADDING_PX;
      const lockWidth = `${runtimeLockedMinBoxWidth}px`;
      if (pageMainEl instanceof HTMLElement) {
        pageMainEl.style.minWidth = lockWidth;
      }
    }
    const scrollSnapStep = Math.round(
      scrollEl.scrollTop / T.REVOLVER_SCROLL_SNAP_PX,
    );
    const scrollDeltaPx =
      Math.abs(scrollSnapStep - lastScrollTopSnapped) *
      T.REVOLVER_SCROLL_SNAP_PX;
    lastScrollTopSnapped = scrollSnapStep;

    veils.applyStartCover();
    const ctaO = applyCtaFade({
      scrollTop: scrollEl.scrollTop,
      ctaFadePx: T.CTA_FADE_PX,
      ctaHiddenOpacity: T.CTA_O_HIDDEN,
      boxEl,
      ctaEl,
    });
    applyCtaVerticalMidpoint({
      boxEl,
      ctaEl,
      leadForCta,
      metrics: m,
      ctaFromLeadToBottomFrac: T.CTA_FROM_LEAD_TO_BOTTOM_FRAC,
      ctaVerticalFracFromBoxBottom: T.CTA_VERTICAL_FRAC_FROM_BOX_BOTTOM,
      ctaTopClampMargin: T.CTA_TOP_CLAMP_MARGIN,
    });
    ctaScaleBaselineBoxWidth = applyCtaScale({
      boxEl,
      ctaEl,
      metrics: m,
      baselineBoxWidth: ctaScaleBaselineBoxWidth,
      scaleNarrowRangePx: T.CTA_SCALE_NARROW_RANGE_PX,
      scaleMaxBoost: T.CTA_SCALE_MAX_BOOST,
    });
    applyCtaAttachedVeil({
      boxEl,
      ctaEl,
      leadForCta,
      wideP,
      ctaOpacity: ctaO,
      ctaHiddenOpacity: T.CTA_O_HIDDEN,
      veilAboveArrowPx: T.CTA_VEIL_ABOVE_ARROW_PX,
      veilClearanceBelowLeadPx: T.CTA_VEIL_CLEARANCE_BELOW_LEAD_PX,
      veilMinGapAboveArrowPx: T.CTA_VEIL_MIN_GAP_ABOVE_ARROW_PX,
    });
    const ctaZone = buildCtaZone({
      ctaEl,
      ctaOpacity: ctaO,
      ctaZoneMinOpacity: T.CTA_ZONE_MIN_O,
      ctaRectMin: T.CTA_RECT_MIN,
      ctaZonePadHMin: T.CTA_ZONE_PAD_H_MIN,
      ctaZonePadHFrac: T.CTA_ZONE_PAD_H_FRAC,
      ctaZonePadTop: T.CTA_ZONE_PAD_TOP,
      ctaZonePadBottom: T.CTA_ZONE_PAD_BOTTOM,
    });

    const introBlend = veils.applyIntroTopEdge();
    const phaseGate = middlePhaseRevolverGateForFrame(m);

    const combinedForLead = layout.leadAnchorCombinedScrollPx(m);
    const gifFootprintPx = layout.computeGifFootprintPx(m, combinedForLead);
    layout.applySpacersAndIntroVars(m, gifFootprintPx, combinedForLead);
    veils.applyStartCoverBandSizing();

    const maxScrollNow = Math.max(
      0,
      scrollEl.scrollHeight - scrollEl.clientHeight,
    );
    const maxScrollChangedForRevolver =
      lastMaxScrollForRevolverFreeze >= 0 &&
      Math.abs(maxScrollNow - lastMaxScrollForRevolverFreeze) >
        T.REVOLVER_MAX_SCROLL_JITTER_EPS;
    lastMaxScrollForRevolverFreeze = maxScrollNow;

    const endPhaseNow = computeEndPhase(
      scrollEl.scrollTop,
      scrollEl.clientHeight,
      maxScrollNow,
      T.END_COVER_BAND_MIN,
      T.END_COVER_BAND_FRAC,
    );
    veils.applyEndPhaseCss(endPhaseNow);
    veils.applyTopVeilHeight(maxScrollNow, endPhaseNow);

    const rawRevolverIdle =
      scrollDeltaPx < T.REVOLVER_SCROLL_IDLE_EPS &&
      settleFrames === 0 &&
      fontScaleSettled &&
      !maxScrollChangedForRevolver;
    if (rawRevolverIdle) revolverIdleStreak++;
    else revolverIdleStreak = 0;

    const revolverIdle =
      hasAppliedRevolverOnce && revolverIdleStreak >= T.REVOLVER_IDLE_FRAMES;

    if (!revolverIdle) {
      revolver.applyLineRevolver(
        m,
        introBlend,
        ctaZone,
        scrollDeltaPx,
        phaseGate,
      );
      const active = revolver.pickActiveLineForGif(m);
      revolver.applyGifRevolver(
        m,
        introBlend,
        ctaZone,
        active,
        scrollDeltaPx,
        phaseGate,
      );
      hasAppliedRevolverOnce = true;
    }

    prevFrameRevolverIdle = revolverIdle;

    if (settleFrames > 0) {
      settleFrames -= 1;
      schedule();
    }
    if (Number.isFinite(wheelTargetTop)) {
      schedule();
    }
  }

  function afterTwoFrames(fn) {
    requestAnimationFrame(() => requestAnimationFrame(fn));
  }

  function revealAfterStableLayout() {
    update();
    update();
    contentEl.classList.remove('why-content--pending-layout');
    contentEl.classList.add('why-content--ready');
  }

  function init() {
    if (document.visibilityState === 'visible') {
      startClipPlaybackSineLoop();
    }
    const fontsReady = document.fonts?.ready ?? Promise.resolve();
    fontsReady.finally(() => afterTwoFrames(revealAfterStableLayout));
    if ('ResizeObserver' in window) {
      layoutObserver = new ResizeObserver(() => {
        requestZoomSettle(6);
      });
      layoutObserver.observe(boxEl);
      if (leadForCta instanceof HTMLElement) layoutObserver.observe(leadForCta);
      if (ctaEl instanceof HTMLElement) layoutObserver.observe(ctaEl);
      layoutObserver.observe(scrollEl);
    }
  }

  scrollEl.addEventListener('scroll', schedule, { passive: true });
  scrollEl.addEventListener(
    'wheel',
    (event) => {
      if (event.ctrlKey) {
        requestZoomSettle(8);
        return;
      }
      if (whyScrollPrefersReducedMotion()) return;
      event.preventDefault();
      const maxScroll = Math.max(
        0,
        scrollEl.scrollHeight - scrollEl.clientHeight,
      );
      const dy =
        wheelDeltaToPixels(
          event.deltaY,
          event.deltaZ || 0,
          event.deltaMode,
          scrollEl.clientHeight || 1,
        ) * T.WHEEL_SCROLL_FACTOR;
      const base = Number.isFinite(wheelTargetTop)
        ? wheelTargetTop
        : scrollEl.scrollTop;
      wheelTargetTop = clamp(base + dy, 0, maxScroll);
      schedule();
    },
    { passive: false },
  );
  window.addEventListener('resize', onViewportResize);
  window.visualViewport?.addEventListener('resize', onViewportResize);
  init();
})();
