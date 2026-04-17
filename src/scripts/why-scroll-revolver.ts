import { clamp, smoothstep } from '../utils/why-scroll-math';
import { ctaOverlapMultiplier, type CtaZone } from './why-scroll-cta';
import {
  elementCenterYInScrollContent,
  lineTextStartLeftPx,
} from './why-scroll-dom';
import {
  quantizeRevolverNormalized,
  revolverLerpForDelta,
  viewportCenterContentYStable,
} from './why-scroll-helpers';
import type { WhyScrollLayoutMetrics } from './why-scroll-layout';

export type ActiveLineForGif = {
  activeLineInset: number;
  activeLineLeftPx: number;
};

export function createWhyScrollRevolver(config: {
  scrollEl: HTMLElement;
  lines: HTMLElement[];
  gifEl: Element | null;
  leadForCta: Element | null;
  T: Record<string, number>;
}) {
  const { scrollEl, lines, gifEl, leadForCta, T } = config;

  const lineBlendState = lines.map(() => 0);
  let gifBlendState = 0;
  const lineLastRevolverStyles = new WeakMap<
    HTMLElement,
    { s: string; i: string; o: string }
  >();
  let gifLastRevolverKey = '';
  let strictStartLockActive = true;
  let ctaTextDimActive = false;

  function applyLineRevolverStylesIfChanged(
    line: HTMLElement,
    scaleStr: string,
    insetStr: string,
    opStr: string,
  ) {
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

  function isStrictStartLock() {
    const introRampPx = Math.max(
      T.INTRO_RAMP_MIN,
      scrollEl.clientHeight * T.INTRO_RAMP_FRAC,
    );
    const enterPx = introRampPx * T.INTRO_STRICT_LOCK_ENTER_FRAC;
    const exitPx = introRampPx * T.INTRO_STRICT_LOCK_EXIT_FRAC;
    if (strictStartLockActive) {
      if (scrollEl.scrollTop > exitPx) strictStartLockActive = false;
    } else if (scrollEl.scrollTop < enterPx) {
      strictStartLockActive = true;
    }
    return strictStartLockActive;
  }

  function isStrictEndLock(m: WhyScrollLayoutMetrics) {
    if (m.maxScroll <= 1) return false;
    const endBandPx = Math.max(
      T.END_COVER_BAND_MIN,
      scrollEl.clientHeight * T.END_COVER_BAND_FRAC,
    );
    return m.maxScroll - scrollEl.scrollTop <= endBandPx * 0.45;
  }

  function applyLineRevolver(
    m: WhyScrollLayoutMetrics,
    introBlend: number,
    ctaZone: CtaZone | null,
    scrollDeltaPx: number,
    phaseGate: number,
  ) {
    const lerp = revolverLerpForDelta(
      scrollDeltaPx,
      T.REVOLVER_LERP_INSTANT_BELOW_PX,
      T.REVOLVER_LERP_SPEED,
    );
    const strictStart = isStrictStartLock();
    const strictEnd = isStrictEndLock(m);
    if (ctaTextDimActive) {
      if (scrollEl.scrollTop <= T.CTA_TEXT_DIM_EXIT_PX)
        ctaTextDimActive = false;
    } else if (scrollEl.scrollTop >= T.CTA_TEXT_DIM_ENTER_PX) {
      ctaTextDimActive = true;
    }
    const effectiveCtaZone = ctaTextDimActive ? ctaZone : null;
    const halfContent = Math.max(1, Math.round(scrollEl.clientHeight) * 0.5);
    const viewportCenterContentY = viewportCenterContentYStable(
      scrollEl.scrollTop,
      scrollEl.clientHeight,
    );
    lines.forEach((line, lineIndex) => {
      const isWideIntroLine = line.classList.contains('why-p--wide');
      const lineCY = elementCenterYInScrollContent(scrollEl, line);
      let normalized: number;
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
      const strictStartThisLine =
        strictStart && lineIndex < T.INTRO_LINE_COUNT;
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

  function pickActiveLineForGif(m: WhyScrollLayoutMetrics): ActiveLineForGif {
    let activeLineInset = 0;
    let activeLineDist = Number.POSITIVE_INFINITY;
    let activeLineLeftPx = Number.NaN;
    const viewportCenterContentY = viewportCenterContentYStable(
      scrollEl.scrollTop,
      scrollEl.clientHeight,
    );
    lines.forEach((line) => {
      const lineCY = elementCenterYInScrollContent(scrollEl, line);
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
    m: WhyScrollLayoutMetrics,
    introBlend: number,
    ctaZone: CtaZone | null,
    active: ActiveLineForGif,
    scrollDeltaPx: number,
    phaseGate: number,
  ) {
    if (!(gifEl instanceof HTMLElement)) return;
    const lerp = revolverLerpForDelta(
      scrollDeltaPx,
      T.REVOLVER_LERP_INSTANT_BELOW_PX,
      T.REVOLVER_LERP_SPEED,
    );
    const strictStart = isStrictStartLock();
    const strictEnd = isStrictEndLock(m);
    const halfContent = Math.max(1, Math.round(scrollEl.clientHeight) * 0.5);
    const viewportCenterContentY = viewportCenterContentYStable(
      scrollEl.scrollTop,
      scrollEl.clientHeight,
    );
    const gifCY = elementCenterYInScrollContent(scrollEl, gifEl);
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
      leadForCta &&
      (leadForCta as HTMLElement).offsetHeight > 0
        ? (leadForCta as HTMLElement).offsetHeight
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

  function resetGifRevolverStyleKey() {
    gifLastRevolverKey = '';
  }

  return {
    applyLineRevolver,
    pickActiveLineForGif,
    applyGifRevolver,
    resetGifRevolverStyleKey,
  };
}
