/* eslint-disable @typescript-eslint/ban-ts-comment -- intentional for this DOM-only entry */
// @ts-nocheck — DOM-heavy client script; early returns narrow types; full HTMLElement typing is noisy.
import { WHY_FIT_REFERENCE_LINE } from '../constants/why-fit-reference';
import {
  WHY_BODY_MAX_INSET_REM,
  WHY_CTA_EDGE_MIN_PX,
  WHY_CTA_EDGE_WIDTH_FRAC,
  WHY_CTA_LEAD_TRACK,
  WHY_TEXT_RIGHT_GUTTER_REM,
} from '../constants/why-layout';
import {
  clamp,
  middlePhaseRevolverGate as computeMiddlePhaseRevolverGate,
  revolverLerpForDelta as computeRevolverLerpForDelta,
  smoothstep,
  wheelDeltaToPixels as toWheelPixels,
} from '../utils/why-scroll-math';

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

  const gifEl = scrollEl.querySelector('.why-gif-holder');
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
    FIT_SAFETY_PX: 3,
    START_COVER_BAND_MIN: 85,
    START_COVER_BAND_FRAC: 0.26,
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
    /** Narrower intro-only veil height relative to measured start-cover height. */
    INTRO_BOTTOM_VEIL_HEIGHT_FRAC: 0.46,
    INTRO_BOTTOM_VEIL_HEIGHT_MIN: 52,
    INTRO_BOTTOM_VEIL_HEIGHT_MAX: 92,
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
    /** CTA-attached veil ramps when arrow gets close to lead line. */
    CTA_VEIL_PROXIMITY_BAND_PX: 130,
    /** Keep CTA veil top safely below the lead line. */
    CTA_VEIL_CLEARANCE_BELOW_LEAD_PX: 8,
    /** Start full-black CTA veil slightly above arrow top edge. */
    CTA_VEIL_ABOVE_ARROW_PX: 6,
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
    /** Detect sustained fit failure at extreme zoom before applying runtime width guard. */
    FIT_FAIL_TARGET_EPS: 0.004,
    FIT_FAIL_FRAMES: 8,
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

  let whyFontScale = 1;
  let fontScaleSettled = false;
  let fitFailStreak = 0;
  let runtimeLockedMinBoxWidth = 0;
  const lineBlendState = lines.map(() => 0);
  let gifBlendState = 0;
  let lastScrollTopSnapped = Math.round(
    scrollEl.scrollTop / T.REVOLVER_SCROLL_SNAP_PX,
  );
  let lastMaxScrollForRevolverFreeze = -1;
  let hasAppliedRevolverOnce = false;
  let revolverIdleStreak = 0;
  let strictStartLockActive = true;
  let ctaTextDimActive = false;
  /** When true, skip font fit this frame — breaks measure↔scale feedback while revolver is frozen. */
  let prevFrameRevolverIdle = false;
  const lineLastRevolverStyles = new WeakMap();
  let gifLastRevolverKey = '';

  function revolverLerpForDelta(scrollDeltaPx) {
    return computeRevolverLerpForDelta(
      scrollDeltaPx,
      T.REVOLVER_LERP_INSTANT_BELOW_PX,
      T.REVOLVER_LERP_SPEED,
    );
  }

  function wheelDeltaToPixels(ev) {
    return toWheelPixels(
      ev.deltaY,
      ev.deltaZ || 0,
      ev.deltaMode,
      scrollEl.clientHeight || 1,
    );
  }

  function whyScrollPrefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /** Coarsen normalized distance so edgeProgress does not flutter at fractional zoom. */
  function quantizeRevolverNormalized(n) {
    if (!Number.isFinite(n)) return n;
    return Math.round(n * 40) / 40;
  }

  /** Integer-safe center of the scrollport in content Y (avoids subpixel scrollTop noise). */
  function viewportCenterContentYStable() {
    const st = Math.round(scrollEl.scrollTop);
    const ch = Math.round(scrollEl.clientHeight);
    return st + ch * 0.5;
  }

  function applyLineRevolverStylesIfChanged(line, scaleStr, insetStr, opStr) {
    const prev = lineLastRevolverStyles.get(line);
    if (
      prev &&
      prev.s === scaleStr &&
      prev.i === insetStr &&
      prev.o === opStr
    ) {
      return;
    }
    line.style.setProperty('--why-line-scale', scaleStr);
    line.style.setProperty('--why-line-inset', insetStr);
    line.style.setProperty('--why-line-opacity', opStr);
    lineLastRevolverStyles.set(line, {
      s: scaleStr,
      i: insetStr,
      o: opStr,
    });
  }

  function readRootRemPx() {
    return (
      Number.parseFloat(getComputedStyle(document.documentElement).fontSize) ||
      16
    );
  }

  function firstLineRectInElement(el) {
    if (!(el instanceof HTMLElement)) return null;
    try {
      const range = document.createRange();
      range.selectNodeContents(el);
      const rects = range.getClientRects();
      if (rects.length > 0) return rects[0];
    } catch {
      /* ignore Range errors */
    }
    return null;
  }

  function lastLineBottomInElement(el) {
    if (!(el instanceof HTMLElement)) return null;
    try {
      const range = document.createRange();
      range.selectNodeContents(el);
      const rects = range.getClientRects();
      if (rects.length > 0) return rects[rects.length - 1].bottom;
    } catch {
      /* ignore Range errors */
    }
    return null;
  }

  function isStrictStartLock() {
    const introRampPx = Math.max(
      T.INTRO_RAMP_MIN,
      scrollEl.clientHeight * T.INTRO_RAMP_FRAC,
    );
    // Near scroll top: opening scene fixed — applied only to first INTRO_LINE_COUNT lines in revolver.
    // Use small hysteresis so boundary noise does not rapidly toggle lock on/off (visible blink).
    const enterPx = introRampPx * T.INTRO_STRICT_LOCK_ENTER_FRAC;
    const exitPx = introRampPx * T.INTRO_STRICT_LOCK_EXIT_FRAC;
    if (strictStartLockActive) {
      if (scrollEl.scrollTop > exitPx) strictStartLockActive = false;
    } else if (scrollEl.scrollTop < enterPx) {
      strictStartLockActive = true;
    }
    return strictStartLockActive;
  }

  function isStrictEndLock(m) {
    if (m.maxScroll <= 1) return false;
    const endBandPx = Math.max(
      T.END_COVER_BAND_MIN,
      scrollEl.clientHeight * T.END_COVER_BAND_FRAC,
    );
    return m.maxScroll - scrollEl.scrollTop <= endBandPx * 0.45;
  }

  /**
   * Revolver should be strongest in the middle scroll phase only.
   * - start edge: keep opening paragraphs fully stable (no revolver transform)
   * - end edge: keep final paragraphs fully stable (no revolver transform)
   * Smooth ramps preserve continuity into/out of the effect.
   */
  function middlePhaseRevolverGate(m) {
    return computeMiddlePhaseRevolverGate(
      scrollEl.scrollTop,
      m.maxScroll,
      scrollEl.clientHeight,
      T.INTRO_RAMP_MIN,
      T.INTRO_RAMP_FRAC,
      T.END_COVER_BAND_MIN,
      T.END_COVER_BAND_FRAC,
    );
  }

  /**
   * Pre-transform layout height of the GIF column (16:9 frame). Do not use
   * getBoundingClientRect() on `.why-gif-holder` — scale() is applied there and
   * would feed back into footprint math (flicker / stuck mid-zoom).
   */
  function gifLayoutHeightPx() {
    if (!gifEl) return 0;
    let h = gifEl.offsetHeight;
    if (h <= 0) {
      const frame = gifEl.querySelector('.why-gif-frame');
      if (frame) h = frame.offsetHeight;
    }
    if (h <= 0) {
      const w = gifEl.offsetWidth;
      if (w > 0) h = (w * 9) / 16;
    }
    return h;
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

  /**
   * Vertical center of `el` in .why-scroll **content** coordinates (ignores CSS transform on lines),
   * so revolver targets do not feedback from getBoundingClientRect + scale/translate jitter at zoom.
   */
  function elementCenterYInScrollContent(el) {
    if (!(el instanceof Element)) return Number.NaN;
    let top = 0;
    let n = el;
    while (n && n !== scrollEl) {
      top += n.offsetTop;
      n = n.offsetParent;
    }
    if (n !== scrollEl) return Number.NaN;
    return Math.round((top + el.offsetHeight * 0.5) * 4) / 4;
  }

  function readLayoutMetrics() {
    const maxScroll = Math.max(
      0,
      scrollEl.scrollHeight - scrollEl.clientHeight,
    );
    const boxRect = scrollEl.getBoundingClientRect();
    const contentRect = contentEl.getBoundingClientRect();
    const boxOuterRect = boxEl.getBoundingClientRect();
    const half = boxRect.height / 2;
    const center = boxRect.top + half;
    const leadEl = leadForCta ?? lines[0];
    const leadRect = leadEl.getBoundingClientRect();
    const leadHeight = leadRect.height || 0;
    const gifLayoutHeight = gifLayoutHeightPx();
    const scrollStyle = window.getComputedStyle(scrollEl);
    const padTop = Number.parseFloat(scrollStyle.paddingTop) || 0;
    const padBottom = Number.parseFloat(scrollStyle.paddingBottom) || 0;

    return {
      maxScroll,
      boxRect,
      contentRect,
      boxOuterRect,
      half,
      center,
      leadEl,
      leadRect,
      leadHeight,
      gifLayoutHeight,
      padTop,
      padBottom,
    };
  }

  function lineTextStartLeftPx(lineEl) {
    try {
      const range = document.createRange();
      range.selectNodeContents(lineEl);
      const rects = range.getClientRects();
      if (rects.length > 0) return rects[0].left;
    } catch {
      /* ignore Range errors and use fallback */
    }
    const rr = lineEl.getBoundingClientRect();
    const cs = getComputedStyle(lineEl);
    const padL = Number.parseFloat(cs.paddingLeft) || 0;
    return rr.left + padL;
  }

  function ctaOverlapMultiplier(rect, zone, yWeight, xWeight) {
    const oy =
      Math.min(rect.bottom, zone.bottom) - Math.max(rect.top, zone.top);
    if (oy <= 0) return 1;
    const ox =
      Math.min(rect.right, zone.right) - Math.max(rect.left, zone.left);
    if (ox <= 0) return 1;
    const fracY = oy / Math.max(rect.height, 1);
    const fracX = ox / Math.max(rect.width, 1);
    return 1 - smoothstep(Math.min(1, fracY * yWeight + fracX * xWeight));
  }

  function applyStartCover() {
    const startBandPx = Math.max(
      T.START_COVER_BAND_MIN,
      scrollEl.clientHeight * T.START_COVER_BAND_FRAC,
    );
    const holdPx = Math.min(T.START_COVER_HOLD_PX, startBandPx * 0.6);
    const fadePx = Math.max(1, Math.min(T.START_COVER_FADE_PX, startBandPx));
    const startProgress = clamp((scrollEl.scrollTop - holdPx) / fadePx, 0, 1);
    const startOpacity = 1 - smoothstep(startProgress);
    boxEl.style.setProperty(
      '--why-start-cover-opacity',
      startOpacity.toFixed(3),
    );
    const introHardProgress = clamp(
      (scrollEl.scrollTop - T.INTRO_BOTTOM_VEIL_HARD_HOLD_PX) /
        T.INTRO_BOTTOM_VEIL_HARD_FADE_PX,
      0,
      1,
    );
    const introHardPhase = 1 - smoothstep(introHardProgress);
    boxEl.style.setProperty(
      '--why-intro-bottom-veil-hard',
      introHardPhase.toFixed(3),
    );
    const sm = smoothstep(startProgress);
    const outwardRamp = sm * T.BOTTOM_VEIL_MAX_O;
    const veilOpacity = Math.min(1, outwardRamp);
    boxEl.style.setProperty(
      '--why-bottom-veil-opacity',
      veilOpacity.toFixed(3),
    );

    const st = scrollEl.scrollTop;
    const step3InT = clamp(
      (st - T.STEP3_VEIL_IN_PX) /
        Math.max(1, T.STEP3_VEIL_PEAK_PX - T.STEP3_VEIL_IN_PX),
      0,
      1,
    );
    const step3OutT = clamp(
      (st - T.STEP3_VEIL_PEAK_PX) /
        Math.max(1, T.STEP3_VEIL_OUT_PX - T.STEP3_VEIL_PEAK_PX),
      0,
      1,
    );
    const step3Opacity =
      smoothstep(step3InT) * (1 - smoothstep(step3OutT)) * T.STEP3_VEIL_MAX_O;
    boxEl.style.setProperty('--why-step3-veil-opacity', step3Opacity.toFixed(3));

    // Separate intro-only narrow veil: strong at scrollTop 0, gone quickly.
    const introFadeBandPx = Math.max(
      1,
      startBandPx * T.INTRO_BOTTOM_VEIL_FADE_BAND_FRAC,
    );
    const introHoldPx = Math.min(holdPx * 0.8, introFadeBandPx * 0.45);
    const introProgress = clamp(
      (scrollEl.scrollTop - introHoldPx) / introFadeBandPx,
      0,
      1,
    );
    const introOpacityBase =
      (1 - smoothstep(introProgress)) * T.INTRO_BOTTOM_VEIL_BASE;
    // While hard phase is active, force intro veil opacity to max so early wheel notches
    // fully hide revolver motion at the bottom edge.
    const introOpacity = Math.max(introOpacityBase, introHardPhase);
    boxEl.style.setProperty(
      '--why-intro-bottom-veil-opacity',
      introOpacity.toFixed(3),
    );
  }

  /**
   * Size the bottom start-cover (and matching .why-box::after) so its top sits at
   * last line of `.why-p--wide` + START_COVER_BELOW_WIDE_REM. Stops the gradient
   * from washing out that line at odd zoom/viewport heights (fixed vh clamp was too tall).
   */
  function applyStartCoverBandSizing() {
    const rootRem = readRootRemPx();
    const marginPx = T.START_COVER_BELOW_WIDE_REM * rootRem;
    let lineBottom = lastLineBottomInElement(wideP);
    if (
      (lineBottom == null || !Number.isFinite(lineBottom)) &&
      wideP instanceof HTMLElement
    ) {
      lineBottom = wideP.getBoundingClientRect().bottom;
    }

    const scrollB = scrollEl.getBoundingClientRect();
    const cs = window.getComputedStyle(scrollEl);
    const borderBottom = Number.parseFloat(cs.borderBottomWidth) || 0;
    const innerBottom = scrollB.bottom - borderBottom;

    let hStr = null;
    if (lineBottom != null && Number.isFinite(lineBottom)) {
      const raw = innerBottom - lineBottom - marginPx;
      if (raw >= 8) {
        const hPx = Math.min(T.START_COVER_HEIGHT_MAX, raw);
        hStr = `${Math.round(hPx * 4) / 4}px`;
        const introVeilHeight = clamp(
          hPx * T.INTRO_BOTTOM_VEIL_HEIGHT_FRAC,
          T.INTRO_BOTTOM_VEIL_HEIGHT_MIN,
          T.INTRO_BOTTOM_VEIL_HEIGHT_MAX,
        );
        boxEl.style.setProperty(
          '--why-intro-bottom-veil-height',
          `${Math.round(introVeilHeight)}px`,
        );
      }
    }

    if (hStr == null) {
      if (lastStartCoverHeightStr !== '') {
        lastStartCoverHeightStr = '';
        boxEl.style.removeProperty('--why-start-cover-height');
      }
      boxEl.style.removeProperty('--why-intro-bottom-veil-height');
      return;
    }
    if (hStr !== lastStartCoverHeightStr) {
      lastStartCoverHeightStr = hStr;
      boxEl.style.setProperty('--why-start-cover-height', hStr);
    }
  }

  function applyCtaFade(): number {
    const ctaProgress = clamp(scrollEl.scrollTop / T.CTA_FADE_PX, 0, 1);
    const ctaO = 1 - smoothstep(ctaProgress);
    boxEl.style.setProperty('--why-cta-opacity', ctaO.toFixed(3));
    if (ctaEl) {
      ctaEl.style.visibility = ctaO < T.CTA_O_HIDDEN ? 'hidden' : 'visible';
    }
    return ctaO;
  }

  function applyCtaHorizontalAnchor(m) {
    if (!ctaEl || !(leadForCta instanceof HTMLElement)) return;
    const firstLine = firstLineRectInElement(leadForCta);
    if (!firstLine) return;
    let anchor =
      firstLine.left -
      m.boxOuterRect.left +
      WHY_CTA_LEAD_TRACK * firstLine.width;
    const edge = Math.max(
      WHY_CTA_EDGE_MIN_PX,
      m.boxOuterRect.width * WHY_CTA_EDGE_WIDTH_FRAC,
    );
    anchor = clamp(anchor, edge, m.boxOuterRect.width - edge);
    boxEl.style.setProperty('--why-cta-left', `${anchor.toFixed(2)}px`);
  }

  /**
   * Vertical center of the CTA: from `.why-box` bottom, go up by
   * CTA_VERTICAL_FRAC_FROM_BOX_BOTTOM × (distance from that bottom to the bottom of the last
   * line of `.why-p--wide`). `top` + translate(-50%, -50%) places the arrow’s center there.
   */
  function applyCtaVerticalMidpoint(m) {
    if (!ctaEl) return;
    const boxTop = m.boxOuterRect.top;
    const boxBottom = m.boxOuterRect.bottom;
    const boxH = m.boxOuterRect.height;
    const f = T.CTA_FROM_LEAD_TO_BOTTOM_FRAC;
    const leadBottom = lastLineBottomInElement(leadForCta);
    let targetY;
    if (leadBottom == null || !Number.isFinite(leadBottom)) {
      targetY = boxBottom - T.CTA_VERTICAL_FRAC_FROM_BOX_BOTTOM * boxH;
    } else {
      const gap = Math.max(0, boxBottom - leadBottom);
      targetY = leadBottom + f * gap;
    }
    let topPx = targetY - boxTop;
    topPx = clamp(
      topPx,
      T.CTA_TOP_CLAMP_MARGIN,
      Math.max(T.CTA_TOP_CLAMP_MARGIN, boxH - T.CTA_TOP_CLAMP_MARGIN),
    );
    boxEl.style.setProperty('--why-cta-top', `${topPx.toFixed(2)}px`);
  }

  function applyCtaScale(m) {
    if (!ctaEl) return;
    if (ctaScaleBaselineBoxWidth <= 0 && m.boxOuterRect.width > 0) {
      ctaScaleBaselineBoxWidth = m.boxOuterRect.width;
    }
    const baseline = ctaScaleBaselineBoxWidth || m.boxOuterRect.width;
    const narrowness = clamp(
      (baseline - m.boxOuterRect.width) / T.CTA_SCALE_NARROW_RANGE_PX,
      0,
      1,
    );
    const scale = 1 + T.CTA_SCALE_MAX_BOOST * smoothstep(narrowness);
    boxEl.style.setProperty('--why-cta-scale', scale.toFixed(3));
  }

  function applyCtaAttachedVeil(ctaO) {
    if (!ctaEl || !(leadForCta instanceof HTMLElement) || ctaO <= T.CTA_O_HIDDEN) {
      boxEl.style.setProperty('--why-cta-veil-top', '100%');
      boxEl.style.setProperty('--why-cta-veil-opacity', '0');
      return;
    }
    const leadBottom = lastLineBottomInElement(leadForCta);
    const wideBottom = lastLineBottomInElement(wideP);
    const boxRect = boxEl.getBoundingClientRect();
    const ctaRect = ctaEl.getBoundingClientRect();
    if (
      leadBottom == null ||
      !Number.isFinite(leadBottom) ||
      ctaRect.height <= 0 ||
      boxRect.height <= 0
    ) {
      boxEl.style.setProperty('--why-cta-veil-top', '100%');
      boxEl.style.setProperty('--why-cta-veil-opacity', '0');
      return;
    }
    const distance = ctaRect.top - leadBottom;
    const band = Math.max(T.CTA_VEIL_PROXIMITY_BAND_PX, ctaRect.height * 2.6);
    const proximity = clamp(1 - distance / band, 0, 1);
    // Fully opaque cover while CTA exists; remove together when CTA is hidden.
    const localStrength = clamp(0.86 + 0.14 * smoothstep(proximity), 0, 1);
    const o = localStrength * ctaO;
    const guardBottom = Math.max(
      leadBottom,
      Number.isFinite(wideBottom) ? wideBottom : Number.NEGATIVE_INFINITY,
    );
    const guardBottomLocal = guardBottom - boxRect.top;
    const ctaTopLocal = ctaRect.top - boxRect.top;
    const desiredTop = ctaTopLocal - T.CTA_VEIL_ABOVE_ARROW_PX;
    const topEdge = clamp(
      Math.max(desiredTop, guardBottomLocal + T.CTA_VEIL_CLEARANCE_BELOW_LEAD_PX),
      0,
      boxRect.height,
    );
    boxEl.style.setProperty('--why-cta-veil-top', `${Math.round(topEdge)}px`);
    boxEl.style.setProperty('--why-cta-veil-opacity', o.toFixed(3));
  }

  function buildCtaZone(
    m,
    ctaO,
  ): null | { left: number; right: number; top: number; bottom: number } {
    if (
      !ctaEl ||
      ctaO <= T.CTA_ZONE_MIN_O ||
      ctaEl.style.visibility === 'hidden'
    ) {
      return null;
    }
    const cr = ctaEl.getBoundingClientRect();
    if (cr.width <= T.CTA_RECT_MIN || cr.height <= T.CTA_RECT_MIN) return null;
    const padH = Math.max(
      T.CTA_ZONE_PAD_H_MIN,
      cr.width * T.CTA_ZONE_PAD_H_FRAC,
    );
    return {
      left: cr.left - padH,
      right: cr.right + padH,
      top: cr.top - T.CTA_ZONE_PAD_TOP,
      bottom: cr.bottom + T.CTA_ZONE_PAD_BOTTOM,
    };
  }

  /** Matches why.css clamp(130px, 22vh, 230px) / clamp(42px, 8vh, 86px). */
  function edgeVeilHeightPx() {
    const vh = window.innerHeight;
    return clamp(130, vh * 0.22, 230);
  }

  function edgeVeilEndHeightPx() {
    const vh = window.innerHeight;
    return clamp(42, vh * 0.08, 86);
  }

  function computeEndPhase(maxScroll) {
    const coverBandPx = Math.max(
      T.END_COVER_BAND_MIN,
      scrollEl.clientHeight * T.END_COVER_BAND_FRAC,
    );
    const coverProgress = maxScroll
      ? clamp(
          (scrollEl.scrollTop - (maxScroll - coverBandPx)) / coverBandPx,
          0,
          1,
        )
      : 0;
    return smoothstep(coverProgress);
  }

  function applyEndPhaseCss(endPhase) {
    boxEl.style.setProperty('--why-end-phase', endPhase.toFixed(3));
    boxEl.style.setProperty('--why-end-cover-opacity', endPhase.toFixed(3));
  }

  /**
   * Near maxScroll, extend the top ::before veil downward toward the close-block lead
   * (“There are no project showcases…”) so coverage ramps smoothly at the real stop.
   */
  function applyTopVeilHeight(maxScroll, endPhase) {
    const baseVeil = edgeVeilHeightPx();
    const endVeil = edgeVeilEndHeightPx();
    const hShrunk = baseVeil - (baseVeil - endVeil) * endPhase;

    const growBandPx = Math.max(
      T.END_TOP_VEIL_GROW_BAND_MIN,
      scrollEl.clientHeight * T.END_TOP_VEIL_GROW_BAND_FRAC,
    );
    const distFromEnd = Math.max(0, maxScroll - scrollEl.scrollTop);
    const growT =
      maxScroll > 1 && growBandPx > 0
        ? 1 - clamp(distFromEnd / growBandPx, 0, 1)
        : 0;
    const growPhase = smoothstep(growT);

    const showcaseP = scrollEl.querySelector(
      '.why-block--close > p:not(.why-close)',
    );
    const boxRect = boxEl.getBoundingClientRect();
    const maxH = boxRect.height * T.END_TOP_VEIL_MAX_FRAC_OF_BOX;

    let targetH = hShrunk;
    if (showcaseP instanceof HTMLElement && maxScroll > 1) {
      const pRect = showcaseP.getBoundingClientRect();
      const rootRem =
        Number.parseFloat(
          getComputedStyle(document.documentElement).fontSize,
        ) || 16;
      const margin = T.END_TOP_VEIL_MARGIN_ABOVE_SHOWCASE_REM * rootRem;
      const rawTarget = pRect.top - boxRect.top - margin;
      targetH = clamp(Math.max(rawTarget, hShrunk), hShrunk, maxH);
    }

    const hFinal = hShrunk + (targetH - hShrunk) * growPhase;
    const hStr = `${Math.round(hFinal * 4) / 4}px`;
    boxEl.style.setProperty('--why-top-veil-current-height-px', hStr);
    boxEl.style.setProperty('--why-end-top-veil-grow', growPhase.toFixed(3));
  }

  function applyIntroTopEdge(): number {
    const introRampPx = Math.max(
      T.INTRO_RAMP_MIN,
      scrollEl.clientHeight * T.INTRO_RAMP_FRAC,
    );
    const introBlend = smoothstep(
      clamp(scrollEl.scrollTop / introRampPx, 0, 1),
    );
    boxEl.style.setProperty('--why-top-edge-opacity', introBlend.toFixed(3));
    return introBlend;
  }

  /**
   * Vertical budget for the intro band:
   * - `baseDisplayPx`: how tall the GIF is drawn (uniform scale, 16:9 frame unchanged).
   * - `gifFootprintPx` (returned): padding-top for intro = display height + clearance vs lead
   *   so the gap scales with lead size without stretching the asset.
   * - `footprintMaxPx` caps intro pad so lead anchor (padTop + topSpacer + pad) stays fixed.
   */
  function computeGifFootprintPx(m, footprintMaxPx) {
    const layoutH = m.gifLayoutHeight;
    let gifFootprintPx = layoutH;
    if (layoutH > 0 && gifEl) {
      const narrowness = clamp(
        (T.GIF_NARROW_REF_PX - m.boxRect.width) / T.GIF_NARROW_RANGE,
        0,
        1,
      );
      const narrowFactor = clamp(
        1 - T.GIF_BOX_NARROW_SHAVE * narrowness,
        0.65,
        1,
      );
      const boxH = m.boxOuterRect.height;
      const maxByBox = boxH * T.GIF_MAX_BOX_FRAC * narrowFactor;
      const minByLead = Math.max(
        m.leadHeight * T.GIF_MIN_LEAD_MULT,
        boxH * T.GIF_MIN_BOX_FRAC,
        T.GIF_MIN_ABS_PX,
      );
      let baseDisplayPx = clamp(
        Math.min(layoutH, maxByBox),
        minByLead,
        layoutH,
      );
      const clearancePx = m.leadHeight * T.GIF_TO_LEAD_CLEARANCE_MULT;
      const padMax = boxH * T.GIF_INTRO_PAD_MAX_FRAC;
      const desiredPad = baseDisplayPx + clearancePx;
      gifFootprintPx = Math.max(baseDisplayPx, Math.min(desiredPad, padMax));
      gifFootprintPx = Math.min(gifFootprintPx, footprintMaxPx);

      const maxBaseForFootprint = Math.max(0, gifFootprintPx - clearancePx);
      if (baseDisplayPx > maxBaseForFootprint) {
        baseDisplayPx = clamp(
          maxBaseForFootprint,
          T.GIF_MIN_ABS_PX,
          Math.min(layoutH, maxByBox),
        );
      }
      baseDisplayPx = Math.min(baseDisplayPx, gifFootprintPx);

      const gifBaseScale = clamp(
        baseDisplayPx / layoutH,
        T.GIF_BASE_SCALE_MIN,
        1,
      );
      const scaleStr = gifBaseScale.toFixed(3);
      if (scaleStr !== lastGifBaseScaleStr) {
        lastGifBaseScaleStr = scaleStr;
        gifEl.style.setProperty('--why-gif-base-scale', scaleStr);
      }
    } else if (gifEl && lastGifBaseScaleStr !== '1.000') {
      lastGifBaseScaleStr = '1.000';
      gifEl.style.setProperty('--why-gif-base-scale', '1.000');
    }
    return gifFootprintPx;
  }

  /** Sum (topSpacer + introGifPad) so lead top = LEAD_TOP_FRAC × why-box height from box top. */
  function leadAnchorCombinedScrollPx(m) {
    const H = m.boxOuterRect.height;
    return Math.max(0, H * T.LEAD_TOP_FRAC - m.padTop);
  }

  function applySpacersAndIntroVars(m, gifFootprintPx, combinedForLeadPx) {
    const padQuantized = Math.round(gifFootprintPx * 4) / 4;
    const topSpacerPx = Math.max(0, combinedForLeadPx - padQuantized);
    const endScrollExtraPx = m.half * T.END_SCROLL_EXTRA_FRAC;
    const legacyFloor = m.half - m.padBottom - padQuantized + endScrollExtraPx;
    const endBandPx = Math.max(
      T.END_COVER_BAND_MIN,
      scrollEl.clientHeight * T.END_COVER_BAND_FRAC,
    );
    const nearEndLockZone =
      scrollEl.scrollTop >= Math.max(0, m.maxScroll - endBandPx * 2);

    // Keep the end stop stable: at max scroll, midpoint of the last 2 paragraphs
    // should sit on the viewport center regardless of zoom/font scaling.
    // Use layout-space metrics (offsetTop/offsetHeight), not transformed rects,
    // to avoid feedback jitter from active scale/translate transforms.
    const lastTwo = lines.slice(-2);
    let bottomSpacerPx = Math.max(0, legacyFloor);
    if (nearEndLockZone && lastTwo.length === 2) {
      const c0 = lastTwo[0].offsetTop + lastTwo[0].offsetHeight / 2;
      const c1 = lastTwo[1].offsetTop + lastTwo[1].offsetHeight / 2;
      const targetCenterContentY = contentEl.offsetTop + (c0 + c1) / 2;
      const requiredMaxScroll = Math.max(0, targetCenterContentY - m.half);
      const currentBottomSpacerPx = bottomSpacer.offsetHeight || 0;
      const contentWithoutBottomSpacer =
        scrollEl.scrollHeight - currentBottomSpacerPx;
      const neededBottomSpacerPx =
        requiredMaxScroll + scrollEl.clientHeight - contentWithoutBottomSpacer;
      bottomSpacerPx = Math.max(0, neededBottomSpacerPx, legacyFloor);
      // Quantize stronger to suppress sub-pixel spacer ping-pong near end lock.
      bottomSpacerPx = Math.round(bottomSpacerPx * 2) / 2;
    }
    const topStr = `${topSpacerPx.toFixed(2)}px`;
    const botStr = `${bottomSpacerPx.toFixed(2)}px`;
    let spacerChanged = false;
    if (topStr !== lastTopSpacerStr) {
      lastTopSpacerStr = topStr;
      topSpacer.style.height = topStr;
      spacerChanged = true;
    }
    if (botStr !== lastBottomSpacerStr) {
      lastBottomSpacerStr = botStr;
      bottomSpacer.style.height = botStr;
      spacerChanged = true;
    }

    const padTopStr = `${m.padTop.toFixed(2)}px`;
    const introPadStr = `${padQuantized.toFixed(2)}px`;
    if (padTopStr !== lastScrollPadTopStr) {
      lastScrollPadTopStr = padTopStr;
      contentEl.style.setProperty('--why-scroll-pad-top', padTopStr);
    }
    if (introPadStr !== lastIntroGifPadStr) {
      lastIntroGifPadStr = introPadStr;
      contentEl.style.setProperty('--why-intro-gif-pad', introPadStr);
    }
    contentEl.style.setProperty('--why-gif-nudge-y', '0px');
    if (spacerChanged && nearEndLockZone) {
      // Spacer changes alter scrollHeight/maxScroll; force a couple of follow-up frames
      // so edge-phase gating settles correctly even after fast wheel/touch bursts.
      settleFrames = Math.max(settleFrames, 2);
    }
  }

  function applyLineRevolver(m, introBlend, ctaZone, scrollDeltaPx, phaseGate) {
    const lerp = revolverLerpForDelta(scrollDeltaPx);
    const strictStart = isStrictStartLock();
    const strictEnd = isStrictEndLock(m);
    if (ctaTextDimActive) {
      if (scrollEl.scrollTop <= T.CTA_TEXT_DIM_EXIT_PX) ctaTextDimActive = false;
    } else if (scrollEl.scrollTop >= T.CTA_TEXT_DIM_ENTER_PX) {
      ctaTextDimActive = true;
    }
    const effectiveCtaZone = ctaTextDimActive ? ctaZone : null;
    const halfContent = Math.max(1, Math.round(scrollEl.clientHeight) * 0.5);
    const viewportCenterContentY = viewportCenterContentYStable();
    lines.forEach((line, lineIndex) => {
      const isWideIntroLine = line.classList.contains('why-p--wide');
      const lineCY = elementCenterYInScrollContent(line);
      let normalized;
      if (Number.isFinite(lineCY) && halfContent > 1) {
        normalized = Math.abs(lineCY - viewportCenterContentY) / halfContent;
      } else {
        const r = line.getBoundingClientRect();
        const mid = (r.top + r.bottom) / 2;
        normalized = Math.abs(mid - m.center) / m.half;
      }
      normalized = quantizeRevolverNormalized(normalized);

      const edgeProgress = clamp(
        (normalized - T.REVOLVER_CENTER_BAND) / T.REVOLVER_TRANSITION_BAND,
        0,
        1,
      );
      const eased = smoothstep(edgeProgress);
      const gate = lineIndex < T.INTRO_LINE_COUNT ? introBlend : 1;
      const targetBlend = eased * gate * phaseGate;
      const strictStartThisLine = strictStart && lineIndex < T.INTRO_LINE_COUNT;
      // Keep the wide intro sentence fully stable to prevent startup "glint"/flicker.
      if (isWideIntroLine) {
        lineBlendState[lineIndex] = 0;
        applyLineRevolverStylesIfChanged(line, '1.00', '0.00rem', '1.000');
        return;
      }
      if (phaseGate <= 0.001 || strictStartThisLine || strictEnd) {
        lineBlendState[lineIndex] = 0;
        let lineOp = 1;
        const isLeadLine = line.classList.contains('why-lead');
        if (effectiveCtaZone && !isLeadLine && !isWideIntroLine) {
          lineOp = ctaOverlapMultiplier(
            line.getBoundingClientRect(),
            effectiveCtaZone,
            T.LINE_OVERLAP_Y,
            T.LINE_OVERLAP_X,
          );
        }
        applyLineRevolverStylesIfChanged(
          line,
          '1.00',
          '0.00rem',
          lineOp.toFixed(3),
        );
        return;
      }
      const prevBlend = lineBlendState[lineIndex] ?? 0;
      let blendedEased = prevBlend + (targetBlend - prevBlend) * lerp;
      if (Math.abs(targetBlend - blendedEased) < T.REVOLVER_BLEND_SNAP) {
        blendedEased = targetBlend;
      }
      lineBlendState[lineIndex] = blendedEased;

      const isLead = line.classList.contains('why-lead');
      const scaleDrop = isLead ? T.LEAD_SCALE_DROP : T.BODY_SCALE_DROP;
      const maxInset = isLead ? T.LEAD_MAX_INSET_REM : T.BODY_MAX_INSET_REM;
      const scale = 1 - scaleDrop * blendedEased;
      const inset = maxInset * blendedEased;

      let lineOp = 1;
      if (effectiveCtaZone && !isLead && !isWideIntroLine) {
        lineOp = ctaOverlapMultiplier(
          line.getBoundingClientRect(),
          effectiveCtaZone,
          T.LINE_OVERLAP_Y,
          T.LINE_OVERLAP_X,
        );
      }
      applyLineRevolverStylesIfChanged(
        line,
        scale.toFixed(2),
        `${inset.toFixed(2)}rem`,
        lineOp.toFixed(3),
      );
    });
  }

  function pickActiveLineForGif(m) {
    let activeLineInset = 0;
    let activeLineDist = Number.POSITIVE_INFINITY;
    let activeLineLeftPx = Number.NaN;
    const viewportCenterContentY = viewportCenterContentYStable();
    lines.forEach((line) => {
      const lineCY = elementCenterYInScrollContent(line);
      const rr = line.getBoundingClientRect();
      const dist = Number.isFinite(lineCY)
        ? Math.abs(lineCY - viewportCenterContentY)
        : Math.abs((rr.top + rr.bottom) / 2 - m.center);
      if (dist < activeLineDist) {
        activeLineDist = dist;
        activeLineLeftPx = lineTextStartLeftPx(line) - m.contentRect.left;
        const insetRaw = line.style.getPropertyValue('--why-line-inset').trim();
        const insetRem = Number.parseFloat(insetRaw);
        activeLineInset = Number.isFinite(insetRem) ? insetRem : 0;
      }
    });
    return { activeLineInset, activeLineLeftPx };
  }

  function applyGifRevolver(
    m,
    introBlend,
    ctaZone,
    active,
    scrollDeltaPx,
    phaseGate,
  ) {
    if (!gifEl) return;
    const lerp = revolverLerpForDelta(scrollDeltaPx);
    const strictStart = isStrictStartLock();
    const strictEnd = isStrictEndLock(m);
    const halfContent = Math.max(1, Math.round(scrollEl.clientHeight) * 0.5);
    const viewportCenterContentY = viewportCenterContentYStable();
    const gifCY = elementCenterYInScrollContent(gifEl);
    let normalized =
      Number.isFinite(gifCY) && halfContent > 1
        ? Math.abs(gifCY - viewportCenterContentY) / halfContent
        : (() => {
            const r = gifEl.getBoundingClientRect();
            const mid = (r.top + r.bottom) / 2;
            return Math.abs(mid - m.center) / m.half;
          })();
    normalized = quantizeRevolverNormalized(normalized);

    const edgeProgress = clamp(
      (normalized - T.REVOLVER_CENTER_BAND) / T.REVOLVER_TRANSITION_BAND,
      0,
      1,
    );
    const eased = smoothstep(edgeProgress);
    const gifTarget = eased * introBlend * phaseGate;
    if (phaseGate <= 0.001 || strictStart || strictEnd) {
      gifBlendState = 0;
      let opacity = 1;
      if (ctaZone) {
        opacity *= ctaOverlapMultiplier(
          gifEl.getBoundingClientRect(),
          ctaZone,
          T.GIF_OVERLAP_Y,
          T.GIF_OVERLAP_X,
        );
      }
      const key = `z|1.00|0.00rem||${opacity.toFixed(3)}`;
      if (key !== gifLastRevolverKey) {
        gifLastRevolverKey = key;
        gifEl.style.setProperty('--why-line-scale', '1.00');
        gifEl.style.setProperty('--why-line-inset', '0.00rem');
        gifEl.style.removeProperty('--why-gif-align-x');
        gifEl.style.setProperty('--why-gif-opacity', opacity.toFixed(3));
      }
      return;
    }
    let gifEased = gifBlendState + (gifTarget - gifBlendState) * lerp;
    if (Math.abs(gifTarget - gifEased) < T.REVOLVER_BLEND_SNAP) {
      gifEased = gifTarget;
    }
    gifBlendState = gifEased;

    const leadHStable =
      leadForCta && leadForCta.offsetHeight > 0
        ? leadForCta.offsetHeight
        : m.leadHeight;
    const liftPx = leadHStable * T.GIF_LIFT_LEAD_MULT;
    const liftStr = `${(-liftPx).toFixed(1)}px`;

    const scale = 1 - T.GIF_SCALE_DROP * gifEased;
    const scaleStr = scale.toFixed(2);
    const insetStr = `${active.activeLineInset.toFixed(2)}rem`;
    const alignStr = Number.isFinite(active.activeLineLeftPx)
      ? `${active.activeLineLeftPx.toFixed(2)}px`
      : '';

    let opacity = clamp(1 - T.GIF_OPACITY_DROP * gifEased, 0, 1);
    if (ctaZone) {
      opacity *= ctaOverlapMultiplier(
        gifEl.getBoundingClientRect(),
        ctaZone,
        T.GIF_OVERLAP_Y,
        T.GIF_OVERLAP_X,
      );
    }
    const opStr = opacity.toFixed(3);
    const key = `${liftStr}|${scaleStr}|${insetStr}|${alignStr}|${opStr}`;
    if (key !== gifLastRevolverKey) {
      gifLastRevolverKey = key;
      gifEl.style.setProperty('--why-gif-y', liftStr);
      gifEl.style.setProperty('--why-line-scale', scaleStr);
      gifEl.style.setProperty('--why-line-inset', insetStr);
      if (alignStr) {
        gifEl.style.setProperty('--why-gif-align-x', alignStr);
      } else {
        gifEl.style.removeProperty('--why-gif-align-x');
      }
      gifEl.style.setProperty('--why-gif-opacity', opStr);
    }
  }

  let rafId = 0;
  let settleFrames = 0;
  /** Dedupe style writes to cut layout thrash during zoom. */
  let lastGifBaseScaleStr = '';
  let lastTopSpacerStr = '';
  let lastBottomSpacerStr = '';
  let lastScrollPadTopStr = '';
  let lastIntroGifPadStr = '';
  let lastStartCoverHeightStr = '';
  let resizeQuietTimer = 0;
  let wheelTargetTop = Number.NaN;
  let layoutObserver: ResizeObserver | null = null;
  let ctaScaleBaselineBoxWidth = 0;

  const requestZoomSettle = (frames = 4) => {
    settleFrames = Math.max(settleFrames, frames);
    schedule();
  };

  const schedule = () => {
    if (rafId) return;
    rafId = requestAnimationFrame(update);
  };

  /** One rAF per burst while resizing; extra passes only after zoom/resize is quiet. */
  function onViewportResize() {
    prevFrameRevolverIdle = false;
    revolverIdleStreak = 0;
    gifLastRevolverKey = '';
    schedule();
    if (resizeQuietTimer) window.clearTimeout(resizeQuietTimer);
    resizeQuietTimer = window.setTimeout(() => {
      resizeQuietTimer = 0;
      settleFrames = Math.max(settleFrames, 4);
      schedule();
    }, 110);
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

    const m = readLayoutMetrics();
    if (!prevFrameRevolverIdle) {
      applyFontScaleStep();
    }
    const fitTargetNow = computeWhyFontTarget();
    const overflowPx = measureFitOverflowPx();
    const fitAtLimit =
      fitTargetNow <= T.FONT_MIN + T.FIT_FAIL_TARGET_EPS && overflowPx > 0;
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

    applyStartCover();
    const ctaO = applyCtaFade();
    applyCtaHorizontalAnchor(m);
    applyCtaVerticalMidpoint(m);
    applyCtaScale(m);
    applyCtaAttachedVeil(ctaO);
    const ctaZone = buildCtaZone(m, ctaO);

    const introBlend = applyIntroTopEdge();
    const phaseGate = middlePhaseRevolverGate(m);

    const combinedForLead = leadAnchorCombinedScrollPx(m);
    const gifFootprintPx = computeGifFootprintPx(m, combinedForLead);
    applySpacersAndIntroVars(m, gifFootprintPx, combinedForLead);
    applyStartCoverBandSizing();

    const maxScrollNow = Math.max(
      0,
      scrollEl.scrollHeight - scrollEl.clientHeight,
    );
    const maxScrollChangedForRevolver =
      lastMaxScrollForRevolverFreeze >= 0 &&
      Math.abs(maxScrollNow - lastMaxScrollForRevolverFreeze) >
        T.REVOLVER_MAX_SCROLL_JITTER_EPS;
    lastMaxScrollForRevolverFreeze = maxScrollNow;

    const endPhaseNow = computeEndPhase(maxScrollNow);
    applyEndPhaseCss(endPhaseNow);
    applyTopVeilHeight(maxScrollNow, endPhaseNow);

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
      applyLineRevolver(m, introBlend, ctaZone, scrollDeltaPx, phaseGate);
      const active = pickActiveLineForGif(m);
      applyGifRevolver(
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
      const dy = wheelDeltaToPixels(event) * T.WHEEL_SCROLL_FACTOR;
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
