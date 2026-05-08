export const CONTACT_LAYOUT = {
  insetPanelPadFrac: 0.1,
  insetMaxRatio: 1,
  baselineFontPx: 15.35,
  /** Edge length (px) where baselineFontPx is the nominal fluid size (ratio denominator only). */
  fontBaselineReferenceEdgePx: 380,
  /** Floor on wide panels; on narrow panels see minFontPxSmall + minFontEdge*. */
  minFontPx: 15,
  /** Allowed minimum on very small squares (ramps up toward minFontPx by minFontEdgeHi). Near /why body band at stressed scales. */
  minFontPxSmall: 12.35,
  minFontEdgeLo: 300,
  minFontEdgeHi: 468,
  maxFontPx: 17,
  /** Panel square edge (px): below this, baseline font follows computeDesiredFontPx, not inherited ~16px root. */
  curveFontBaselineEdgePx: 560,
  /** Above typical phone widths (was 380), damp curve still applies into mid‑400s squares. */
  smallPanelEdgePx: 440,
  smallPanelFontScale: 0.905,
  tinyPanelEdgePx: 402,
  tinyPanelFontExtraScale: 0.885,
  microPanelEdgePx: 326,
  microPanelFontExtraScale: 0.94,
  fitSafetyXPx: 2,
  fitSafetyYPx: 6,
  /** Vertical gap intro → links: scales down on small panels; typically smaller than intro block height. */
  introLinksGapMinPx: 32,
  introLinksGapIntroHeightRatio: 0.74,
  introLinksGapPanelRatio: 0.072,
  maxFitPasses: 3,
  revealFallbackMs: 2500,
  defaultBoxGapPx: 18,
  /** Minimum gap from button text to column inner edge (CSS max() with em tail). */
  linkTailMinPx: 13,
  /** Extra tail floor from panel size so large squares keep breathable inset. */
  linkTailMinPanelRatio: 0.036,
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
