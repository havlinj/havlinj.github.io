export const CONTACT_LAYOUT = {
  insetPanelPadFrac: 0.1,
  insetMaxRatio: 1,
  baselineFontPx: 15.35,
  fontBaselineReferenceEdgePx: 380,
  minFontPx: 15,
  minFontPxSmall: 12.35,
  minFontEdgeLo: 300,
  minFontEdgeHi: 468,
  maxFontPx: 17,
  curveFontBaselineEdgePx: 560,
  smallPanelEdgePx: 440,
  smallPanelFontScale: 0.905,
  tinyPanelEdgePx: 402,
  tinyPanelFontExtraScale: 0.885,
  microPanelEdgePx: 326,
  microPanelFontExtraScale: 0.94,
  fitSafetyXPx: 2,
  fitSafetyYPx: 6,
  introLinksGapMinPx: 32,
  introLinksGapIntroHeightRatio: 0.74,
  introLinksGapPanelRatio: 0.072,
  maxFitPasses: 3,
  revealFallbackMs: 2500,
  defaultBoxGapPx: 18,
  linkTailMinPx: 13,
  linkTailMinPanelRatio: 0.036,
  linksCenterFromBottomRatio: 0.69,
} as const;

export const CONTACT_SELECTORS = {
  panel: '.contact-page .page-buttons-panel',
  fitContent: '.contact-page .contact-page__fit-content',
  introRect: '.contact-page__inset-rect--intro',
  linksRect: '.contact-page__inset-rect--links',
  zone: '.contact-page .page-buttons-zone',
  mainContent: 'main.content',
} as const;

export const CONTACT_CLASSES = {
  fitPending: 'contact-page__fit-content--pending',
  fitVisible: 'contact-page__fit-content--visible',
} as const;
