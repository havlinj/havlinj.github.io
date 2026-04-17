import { queryElement } from './profile-fit-dom';
import { SELECTORS } from './profile-tile-type-fit-constants';
import { fitAll } from './profile-tile-type-fit-pass';
import { fitFoundationsReveal } from './profile-tile-type-fit-reveal-fit';

function makeRafCoalesced(fn: () => void): () => void {
  let rafId = 0;
  return () => {
    if (rafId) window.cancelAnimationFrame(rafId);
    rafId = window.requestAnimationFrame(() => {
      rafId = 0;
      fn();
    });
  };
}

export function wireResize(): void {
  const section = queryElement(document, SELECTORS.profileSection, HTMLElement);
  if (!section) return;
  const scheduleFitAll = makeRafCoalesced(fitAll);
  const ro = new ResizeObserver(scheduleFitAll);
  ro.observe(section);
  window.addEventListener('orientationchange', scheduleFitAll);
  // Pinch/browser zoom can change visual viewport without triggering element ResizeObserver.
  window.visualViewport?.addEventListener('resize', scheduleFitAll);
}

/** Reveal box width changes in Foundations tile state2 — refit without polling the whole section. */
export function wireFoundationsRevealResize(): void {
  const reveal = queryElement(
    document,
    SELECTORS.foundationsRevealInTile,
    HTMLElement,
  );
  if (!reveal) return;
  const scheduleRevealFit = makeRafCoalesced(() =>
    fitFoundationsReveal(reveal),
  );
  const ro = new ResizeObserver(scheduleRevealFit);
  ro.observe(reveal);
}
