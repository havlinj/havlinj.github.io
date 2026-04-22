export const LABEL_VAR = '--profile-tile-label-font-size';
export const REVEAL_VAR = '--profile-reveal-font-size';

export const DEFAULT_REVEAL_TIMEOUT_MS = 7000;
export const REVEAL_FADE_MS = 180;
export const REVEAL_PAUSE_MS = 50;
/** Conservative padding vs `clientWidth` / `clientHeight` (overflow-based fit). */
export const REVEAL_OVERFLOW_H_PAD_PX = 10;
export const REVEAL_OVERFLOW_V_PAD_PX = 4;
/**
 * Last-glyph slack vs the stanza’s right padding edge. `scrollWidth` can match `clientWidth`
 * on some WebKit builds even when `overflow:visible` ink still clips under `overflow:hidden`
 * ancestors — so we also measure the `?` box directly.
 */
export const REVEAL_INK_H_PAD_PX = 4;

/** Layout.astro listens (once) before fading `.profile-section--loading` away. */
export const TYPE_FIT_EVENT = 'profileTileTypeFit';
export const SELECTORS = {
  profileSection: '.profile-section',
  pageTitle: 'article h1.page-title',
  whyTile: 'a.prof-tile[href="/why"]',
  whatIDoTile: 'a.prof-tile[href="/what-i-do"]',
  pageButtonInner: '.page-button__inner',
  pageButtonText: '.page-button__text',
  foundationsTile: '.prof-tile--foundations',
  foundationsReveal: '.prof-tile__reveal',
  foundationsRevealInTile: '.prof-tile--foundations .prof-tile__reveal',
  foundationsRevealStateSecondary: '.tile-state-secondary',
  foundationsRevealLine1: '.tile-state-secondary .line-1',
  foundationsRevealLine2: '.tile-state-secondary .line-2',
  foundationsRevealCopyInner: '.tile-state-secondary__inner',
  foundationsRevealStanza:
    '.tile-state-secondary .line-1, .tile-state-secondary .line-2',
} as const;
export const REVEAL_CLASSES = {
  revealed: 'is-revealed',
  fadingOut: 'is-reveal-fading-out',
  opening: 'is-reveal-opening',
  /** Set after fit + layout so reveal copy does not flash at wrong size. */
  typefitReady: 'is-reveal-typefit-ready',
} as const;

/**
 * Last resort: show reveal copy if stable layout never converges (slow device / long motion).
 * Must stay past tile state2 motion so we do not un-hide on CSS clamp + wrong box size.
 */
export const REVEAL_COPY_FALLBACK_MS = 3200;
/** Consecutive frames with identical stanza box + font var after fit (post-CSS-transition). */
export const REVEAL_LAYOUT_STABLE_FRAMES = 3;

export const FOUNDATIONS_REVEAL_UNIFORM_SCALE_VAR =
  '--foundations-reveal-uniform-scale';
