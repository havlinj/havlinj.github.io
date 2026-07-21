/**
 * Shared content-reveal fade on main panel pages (Hero / Writing / Contact / Profile).
 * Keep CSS `transition: opacity …` on those routes aligned with these values.
 */
export const PAGE_REVEAL_OPACITY_DURATION_S = 0.18;
export const PAGE_REVEAL_OPACITY_EASING = 'ease-out';
export const PAGE_REVEAL_OPACITY_TRANSITION =
  `opacity ${PAGE_REVEAL_OPACITY_DURATION_S}s ${PAGE_REVEAL_OPACITY_EASING}` as const;

/** Stylesheets that declare the shared reveal transition on the content layer. */
export const PAGE_REVEAL_STYLESHEETS = [
  'src/styles/hero.css',
  'src/styles/writing.css',
  'src/styles/contact.css',
  'src/styles/profile.css',
] as const;

/** Element that carries the transition once content is (or is about to be) revealed. */
export const PAGE_REVEAL_SELECTORS = {
  hero: '.hero-content',
  writing: '.writing-page .writing-groups.writing-groups--visible',
  contact:
    '.contact-page .contact-page__fit-content.contact-page__fit-content--visible',
  profile: '.profile-section:not(.profile-section--loading)',
} as const;

export type PageRevealRoute = keyof typeof PAGE_REVEAL_SELECTORS;
