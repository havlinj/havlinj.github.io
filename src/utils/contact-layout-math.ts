import { CONTACT_LAYOUT } from '../constants/contact-layout';

export function computeIntroLinksGapPx(
  introOuterH: number,
  panelEdge: number,
): number {
  const minG = CONTACT_LAYOUT.introLinksGapMinPx;
  const fromIntro = introOuterH * CONTACT_LAYOUT.introLinksGapIntroHeightRatio;
  const fromPanel = panelEdge * CONTACT_LAYOUT.introLinksGapPanelRatio;
  return Math.round(Math.max(minG, Math.min(fromIntro, fromPanel)));
}

export function computeMinFontPx(panelEdge: number): number {
  const lo = CONTACT_LAYOUT.minFontEdgeLo;
  const hi = CONTACT_LAYOUT.minFontEdgeHi;
  const a = CONTACT_LAYOUT.minFontPxSmall;
  const b = CONTACT_LAYOUT.minFontPx;
  const edge = Math.max(1, panelEdge);
  if (edge >= hi) return b;
  if (edge <= lo) return a;
  return a + ((b - a) * (edge - lo)) / (hi - lo);
}

export function computeDesiredFontPx(panelEdge: number): number {
  const refEdge = Math.max(1, CONTACT_LAYOUT.fontBaselineReferenceEdgePx);
  const fontToEdgeRatio = CONTACT_LAYOUT.baselineFontPx / refEdge;
  let scaledFontPx = panelEdge * fontToEdgeRatio;
  if (panelEdge <= CONTACT_LAYOUT.smallPanelEdgePx) {
    scaledFontPx *= CONTACT_LAYOUT.smallPanelFontScale;
  }
  if (panelEdge <= CONTACT_LAYOUT.tinyPanelEdgePx) {
    scaledFontPx *= CONTACT_LAYOUT.tinyPanelFontExtraScale;
  }
  if (panelEdge <= CONTACT_LAYOUT.microPanelEdgePx) {
    scaledFontPx *= CONTACT_LAYOUT.microPanelFontExtraScale;
  }
  const minPx = computeMinFontPx(panelEdge);
  return Math.min(CONTACT_LAYOUT.maxFontPx, Math.max(minPx, scaledFontPx));
}

export function resolveContactFluidFontPx(
  panelEdge: number,
  cssFontPx: number,
): number {
  const curvePx = computeDesiredFontPx(panelEdge);
  const desiredFontPx =
    panelEdge <= CONTACT_LAYOUT.curveFontBaselineEdgePx
      ? curvePx
      : Number.isFinite(cssFontPx) && cssFontPx > 0
        ? cssFontPx
        : curvePx;
  const minFontPx = computeMinFontPx(panelEdge);
  return Math.min(CONTACT_LAYOUT.maxFontPx, Math.max(minFontPx, desiredFontPx));
}

export type ContactFitContentSize = {
  neededWidth: number;
  neededHeight: number;
};

export function applyContactFitPasses(params: {
  panelEdge: number;
  desiredFontPx: number;
  neededWidth: number;
  neededHeight: number;
  measureAtFont: (fontPx: number) => ContactFitContentSize;
}): { desiredFontPx: number } & ContactFitContentSize {
  const minFontPx = computeMinFontPx(params.panelEdge);
  let desiredFontPx = params.desiredFontPx;
  let { neededWidth, neededHeight } = params;
  const availW = params.panelEdge * CONTACT_LAYOUT.insetMaxRatio;
  const availH = params.panelEdge * CONTACT_LAYOUT.insetMaxRatio;
  let pass = 0;
  while (
    (neededWidth > availW || neededHeight > availH) &&
    pass < CONTACT_LAYOUT.maxFitPasses
  ) {
    const scale = Math.min(availW / neededWidth, availH / neededHeight, 1);
    desiredFontPx = Math.max(minFontPx, desiredFontPx * scale);
    ({ neededWidth, neededHeight } = params.measureAtFont(desiredFontPx));
    pass += 1;
  }
  return { desiredFontPx, neededWidth, neededHeight };
}

export function clampContactInsetPanelPadFrac(raw: number): number {
  if (Number.isFinite(raw) && raw > 0) return Math.min(0.5, raw);
  return 0.1;
}

export function outerRectSizeWithMarginsCeil(
  scrollWidth: number,
  scrollHeight: number,
  marginLeft: number,
  marginRight: number,
  marginTop: number,
  marginBottom: number,
): { w: number; h: number } {
  return {
    w: Math.ceil(scrollWidth + marginLeft + marginRight),
    h: Math.ceil(scrollHeight + marginTop + marginBottom),
  };
}

export function computeLinksTopPxForCenterFromBottom(
  panelH: number,
  linksH: number,
  fromBottomRatio: number = CONTACT_LAYOUT.linksCenterFromBottomRatio,
): number {
  const h = Math.max(1, panelH);
  const centerYFromTop = h * (1 - fromBottomRatio);
  const top = Math.round(centerYFromTop - linksH / 2);
  const maxTop = Math.max(
    0,
    Math.round(h - linksH - CONTACT_LAYOUT.fitSafetyYPx),
  );
  return Math.max(0, Math.min(top, maxTop));
}
