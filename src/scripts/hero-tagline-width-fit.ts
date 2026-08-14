import {
  HERO_TAGLINE_FONT_WAIT_MS,
  HERO_TAGLINE_SELECTORS,
  HERO_TAGLINE_SUB_FONT_VAR,
} from '../constants/hero-tagline';
import { fontPxToMatchBandWidth } from '../utils/hero-tagline-width-fit';

type TaglineFitState = {
  hero: HTMLElement;
  lead: HTMLElement;
  sub: HTMLElement;
};

function waitForFonts(): Promise<void> {
  const fonts = document.fonts;
  if (!fonts?.ready) return Promise.resolve();
  return Promise.race([
    fonts.ready.then(() => undefined),
    new Promise<void>((resolve) => {
      window.setTimeout(resolve, HERO_TAGLINE_FONT_WAIT_MS);
    }),
  ]);
}

function fitSubBandToLead(state: TaglineFitState): void {
  const leadWidth = state.lead.getBoundingClientRect().width;
  const subBox = state.sub.getBoundingClientRect();
  const subStyle = getComputedStyle(state.sub);
  const paddingInlineSum =
    parseFloat(subStyle.paddingLeft) + parseFloat(subStyle.paddingRight);
  const fontPx = parseFloat(subStyle.fontSize);
  const nextFontPx = fontPxToMatchBandWidth(
    fontPx,
    subBox.width,
    leadWidth,
    paddingInlineSum,
  );
  if (!Number.isFinite(nextFontPx) || nextFontPx <= 0) return;
  state.hero.style.setProperty(
    HERO_TAGLINE_SUB_FONT_VAR,
    `${Math.round(nextFontPx * 100) / 100}px`,
  );
}

function queryFitState(): TaglineFitState | null {
  const hero = document.querySelector(HERO_TAGLINE_SELECTORS.hero);
  const lead = document.querySelector(HERO_TAGLINE_SELECTORS.lead);
  const sub = document.querySelector(HERO_TAGLINE_SELECTORS.sub);
  if (
    !(hero instanceof HTMLElement) ||
    !(lead instanceof HTMLElement) ||
    !(sub instanceof HTMLElement)
  ) {
    return null;
  }
  return { hero, lead, sub };
}

export function initHeroTaglineWidthFit(): void {
  function boot(): void {
    const state = queryFitState();
    if (!state) return;

    let raf = 0;
    function scheduleFit(): void {
      if (raf !== 0) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        fitSubBandToLead(state);
      });
    }

    scheduleFit();
    const observer = new ResizeObserver(() => {
      scheduleFit();
    });
    observer.observe(state.hero);
    observer.observe(state.lead);
    window.addEventListener('resize', scheduleFit);
  }

  void waitForFonts().then(() => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', boot, { once: true });
      return;
    }
    boot();
  });
}
