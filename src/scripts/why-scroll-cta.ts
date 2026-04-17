import {
  WHY_CTA_EDGE_MIN_PX,
  WHY_CTA_EDGE_WIDTH_FRAC,
  WHY_CTA_LEAD_TRACK,
} from '../constants/why-layout';
import { clamp, smoothstep } from '../utils/why-scroll-math';
import {
  firstLineRectInElement,
  lastLineBottomInElement,
} from './why-scroll-dom';

export type CtaZone = { left: number; right: number; top: number; bottom: number };

type CtaLayoutMetrics = { boxOuterRect: DOMRect };

export function ctaOverlapMultiplier(
  rect: DOMRect,
  zone: CtaZone,
  yWeight: number,
  xWeight: number,
): number {
  const oy = Math.min(rect.bottom, zone.bottom) - Math.max(rect.top, zone.top);
  if (oy <= 0) return 1;
  const ox = Math.min(rect.right, zone.right) - Math.max(rect.left, zone.left);
  if (ox <= 0) return 1;
  const fracY = oy / Math.max(rect.height, 1);
  const fracX = ox / Math.max(rect.width, 1);
  return 1 - smoothstep(Math.min(1, fracY * yWeight + fracX * xWeight));
}

export function applyCtaFade(params: {
  scrollTop: number;
  ctaFadePx: number;
  ctaHiddenOpacity: number;
  boxEl: HTMLElement;
  ctaEl: Element | null;
}): number {
  const ctaProgress = clamp(params.scrollTop / params.ctaFadePx, 0, 1);
  const ctaO = 1 - smoothstep(ctaProgress);
  params.boxEl.style.setProperty('--why-cta-opacity', ctaO.toFixed(3));
  if (params.ctaEl instanceof HTMLElement) {
    params.ctaEl.style.visibility = ctaO < params.ctaHiddenOpacity ? 'hidden' : 'visible';
  }
  return ctaO;
}

export function applyCtaHorizontalAnchor(params: {
  boxEl: HTMLElement;
  ctaEl: Element | null;
  leadForCta: Element | null;
  metrics: CtaLayoutMetrics;
}): void {
  if (!(params.ctaEl instanceof HTMLElement) || !(params.leadForCta instanceof HTMLElement)) {
    return;
  }
  const firstLine = firstLineRectInElement(params.leadForCta);
  if (!firstLine) return;
  let anchor =
    firstLine.left -
    params.metrics.boxOuterRect.left +
    WHY_CTA_LEAD_TRACK * firstLine.width;
  const edge = Math.max(
    WHY_CTA_EDGE_MIN_PX,
    params.metrics.boxOuterRect.width * WHY_CTA_EDGE_WIDTH_FRAC,
  );
  anchor = clamp(anchor, edge, params.metrics.boxOuterRect.width - edge);
  params.boxEl.style.setProperty('--why-cta-left', `${anchor.toFixed(2)}px`);
}

export function applyCtaVerticalMidpoint(params: {
  boxEl: HTMLElement;
  ctaEl: Element | null;
  leadForCta: Element | null;
  metrics: CtaLayoutMetrics;
  ctaFromLeadToBottomFrac: number;
  ctaVerticalFracFromBoxBottom: number;
  ctaTopClampMargin: number;
}): void {
  if (!(params.ctaEl instanceof HTMLElement)) return;
  const boxTop = params.metrics.boxOuterRect.top;
  const boxBottom = params.metrics.boxOuterRect.bottom;
  const boxH = params.metrics.boxOuterRect.height;
  const leadBottom = lastLineBottomInElement(params.leadForCta);
  let targetY: number;
  if (leadBottom == null || !Number.isFinite(leadBottom)) {
    targetY = boxBottom - params.ctaVerticalFracFromBoxBottom * boxH;
  } else {
    const gap = Math.max(0, boxBottom - leadBottom);
    targetY = leadBottom + params.ctaFromLeadToBottomFrac * gap;
  }
  let topPx = targetY - boxTop;
  topPx = clamp(
    topPx,
    params.ctaTopClampMargin,
    Math.max(params.ctaTopClampMargin, boxH - params.ctaTopClampMargin),
  );
  params.boxEl.style.setProperty('--why-cta-top', `${topPx.toFixed(2)}px`);
}

export function applyCtaScale(params: {
  boxEl: HTMLElement;
  ctaEl: Element | null;
  metrics: CtaLayoutMetrics;
  baselineBoxWidth: number;
  scaleNarrowRangePx: number;
  scaleMaxBoost: number;
}): number {
  if (!(params.ctaEl instanceof HTMLElement)) return params.baselineBoxWidth;
  let nextBaseline = params.baselineBoxWidth;
  if (nextBaseline <= 0 && params.metrics.boxOuterRect.width > 0) {
    nextBaseline = params.metrics.boxOuterRect.width;
  }
  const baseline = nextBaseline || params.metrics.boxOuterRect.width;
  const narrowness = clamp(
    (baseline - params.metrics.boxOuterRect.width) / params.scaleNarrowRangePx,
    0,
    1,
  );
  const scale = 1 + params.scaleMaxBoost * smoothstep(narrowness);
  params.boxEl.style.setProperty('--why-cta-scale', scale.toFixed(3));
  return nextBaseline;
}

export function applyCtaAttachedVeil(params: {
  boxEl: HTMLElement;
  ctaEl: Element | null;
  leadForCta: Element | null;
  wideP: Element | null;
  ctaOpacity: number;
  ctaHiddenOpacity: number;
  veilProximityBandPx: number;
  veilAboveArrowPx: number;
  veilClearanceBelowLeadPx: number;
}): void {
  if (
    !(params.ctaEl instanceof HTMLElement) ||
    !(params.leadForCta instanceof HTMLElement) ||
    params.ctaOpacity <= params.ctaHiddenOpacity
  ) {
    params.boxEl.style.setProperty('--why-cta-veil-top', '100%');
    params.boxEl.style.setProperty('--why-cta-veil-opacity', '0');
    return;
  }
  const leadBottom = lastLineBottomInElement(params.leadForCta);
  const wideBottom = lastLineBottomInElement(params.wideP);
  const boxRect = params.boxEl.getBoundingClientRect();
  const ctaRect = params.ctaEl.getBoundingClientRect();
  if (
    leadBottom == null ||
    !Number.isFinite(leadBottom) ||
    ctaRect.height <= 0 ||
    boxRect.height <= 0
  ) {
    params.boxEl.style.setProperty('--why-cta-veil-top', '100%');
    params.boxEl.style.setProperty('--why-cta-veil-opacity', '0');
    return;
  }
  const distance = ctaRect.top - leadBottom;
  const band = Math.max(params.veilProximityBandPx, ctaRect.height * 2.6);
  const proximity = clamp(1 - distance / band, 0, 1);
  const localStrength = clamp(0.86 + 0.14 * smoothstep(proximity), 0, 1);
  const o = localStrength * params.ctaOpacity;
  const wideBottomPx =
    wideBottom != null && Number.isFinite(wideBottom)
      ? wideBottom
      : Number.NEGATIVE_INFINITY;
  const guardBottom = Math.max(leadBottom, wideBottomPx);
  const guardBottomLocal = guardBottom - boxRect.top;
  const ctaTopLocal = ctaRect.top - boxRect.top;
  const desiredTop = ctaTopLocal - params.veilAboveArrowPx;
  const topEdge = clamp(
    Math.max(desiredTop, guardBottomLocal + params.veilClearanceBelowLeadPx),
    0,
    boxRect.height,
  );
  params.boxEl.style.setProperty('--why-cta-veil-top', `${Math.round(topEdge)}px`);
  params.boxEl.style.setProperty('--why-cta-veil-opacity', o.toFixed(3));
}

export function buildCtaZone(params: {
  ctaEl: Element | null;
  ctaOpacity: number;
  ctaZoneMinOpacity: number;
  ctaRectMin: number;
  ctaZonePadHMin: number;
  ctaZonePadHFrac: number;
  ctaZonePadTop: number;
  ctaZonePadBottom: number;
}): CtaZone | null {
  if (
    !(params.ctaEl instanceof HTMLElement) ||
    params.ctaOpacity <= params.ctaZoneMinOpacity ||
    params.ctaEl.style.visibility === 'hidden'
  ) {
    return null;
  }
  const cr = params.ctaEl.getBoundingClientRect();
  if (cr.width <= params.ctaRectMin || cr.height <= params.ctaRectMin) return null;
  const padH = Math.max(params.ctaZonePadHMin, cr.width * params.ctaZonePadHFrac);
  return {
    left: cr.left - padH,
    right: cr.right + padH,
    top: cr.top - params.ctaZonePadTop,
    bottom: cr.bottom + params.ctaZonePadBottom,
  };
}
