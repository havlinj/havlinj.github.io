export const HERO_TAGLINE_SUB_FONT_VAR = '--hero-tagline-sub-font-size';

export const HERO_TAGLINE_SELECTORS = {
  hero: '.hero',
  lead: '.tagline:not(.tagline--sub)',
  sub: '.tagline--sub',
} as const;

export const HERO_TAGLINE_FONT_WAIT_MS = 3000;
