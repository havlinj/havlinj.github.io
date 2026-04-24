export const CONTACT_LAYOUT = {
  insetPanelPadFrac: 0.1,
  insetMaxRatio: 1,
  baselineFontPx: 16,
  fitSafetyXPx: 2,
  fitSafetyYPx: 6,
  maxFitPasses: 5,
  revealFallbackMs: 2500,
  defaultBoxGapPx: 18,
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
