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

(function () {
  const scrollEl = document.querySelector('.why-page .why-scroll');
  if (!scrollEl) return;
  const boxEl = scrollEl.closest('.why-box');
  if (!boxEl) return;
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

  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const smoothstep = (x) => x * x * (3 - 2 * x);

  /**
   * Magic numbers for /why scroll script only (tune here; behavior should stay intentional).
   */
  const T = {
    FONT_MIN: 0.52,
    FONT_LERP: 0.22,
    FONT_SNAP: 0.004,
    FIT_SAFETY_PX: 3,
    START_COVER_BAND_MIN: 85,
    START_COVER_BAND_FRAC: 0.26,
    CTA_FADE_PX: 56,
    CTA_O_HIDDEN: 0.002,
    CTA_ZONE_MIN_O: 0.04,
    CTA_RECT_MIN: 4,
    CTA_ZONE_PAD_H_MIN: 24,
    CTA_ZONE_PAD_H_FRAC: 0.35,
    CTA_ZONE_PAD_TOP: 16,
    CTA_ZONE_PAD_BOTTOM: 28,
    END_COVER_BAND_MIN: 70,
    END_COVER_BAND_FRAC: 0.22,
    INTRO_LINE_COUNT: 2,
    INTRO_RAMP_MIN: 100,
    INTRO_RAMP_FRAC: 0.22,
    GIF_NARROW_REF_PX: 520,
    GIF_NARROW_RANGE: 220,
    GIF_MAX_FRAC: 0.34,
    GIF_MAX_FRAC_NARROW: 0.1,
    FONT_EASE_BASE: 0.72,
    FONT_EASE_MULT: 0.28,
    FONT_EASE_MIN: 0.68,
    GIF_MIN_LEAD_MULT: 0.68,
    GIF_MIN_BOX_FRAC: 0.065,
    GIF_MIN_ABS_PX: 24,
    GIF_BASE_SCALE_MIN: 0.5,
    LEAD_DOWN_FRAC: 0.18,
    END_SCROLL_EXTRA_FRAC: 0.32,
    REVOLVER_CENTER_BAND: 0.4,
    REVOLVER_TRANSITION_BAND: 0.45,
    LEAD_SCALE_DROP: 0.3,
    BODY_SCALE_DROP: 0.5,
    LEAD_MAX_INSET_REM: 2.4,
    BODY_MAX_INSET_REM: 4,
    CTA_GAP_MIN_PX: 40,
    CTA_GAP_LEAD_MULT: 0.6,
    CTA_PUSH_BOTTOM_MARGIN: 16,
    GIF_LIFT_LEAD_MULT: 0.75,
    GIF_SCALE_DROP: 0.35,
    GIF_MAX_INSET_REM: 3.2,
    GIF_OPACITY_DROP: 0.75,
    LINE_OVERLAP_Y: 0.92,
    LINE_OVERLAP_X: 0.12,
    GIF_OVERLAP_Y: 0.9,
    GIF_OVERLAP_X: 0.1,
  };

  let whyFontScale = 1;

  function wideColumnContentWidthPx() {
    if (!(wideP instanceof HTMLElement)) return 0;
    const rootRem =
      Number.parseFloat(getComputedStyle(document.documentElement).fontSize) ||
      16;
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

  function applyFontScaleStep() {
    const fontTarget = computeWhyFontTarget();
    whyFontScale += (fontTarget - whyFontScale) * T.FONT_LERP;
    if (Math.abs(fontTarget - whyFontScale) < T.FONT_SNAP) {
      whyFontScale = fontTarget;
    }
    scrollEl.style.setProperty('--why-font-scale', whyFontScale.toFixed(4));
    if (Math.abs(fontTarget - whyFontScale) > T.FONT_SNAP * 2) {
      settleFrames = Math.max(settleFrames, 2);
    }
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
    const gifHeightRaw = gifEl ? gifEl.getBoundingClientRect().height || 0 : 0;
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
      gifHeightRaw,
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

  function applyStartCover(m) {
    const startBandPx = Math.max(
      T.START_COVER_BAND_MIN,
      scrollEl.clientHeight * T.START_COVER_BAND_FRAC,
    );
    const startProgress = clamp(scrollEl.scrollTop / startBandPx, 0, 1);
    const startOpacity = 1 - smoothstep(startProgress);
    boxEl.style.setProperty(
      '--why-start-cover-opacity',
      startOpacity.toFixed(3),
    );
  }

  /** @returns {number} CTA opacity 0–1 */
  function applyCtaFade(m) {
    const ctaProgress = clamp(
      scrollEl.scrollTop / T.CTA_FADE_PX,
      0,
      1,
    );
    const ctaO = 1 - smoothstep(ctaProgress);
    boxEl.style.setProperty('--why-cta-opacity', ctaO.toFixed(3));
    if (ctaEl) {
      ctaEl.style.visibility = ctaO < T.CTA_O_HIDDEN ? 'hidden' : 'visible';
    }
    return ctaO;
  }

  function applyCtaHorizontalAnchor(m) {
    if (!ctaEl || !(leadForCta instanceof HTMLElement)) return;
    try {
      const range = document.createRange();
      range.selectNodeContents(leadForCta);
      const fr = range.getClientRects();
      if (fr.length > 0) {
        const r0 = fr[0];
        let anchor =
          r0.left - m.boxOuterRect.left + WHY_CTA_LEAD_TRACK * r0.width;
        const edge = Math.max(
          WHY_CTA_EDGE_MIN_PX,
          m.boxOuterRect.width * WHY_CTA_EDGE_WIDTH_FRAC,
        );
        anchor = clamp(anchor, edge, m.boxOuterRect.width - edge);
        boxEl.style.setProperty('--why-cta-left', `${anchor.toFixed(2)}px`);
      }
    } catch {
      /* ignore Range errors */
    }
  }

  function applyCtaVerticalPush(m, ctaO) {
    if (!ctaEl) return;
    let transform = 'translateX(-50%)';
    if (ctaO >= T.CTA_O_HIDDEN) {
      const ctaBase = ctaEl.getBoundingClientRect();
      const minGapPx = Math.max(
        T.CTA_GAP_MIN_PX,
        m.leadHeight * T.CTA_GAP_LEAD_MULT,
      );
      const gap = ctaBase.top - m.leadRect.bottom;
      let pushDown = Math.max(0, minGapPx - gap);
      const maxPush = Math.max(
        0,
        m.boxOuterRect.bottom - ctaBase.bottom - T.CTA_PUSH_BOTTOM_MARGIN,
      );
      pushDown = Math.min(pushDown, maxPush);
      if (pushDown > 0) {
        transform = `translateX(-50%) translateY(${pushDown}px)`;
      }
    }
    ctaEl.style.transform = transform;
  }

  /** @returns {null | { left: number, right: number, top: number, bottom: number }} */
  function buildCtaZone(m, ctaO) {
    if (!ctaEl || ctaO <= T.CTA_ZONE_MIN_O || ctaEl.style.visibility === 'hidden') {
      return null;
    }
    const cr = ctaEl.getBoundingClientRect();
    if (cr.width <= T.CTA_RECT_MIN || cr.height <= T.CTA_RECT_MIN) return null;
    const padH = Math.max(T.CTA_ZONE_PAD_H_MIN, cr.width * T.CTA_ZONE_PAD_H_FRAC);
    return {
      left: cr.left - padH,
      right: cr.right + padH,
      top: cr.top - T.CTA_ZONE_PAD_TOP,
      bottom: cr.bottom + T.CTA_ZONE_PAD_BOTTOM,
    };
  }

  function applyEndCover(m) {
    const coverBandPx = Math.max(
      T.END_COVER_BAND_MIN,
      scrollEl.clientHeight * T.END_COVER_BAND_FRAC,
    );
    const coverProgress = m.maxScroll
      ? clamp(
          (scrollEl.scrollTop - (m.maxScroll - coverBandPx)) / coverBandPx,
          0,
          1,
        )
      : 0;
    boxEl.style.setProperty(
      '--why-end-cover-opacity',
      smoothstep(coverProgress).toFixed(3),
    );
  }

  /** @returns {number} intro blend 0–1 */
  function applyIntroTopEdge(m) {
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

  function computeGifFootprintPx(m) {
    let gifFootprintPx = m.gifHeightRaw;
    if (m.gifHeightRaw > 0 && gifEl) {
      const narrowness = clamp(
        (T.GIF_NARROW_REF_PX - m.boxRect.width) / T.GIF_NARROW_RANGE,
        0,
        1,
      );
      const fontEase = clamp(
        T.FONT_EASE_BASE + T.FONT_EASE_MULT * whyFontScale,
        T.FONT_EASE_MIN,
        1,
      );
      const maxBoxFrac =
        (T.GIF_MAX_FRAC - T.GIF_MAX_FRAC_NARROW * narrowness) * fontEase;
      const maxByBox = m.boxRect.height * maxBoxFrac;
      const minByLead = Math.max(
        m.leadHeight * T.GIF_MIN_LEAD_MULT,
        m.boxOuterRect.height * T.GIF_MIN_BOX_FRAC,
        T.GIF_MIN_ABS_PX,
      );
      gifFootprintPx = clamp(
        Math.min(m.gifHeightRaw, maxByBox),
        minByLead,
        m.gifHeightRaw,
      );
      const gifBaseScale = clamp(
        gifFootprintPx / m.gifHeightRaw,
        T.GIF_BASE_SCALE_MIN,
        1,
      );
      gifEl.style.setProperty('--why-gif-base-scale', gifBaseScale.toFixed(3));
    }
    return gifFootprintPx;
  }

  function applySpacersAndIntroVars(m, gifFootprintPx) {
    const leadDownPx = m.leadHeight * T.LEAD_DOWN_FRAC;
    const topSpacerPx = Math.max(
      0,
      m.half - m.padTop - gifFootprintPx + leadDownPx,
    );
    const endScrollExtraPx = m.half * T.END_SCROLL_EXTRA_FRAC;
    const bottomSpacerPx = Math.max(
      0,
      m.half - m.padBottom - gifFootprintPx + endScrollExtraPx,
    );
    topSpacer.style.height = `${topSpacerPx.toFixed(2)}px`;
    bottomSpacer.style.height = `${bottomSpacerPx.toFixed(2)}px`;

    contentEl.style.setProperty(
      '--why-scroll-pad-top',
      `${m.padTop.toFixed(2)}px`,
    );
    contentEl.style.setProperty(
      '--why-intro-gif-pad',
      `${gifFootprintPx.toFixed(2)}px`,
    );
    contentEl.style.setProperty('--why-gif-nudge-y', '0px');
  }

  function applyLineRevolver(m, introBlend, ctaZone) {
    lines.forEach((line, lineIndex) => {
      const r = line.getBoundingClientRect();
      const mid = (r.top + r.bottom) / 2;
      const normalized = Math.abs(mid - m.center) / m.half;

      const edgeProgress = clamp(
        (normalized - T.REVOLVER_CENTER_BAND) / T.REVOLVER_TRANSITION_BAND,
        0,
        1,
      );
      const eased = smoothstep(edgeProgress);
      const gate = lineIndex < T.INTRO_LINE_COUNT ? introBlend : 1;
      const blendedEased = eased * gate;

      const isLead = line.classList.contains('why-lead');
      const scaleDrop = isLead ? T.LEAD_SCALE_DROP : T.BODY_SCALE_DROP;
      const maxInset = isLead ? T.LEAD_MAX_INSET_REM : T.BODY_MAX_INSET_REM;
      const scale = 1 - scaleDrop * blendedEased;
      const inset = maxInset * blendedEased;

      line.style.setProperty('--why-line-scale', scale.toFixed(2));
      line.style.setProperty('--why-line-inset', `${inset.toFixed(2)}rem`);

      let lineOp = 1;
      if (ctaZone && !isLead) {
        lineOp = ctaOverlapMultiplier(
          line.getBoundingClientRect(),
          ctaZone,
          T.LINE_OVERLAP_Y,
          T.LINE_OVERLAP_X,
        );
      }
      line.style.setProperty('--why-line-opacity', lineOp.toFixed(3));
    });
  }

  function pickActiveLineForGif(m) {
    let activeLineInset = 0;
    let activeLineDist = Number.POSITIVE_INFINITY;
    let activeLineLeftPx = Number.NaN;
    lines.forEach((line) => {
      const rr = line.getBoundingClientRect();
      const dist = Math.abs((rr.top + rr.bottom) / 2 - m.center);
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

  function applyGifRevolver(m, introBlend, ctaZone, active) {
    if (!gifEl) return;
    const r = gifEl.getBoundingClientRect();
    const mid = (r.top + r.bottom) / 2;
    const normalized = Math.abs(mid - m.center) / m.half;

    const edgeProgress = clamp(
      (normalized - T.REVOLVER_CENTER_BAND) / T.REVOLVER_TRANSITION_BAND,
      0,
      1,
    );
    const eased = smoothstep(edgeProgress);
    const gifEased = eased * introBlend;

    const liftPx = m.leadHeight * T.GIF_LIFT_LEAD_MULT;
    gifEl.style.setProperty('--why-gif-y', `${(-liftPx).toFixed(1)}px`);

    const scale = 1 - T.GIF_SCALE_DROP * gifEased;
    gifEl.style.setProperty('--why-line-scale', scale.toFixed(2));
    gifEl.style.setProperty(
      '--why-line-inset',
      `${active.activeLineInset.toFixed(2)}rem`,
    );
    if (Number.isFinite(active.activeLineLeftPx)) {
      gifEl.style.setProperty(
        '--why-gif-align-x',
        `${active.activeLineLeftPx.toFixed(2)}px`,
      );
    }

    let opacity = clamp(1 - T.GIF_OPACITY_DROP * gifEased, 0, 1);
    if (ctaZone) {
      opacity *= ctaOverlapMultiplier(
        gifEl.getBoundingClientRect(),
        ctaZone,
        T.GIF_OVERLAP_Y,
        T.GIF_OVERLAP_X,
      );
    }
    gifEl.style.setProperty('--why-gif-opacity', opacity.toFixed(3));
  }

  let rafId = 0;
  let settleFrames = 0;

  const requestZoomSettle = (frames = 4) => {
    settleFrames = Math.max(settleFrames, frames);
    schedule();
  };

  const schedule = () => {
    if (rafId) return;
    rafId = requestAnimationFrame(update);
  };

  function update() {
    rafId = 0;

    applyFontScaleStep();

    const m = readLayoutMetrics();

    applyStartCover(m);
    const ctaO = applyCtaFade(m);
    applyCtaHorizontalAnchor(m);
    applyCtaVerticalPush(m, ctaO);
    const ctaZone = buildCtaZone(m, ctaO);

    applyEndCover(m);
    const introBlend = applyIntroTopEdge(m);

    const gifFootprintPx = computeGifFootprintPx(m);
    applySpacersAndIntroVars(m, gifFootprintPx);

    applyLineRevolver(m, introBlend, ctaZone);
    const active = pickActiveLineForGif(m);
    applyGifRevolver(m, introBlend, ctaZone, active);

    if (settleFrames > 0) {
      settleFrames -= 1;
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
  }

  scrollEl.addEventListener('scroll', schedule, { passive: true });
  scrollEl.addEventListener(
    'wheel',
    (event) => {
      if (event.ctrlKey) requestZoomSettle(8);
    },
    { passive: true },
  );
  window.addEventListener('resize', () => requestZoomSettle(8));
  window.visualViewport?.addEventListener('resize', () => requestZoomSettle(8));
  init();
})();
