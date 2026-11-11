/** Photo knobs on `.contact-page` — keep aligned with contact.css. */
export const CONTACT_PANEL_BG = {
  posX: '50%',
  posY: '50%',
  layerOpacity: '0.98',
  saturation: '0.9',
  brightness: '1.07',
  contrast: '0.8',
  zoom: '1.4',
  nudgeX: '0.13',
  nudgeY: '0.494',
  rotate: '0.38deg',
} as const;

const CONTACT_PANEL_PHOTO_STEM =
  '/assets/pages/contact/guillaume-didelet-ivuU1X9ULVk-unsplash' as const;

/** Filename number is the file's real width. The `src` is the middle tier. */
export const CONTACT_PANEL_PHOTO_WIDTHS = [960, 1600, 2400] as const;

export const CONTACT_PANEL_PHOTO = {
  src: `${CONTACT_PANEL_PHOTO_STEM}-1600.webp`,
  width: 1600,
  height: 2400,
} as const;

export const CONTACT_PANEL_PHOTO_SRCSET = CONTACT_PANEL_PHOTO_WIDTHS.map(
  (width) => `${CONTACT_PANEL_PHOTO_STEM}-${width}.webp ${width}w`,
).join(', ');

/**
 * Slot the browser uses to pick a file. Same column math as reconstruction;
 * `70ch` in sizes is not Inter's "0", so the cap is the measured 70ch rounded up.
 */
const CONTACT_COLUMN_WIDTH = '707px';

export const CONTACT_PANEL_PHOTO_SIZES = `(max-width: 430px) calc((100vw - 2 * clamp(1.15rem, 6vw, 2rem)) * ${CONTACT_PANEL_BG.zoom}), calc((min(100vw, ${CONTACT_COLUMN_WIDTH}) - 4rem) * ${CONTACT_PANEL_BG.zoom})`;

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
  panelMedia: '.contact-page .page-buttons-panel__media',
  fitContent: '.contact-page .contact-page__fit-content',
  introRect: '.contact-page__inset-rect--intro',
  linksRect: '.contact-page__inset-rect--links',
  zone: '.contact-page .page-buttons-zone',
  mainContent: 'main.content',
} as const;

export const CONTACT_CLASSES = {
  fitPending: 'contact-page__fit-content--pending',
  fitVisible: 'contact-page__fit-content--visible',
  panelMediaPending: 'contact-page__panel-media--pending',
  panelMediaVisible: 'contact-page__panel-media--visible',
} as const;
