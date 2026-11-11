/**
 * Route-maintenance content panel look — CSS on `.route-maintenance-page`
 * must stay aligned (see layout-contracts + maintenance e2e).
 */
const MAINTENANCE_PANEL_PHOTO_STEM =
  '/assets/pages/maintenance/frankie-cordoba-s8Y5e0DNiro-unsplash' as const;

/** Filename number is the file's real width. The `src` is the middle tier. */
export const MAINTENANCE_PANEL_PHOTO_WIDTHS = [960, 1600, 2400] as const;

export const MAINTENANCE_PANEL_PHOTO = {
  src: `${MAINTENANCE_PANEL_PHOTO_STEM}-1600.webp`,
  width: 1600,
  height: 1067,
} as const;

export const MAINTENANCE_PANEL_PHOTO_SRCSET =
  MAINTENANCE_PANEL_PHOTO_WIDTHS.map(
    (width) => `${MAINTENANCE_PANEL_PHOTO_STEM}-${width}.webp ${width}w`,
  ).join(', ');

const RECONSTRUCTION_PANEL_PHOTO_STEM =
  '/assets/pages/reconstruction/pexels-anastasia-shuraeva-5495064' as const;

/** Filename number is the file's real width. The `src` is the middle tier. */
export const RECONSTRUCTION_PANEL_PHOTO_WIDTHS = [960, 1600, 2400] as const;

export const RECONSTRUCTION_PANEL_PHOTO = {
  src: `${RECONSTRUCTION_PANEL_PHOTO_STEM}-1600.webp`,
  width: 1600,
  height: 2400,
} as const;

export const RECONSTRUCTION_PANEL_PHOTO_SRCSET =
  RECONSTRUCTION_PANEL_PHOTO_WIDTHS.map(
    (width) => `${RECONSTRUCTION_PANEL_PHOTO_STEM}-${width}.webp ${width}w`,
  ).join(', ');

export const MAINTENANCE_RETURN_LINE = 'Let the mechanics work…' as const;

export const RECONSTRUCTION_HEADLINE_TAIL = 'is getting a new look' as const;

export const RECONSTRUCTION_RETURN_LINE = 'Let the painters paint…' as const;

/** Values written as custom props on `.route-maintenance-page` in maintenance.css. */
export const MAINTENANCE_LAYOUT = {
  revealFallbackMs: 2500,
} as const;

export const MAINTENANCE_SELECTORS = {
  panel:
    '.route-maintenance-page .page-buttons-panel, .global-maintenance-page .page-buttons-panel',
  panelMedia:
    '.route-maintenance-page .page-buttons-panel__media, .global-maintenance-page .page-buttons-panel__media',
} as const;

export const MAINTENANCE_CLASSES = {
  panelMediaPending: 'route-maintenance-panel__media--pending',
  panelMediaVisible: 'route-maintenance-panel__media--visible',
} as const;

export const RECONSTRUCTION_SELECTORS = {
  panel: '.reconstruction-page .reconstruction-panel',
  panelMedia: '.reconstruction-page .page-buttons-panel__media',
} as const;

export const RECONSTRUCTION_CLASSES = {
  panelMediaPending: 'reconstruction-panel__media--pending',
  panelMediaVisible: 'reconstruction-panel__media--visible',
} as const;

/** Set on the panel from its shorter edge; read by the photo object-position. */
export const RECONSTRUCTION_PANEL_EDGE_VAR = '--reconstruction-panel-edge';

export const MAINTENANCE_PANEL_BG = {
  posX: '50%',
  posY: '50%',
  layerOpacity: '1',
  saturation: '1',
  brightness: '1',
  contrast: '1',
  zoom: '1.23',
  nudgeX: '0',
  nudgeY: '0',
  rotate: '0deg',
} as const;

/** Photo knobs on `.reconstruction-page` — independent of MAINTENANCE_PANEL_BG. */
export const RECONSTRUCTION_PANEL_BG = {
  posX: '50%',
  posY: '50%',
  layerOpacity: '1',
  saturation: '1',
  brightness: '1',
  contrast: '1',
  zoom: '1.15',
  nudgeX: '0',
  nudgeY: '0',
  rotate: '0deg',
} as const;

/**
 * Slot the browser uses to pick a file. The image box is the column content
 * width times `--panel-bg-zoom`. `70ch` in a sizes attribute is 0.5em, not
 * Inter's "0", so the column cap is the measured 70ch (706.56px) rounded up.
 */
const PANEL_COLUMN_WIDTH = '707px';

export const MAINTENANCE_PANEL_PHOTO_SIZES = `(max-width: 430px) calc((100vw - 2 * clamp(1.15rem, 6vw, 2rem)) * ${MAINTENANCE_PANEL_BG.zoom}), calc((min(100vw, ${PANEL_COLUMN_WIDTH}) - 4rem) * ${MAINTENANCE_PANEL_BG.zoom})`;

export const RECONSTRUCTION_PANEL_PHOTO_SIZES = `(max-width: 430px) calc((100vw - 2 * clamp(1.15rem, 6vw, 2rem)) * ${RECONSTRUCTION_PANEL_BG.zoom}), calc((min(100vw, ${PANEL_COLUMN_WIDTH}) - 4rem) * ${RECONSTRUCTION_PANEL_BG.zoom})`;
