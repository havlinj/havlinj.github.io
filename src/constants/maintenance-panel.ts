/**
 * Route-maintenance content panel look — CSS on `.route-maintenance-page`
 * must stay aligned (see layout-contracts + maintenance e2e).
 */
export const MAINTENANCE_PANEL_BG_STEM =
  '/assets/pages/maintenance/frankie-cordoba-s8Y5e0DNiro-unsplash_dichrom' as const;

/** Values written as custom props on `.route-maintenance-page` in maintenance.css. */
export const MAINTENANCE_LAYOUT = {
  revealFallbackMs: 2500,
} as const;

export const MAINTENANCE_SELECTORS = {
  panel: '.route-maintenance-page .page-buttons-panel',
  panelMedia: '.route-maintenance-page .page-buttons-panel__media',
} as const;

export const MAINTENANCE_CLASSES = {
  panelMediaPending: 'route-maintenance-panel__media--pending',
  panelMediaVisible: 'route-maintenance-panel__media--visible',
} as const;

export const MAINTENANCE_PANEL_BG = {
  posX: '50%',
  posY: '50%',
  layerOpacity: '1',
  saturation: '1',
  brightness: '1',
  contrast: '1',
  zoom: '1.2',
  nudgeX: '0',
  nudgeY: '-0.03',
  rotate: '0deg',
} as const;
