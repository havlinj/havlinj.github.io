/**
 * Content panel — the large ~1:1 main content area below the page title on hero,
 * profile, writing, and contact. Cross-page domain term; DOM class names stay historical.
 */
export const CONTENT_PANEL_SELECTORS = {
  hero: '.hero',
  profile: '.profile-section',
  writing: '.writing-page .page-buttons-panel',
  contact: '.contact-page .page-buttons-panel',
} as const;

export type ContentPanelRoute = keyof typeof CONTENT_PANEL_SELECTORS;

export function documentHasContentPanel(doc: Document): boolean {
  return Object.values(CONTENT_PANEL_SELECTORS).some((selector) =>
    doc.querySelector(selector),
  );
}
