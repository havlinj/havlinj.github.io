import { CONTACT_LAYOUT } from '../constants/contact-layout';

/** Vertical gap intro → links on contact landing (used by contact-layout-fit). */
export function computeIntroLinksGapPx(
  introOuterH: number,
  panelEdge: number,
): number {
  const minG = CONTACT_LAYOUT.introLinksGapMinPx;
  const fromIntro = introOuterH * CONTACT_LAYOUT.introLinksGapIntroHeightRatio;
  const fromPanel = panelEdge * CONTACT_LAYOUT.introLinksGapPanelRatio;
  return Math.round(Math.max(minG, Math.min(fromIntro, fromPanel)));
}

/** Minimum fluid font size for a panel square edge (used by contact-layout-fit). */
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
