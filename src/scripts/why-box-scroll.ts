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
    /** Keep bottom fade band below `.why-p--wide` last line (+ this gap); drives --why-start-cover-height. */
    START_COVER_BELOW_WIDE_REM: 0.5,
    /** Cap JS-computed start-cover height (px); fallback CSS clamp when measurement skipped. */
    START_COVER_HEIGHT_MAX: 300,
    /** After intro band: 1 = stejná „plná“ intenzita vrstvy jako horní ::before (jen násobí gradient). */
    BOTTOM_VEIL_MAX_O: 1,
    CTA_FADE_PX: 56,
    CTA_O_HIDDEN: 0.002,
    CTA_ZONE_MIN_O: 0.04,
    CTA_RECT_MIN: 4,
    CTA_ZONE_PAD_H_MIN: 24,
    CTA_ZONE_PAD_H_FRAC: 0.35,
    CTA_ZONE_PAD_TOP: 16,
    CTA_ZONE_PAD_BOTTOM: 28,
    /** 0.5 = halfway between ref line bottom and box bottom; higher = closer to box bottom. */
    CTA_VERTICAL_FRAC_FROM_BOX_BOTTOM: 0.55,
    /** Keep CTA vertical center inside the box if geometry goes odd while scrolling. */
    CTA_TOP_CLAMP_MARGIN: 8,
    END_COVER_BAND_MIN: 70,
    END_COVER_BAND_FRAC: 0.22,
    INTRO_LINE_COUNT: 2,
    INTRO_RAMP_MIN: 100,
    INTRO_RAMP_FRAC: 0.22,
    /**
     * Top of `.why-lead` sits at LEAD_TOP_FRAC × .why-box height from the box top (scroll panel).
     * padTop + topSpacer + introGifPad = H * LEAD_TOP_FRAC − padTop. (Older “from bottom” baseline
     * wording differed; this matches “horní okraj leadu na polovině výšky”.)
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
    GIF_TO_LEAD_CLEARANCE_MULT: 0.26,
    /** Cap intro GIF pad vs scroll height so tiny boxes don’t collapse. */
    GIF_INTRO_PAD_MAX_FRAC: 0.48,
    GIF_BASE_SCALE_MIN: 0.5,
    END_SCROLL_EXTRA_FRAC: 0.32,
    REVOLVER_CENTER_BAND: 0.4,
    REVOLVER_TRANSITION_BAND: 0.45,
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
  };

  let whyFontScale = 1;

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
    const veilOpacity = smoothstep(startProgress) * T.BOTTOM_VEIL_MAX_O;
    boxEl.style.setProperty(
      '--why-bottom-veil-opacity',
      veilOpacity.toFixed(3),
    );
  }

  /**
   * Size the bottom start-cover (and matching .why-box::after) so its top sits at
   * last line of `.why-p--wide` + START_COVER_BELOW_WIDE_REM. Stops the gradient
   * from washing out that line at odd zoom/viewport heights (fixed vh clamp was too tall).
   */
  function applyStartCoverBandSizing() {
    const rootRem =
      Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const marginPx = T.START_COVER_BELOW_WIDE_REM * rootRem;
    let lineBottom = null;
    if (wideP instanceof HTMLElement) {
      try {
        const range = document.createRange();
        range.selectNodeContents(wideP);
        const rects = range.getClientRects();
        if (rects.length > 0) lineBottom = rects[rects.length - 1].bottom;
      } catch {
        /* ignore */
      }
      if (lineBottom == null || !Number.isFinite(lineBottom)) {
        lineBottom = wideP.getBoundingClientRect().bottom;
      }
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
      }
    }

    if (hStr == null) {
      if (lastStartCoverHeightStr !== '') {
        lastStartCoverHeightStr = '';
        boxEl.style.removeProperty('--why-start-cover-height');
      }
      return;
    }
    if (hStr !== lastStartCoverHeightStr) {
      lastStartCoverHeightStr = hStr;
      boxEl.style.setProperty('--why-start-cover-height', hStr);
    }
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
    const f = T.CTA_VERTICAL_FRAC_FROM_BOX_BOTTOM;
    let refLineBottom = null;
    if (wideP instanceof HTMLElement) {
      try {
        const range = document.createRange();
        range.selectNodeContents(wideP);
        const rects = range.getClientRects();
        if (rects.length > 0) {
          refLineBottom = rects[rects.length - 1].bottom;
        }
      } catch {
        /* ignore */
      }
    }
    let targetY;
    if (refLineBottom == null || !Number.isFinite(refLineBottom)) {
      targetY = boxBottom - f * boxH;
    } else {
      const gap = boxBottom - refLineBottom;
      targetY = boxBottom - f * gap;
    }
    let topPx = targetY - boxTop;
    topPx = clamp(
      topPx,
      T.CTA_TOP_CLAMP_MARGIN,
      Math.max(T.CTA_TOP_CLAMP_MARGIN, boxH - T.CTA_TOP_CLAMP_MARGIN),
    );
    boxEl.style.setProperty('--why-cta-top', `${topPx.toFixed(2)}px`);
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
      const maxByBox =
        boxH * T.GIF_MAX_BOX_FRAC * narrowFactor;
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
      gifFootprintPx = Math.max(
        baseDisplayPx,
        Math.min(desiredPad, padMax),
      );
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

    // Keep the end stop stable: at max scroll, midpoint of the last 2 paragraphs
    // should sit on the viewport center regardless of zoom/font scaling.
    const lastTwo = lines.slice(-2);
    let bottomSpacerPx = 0;
    if (lastTwo.length === 2) {
      const c0 =
        (lastTwo[0].getBoundingClientRect().top +
          lastTwo[0].getBoundingClientRect().bottom) /
        2;
      const c1 =
        (lastTwo[1].getBoundingClientRect().top +
          lastTwo[1].getBoundingClientRect().bottom) /
        2;
      const targetCenterContentY =
        (c0 + c1) / 2 + scrollEl.scrollTop - m.boxRect.top;
      const requiredMaxScroll = Math.max(0, targetCenterContentY - m.half);
      const currentBottomSpacerPx = bottomSpacer.offsetHeight || 0;
      const contentWithoutBottomSpacer =
        scrollEl.scrollHeight - currentBottomSpacerPx;
      const neededBottomSpacerPx =
        requiredMaxScroll + scrollEl.clientHeight - contentWithoutBottomSpacer;
      const legacyFloor = m.half - m.padBottom - padQuantized + endScrollExtraPx;
      bottomSpacerPx = Math.max(0, neededBottomSpacerPx, legacyFloor);
    } else {
      bottomSpacerPx = Math.max(
        0,
        m.half - m.padBottom - padQuantized + endScrollExtraPx,
      );
    }
    const topStr = `${topSpacerPx.toFixed(2)}px`;
    const botStr = `${bottomSpacerPx.toFixed(2)}px`;
    if (topStr !== lastTopSpacerStr) {
      lastTopSpacerStr = topStr;
      topSpacer.style.height = topStr;
    }
    if (botStr !== lastBottomSpacerStr) {
      lastBottomSpacerStr = botStr;
      bottomSpacer.style.height = botStr;
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
  /** Dedupe style writes to cut layout thrash during zoom. */
  let lastGifBaseScaleStr = '';
  let lastTopSpacerStr = '';
  let lastBottomSpacerStr = '';
  let lastScrollPadTopStr = '';
  let lastIntroGifPadStr = '';
  let lastStartCoverHeightStr = '';
  let resizeQuietTimer = 0;

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

    applyFontScaleStep();

    const m = readLayoutMetrics();

    applyStartCover(m);
    const ctaO = applyCtaFade(m);
    applyCtaHorizontalAnchor(m);
    applyCtaVerticalMidpoint(m);
    const ctaZone = buildCtaZone(m, ctaO);

    applyEndCover(m);
    const introBlend = applyIntroTopEdge(m);

    const combinedForLead = leadAnchorCombinedScrollPx(m);
    const gifFootprintPx = computeGifFootprintPx(m, combinedForLead);
    applySpacersAndIntroVars(m, gifFootprintPx, combinedForLead);
    applyStartCoverBandSizing();

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
  window.addEventListener('resize', onViewportResize);
  window.visualViewport?.addEventListener('resize', onViewportResize);
  init();
})();
