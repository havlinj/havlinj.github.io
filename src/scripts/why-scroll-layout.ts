import { clamp } from '../utils/why-scroll-math';

export type WhyScrollLayoutMetrics = {
  maxScroll: number;
  boxRect: DOMRect;
  contentRect: DOMRect;
  boxOuterRect: DOMRect;
  half: number;
  center: number;
  leadEl: Element;
  leadRect: DOMRect;
  leadHeight: number;
  gifLayoutHeight: number;
  padTop: number;
  padBottom: number;
};

/* eslint-disable no-unused-vars -- type-only callback signature */
export type WhyScrollLayoutConfig = {
  scrollEl: HTMLElement;
  boxEl: HTMLElement;
  contentEl: HTMLElement;
  topSpacer: HTMLElement;
  bottomSpacer: HTMLElement;
  lines: HTMLElement[];
  gifEl: Element | null;
  leadForCta: Element | null;
  T: Record<string, number>;
  bumpSettleFrames: (minFrames: number) => void;
};
/* eslint-enable no-unused-vars */

export function createWhyScrollLayout(config: WhyScrollLayoutConfig) {
  const {
    scrollEl,
    boxEl,
    contentEl,
    topSpacer,
    bottomSpacer,
    lines,
    gifEl,
    leadForCta,
    T,
    bumpSettleFrames,
  } = config;

  let lastGifBaseScaleStr = '';
  let lastTopSpacerStr = '';
  let lastBottomSpacerStr = '';
  let lastScrollPadTopStr = '';
  let lastIntroGifPadStr = '';

  function gifLayoutHeightPx(): number {
    if (!gifEl) return 0;
    let h = (gifEl as HTMLElement).offsetHeight;
    if (h <= 0) {
      const frame = gifEl.querySelector('.why-gif-frame');
      if (frame) h = (frame as HTMLElement).offsetHeight;
    }
    if (h <= 0) {
      const w = (gifEl as HTMLElement).offsetWidth;
      if (w > 0) h = (w * 9) / 16;
    }
    return h;
  }

  function readLayoutMetrics(): WhyScrollLayoutMetrics {
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

  function computeGifFootprintPx(
    m: WhyScrollLayoutMetrics,
    footprintMaxPx: number,
  ): number {
    const layoutH = m.gifLayoutHeight;
    let gifFootprintPx = layoutH;
    if (layoutH > 0 && gifEl instanceof HTMLElement) {
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
    } else if (gifEl instanceof HTMLElement && lastGifBaseScaleStr !== '1.000') {
      lastGifBaseScaleStr = '1.000';
      gifEl.style.setProperty('--why-gif-base-scale', '1.000');
    }
    return gifFootprintPx;
  }

  function leadAnchorCombinedScrollPx(m: WhyScrollLayoutMetrics): number {
    const H = m.boxOuterRect.height;
    return Math.max(0, H * T.LEAD_TOP_FRAC - m.padTop);
  }

  function applySpacersAndIntroVars(
    m: WhyScrollLayoutMetrics,
    gifFootprintPx: number,
    combinedForLeadPx: number,
  ): void {
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
      bumpSettleFrames(2);
    }
  }

  return {
    readLayoutMetrics,
    computeGifFootprintPx,
    leadAnchorCombinedScrollPx,
    applySpacersAndIntroVars,
  };
}
