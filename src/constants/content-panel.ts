/**
 * Content panel — the large ~1:1 main content area below the page title on hero,
 * profile, writing, contact, and route maintenance. Cross-page domain term; DOM class
 * names stay historical.
 *
 * Geometry and the gap below the page title live in src/styles/content-panel.css and are
 * shared through CONTENT_PANEL_CLASS / CONTENT_PANEL_PAGE_CLASS.
 */
export const CONTENT_PANEL_CLASS = 'content-panel';
export const CONTENT_PANEL_PAGE_CLASS = 'content-panel-page';

export const CONTENT_PANEL_SELECTORS = {
  hero: '.hero',
  profile: '.profile-section',
  writing: '.writing-page .page-buttons-panel',
  contact: '.contact-page .page-buttons-panel',
  maintenance: '.route-maintenance-panel',
} as const;

export type ContentPanelRoute = keyof typeof CONTENT_PANEL_SELECTORS;

export function documentHasContentPanel(doc: Document): boolean {
  return Object.values(CONTENT_PANEL_SELECTORS).some((selector) =>
    doc.querySelector(selector),
  );
}
