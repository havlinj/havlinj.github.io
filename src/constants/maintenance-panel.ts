/**
 * Route-maintenance content panel look — CSS on `.route-maintenance-page`
 * must stay aligned (see layout-contracts + maintenance e2e).
 */
export const MAINTENANCE_PANEL_BG_STEM =
  '/assets/pages/maintenance/frankie-cordoba-s8Y5e0DNiro-unsplash_dichrom' as const;

export const RECONSTRUCTION_PANEL_BG_STEM =
  '/assets/pages/reconstruction/pexels-anastasia-shuraeva-5495064_dichrom' as const;

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
