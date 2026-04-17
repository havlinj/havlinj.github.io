import { clamp, smoothstep } from '../utils/why-scroll-math';
import { edgeVeilEndHeightPx, edgeVeilHeightPx } from './why-scroll-helpers';
import { lastLineBottomInElement, readRootRemPx } from './why-scroll-dom';

export function createWhyScrollVeils(config: {
  scrollEl: HTMLElement;
  boxEl: HTMLElement;
  wideP: Element | null;
  T: Record<string, number>;
}) {
  const { scrollEl, boxEl, wideP, T } = config;
  let lastStartCoverHeightStr = '';

  function applyStartCover(): void {
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
    boxEl.style.setProperty(
      '--why-step3-veil-opacity',
      step3Opacity.toFixed(3),
    );

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
    const introOpacity = Math.max(introOpacityBase, introHardPhase);
    boxEl.style.setProperty(
      '--why-intro-bottom-veil-opacity',
      introOpacity.toFixed(3),
    );
  }

  function applyStartCoverBandSizing(): void {
    const boxOuterH = boxEl.getBoundingClientRect().height;
    if (boxOuterH > 1) {
      boxEl.style.setProperty(
        '--why-box-outer-height-px',
        `${Math.round(boxOuterH * 4) / 4}px`,
      );
    } else {
      boxEl.style.removeProperty('--why-box-outer-height-px');
    }

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

    const boxFloorPx = boxOuterH * T.START_COVER_FRAC_OF_BOX;
    const boxOnlyPx = Math.min(
      T.START_COVER_HEIGHT_MAX,
      Math.max(8, boxOuterH * T.START_COVER_BOX_ONLY_FRAC),
    );

    function commitHeights(hPx: number): void {
      const capped = Math.min(T.START_COVER_HEIGHT_MAX, Math.max(8, hPx));
      const hStr = `${Math.round(capped * 4) / 4}px`;
      const introVeilHeight = clamp(
        capped * T.INTRO_BOTTOM_VEIL_HEIGHT_FRAC,
        T.INTRO_BOTTOM_VEIL_HEIGHT_MIN,
        T.INTRO_BOTTOM_VEIL_HEIGHT_MAX,
      );
      boxEl.style.setProperty(
        '--why-intro-bottom-veil-height',
        `${Math.round(introVeilHeight)}px`,
      );
      if (hStr !== lastStartCoverHeightStr) {
        lastStartCoverHeightStr = hStr;
        boxEl.style.setProperty('--why-start-cover-height', hStr);
      }
    }

    let hStr: string | null = null;
    if (lineBottom != null && Number.isFinite(lineBottom)) {
      const raw = innerBottom - lineBottom - marginPx;
      if (raw >= 8) {
        const blended = Math.max(raw, boxFloorPx);
        const hPx = Math.min(T.START_COVER_HEIGHT_MAX, blended);
        hStr = `${Math.round(hPx * 4) / 4}px`;
        commitHeights(hPx);
      }
    }

    if (hStr == null && boxOuterH > 1) {
      commitHeights(boxOnlyPx);
      hStr = 'committed';
    }

    if (hStr == null) {
      if (lastStartCoverHeightStr !== '') {
        lastStartCoverHeightStr = '';
        boxEl.style.removeProperty('--why-start-cover-height');
      }
      boxEl.style.removeProperty('--why-intro-bottom-veil-height');
      return;
    }
  }

  function applyEndPhaseCss(endPhase: number): void {
    boxEl.style.setProperty('--why-end-phase', endPhase.toFixed(3));
    boxEl.style.setProperty('--why-end-cover-opacity', endPhase.toFixed(3));
  }

  function applyTopVeilHeight(maxScroll: number, endPhase: number): void {
    const baseVeil = edgeVeilHeightPx(window.innerHeight);
    const endVeil = edgeVeilEndHeightPx(window.innerHeight);
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

  return {
    applyStartCover,
    applyStartCoverBandSizing,
    applyEndPhaseCss,
    applyTopVeilHeight,
    applyIntroTopEdge,
  };
}
