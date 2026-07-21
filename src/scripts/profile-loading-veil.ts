/**
 * Profile loading veil: keep `.profile-section--loading` until portrait pixels are ready
 * and tile type-fit has run. `profile.astro` calls `initProfileLoadingVeil()` before
 * type-fit starts so the event listener is always registered first.
 */

import { TYPE_FIT_EVENT } from './profile-tile-type-fit-constants';

const TYPE_FIT_FALLBACK_TIMEOUT_MS = 8000;
const PORTRAIT_READY_TIMEOUT_MS = 4000;

type ProfileLoadingVeilState = {
  section: HTMLElement;
  portraitReady: boolean;
  typeFitReady: boolean;
};

/** Entry point — register gates and start portrait wiring. No-op off the profile page. */
export function initProfileLoadingVeil(): void {
  const section = document.querySelector('.profile-section--loading');
  if (!(section instanceof HTMLElement)) return;

  const state: ProfileLoadingVeilState = {
    section,
    portraitReady: false,
    typeFitReady: false,
  };

  wireTypeFitGate(state);
  wirePortraitGate(state);
}

function tryReveal(state: ProfileLoadingVeilState): void {
  if (!state.portraitReady || !state.typeFitReady) return;

  /* One paint frame under the veil, then reveal (opacity 0.22s — Hero/Writing/Contact).
     Two rAF added ~37 ms with no e2e stability gain (see profile-load-breakdown.mjs). */
  requestAnimationFrame(() => {
    state.section.classList.remove('profile-section--loading');
  });
}

function markTypeFitReady(state: ProfileLoadingVeilState): void {
  if (state.typeFitReady) return;
  state.typeFitReady = true;
  tryReveal(state);
}

function markPortraitReady(state: ProfileLoadingVeilState): void {
  if (state.portraitReady) return;
  state.portraitReady = true;
  tryReveal(state);
}

function wireTypeFitGate(state: ProfileLoadingVeilState): void {
  document.addEventListener(TYPE_FIT_EVENT, () => markTypeFitReady(state), {
    once: true,
  });

  window.setTimeout(
    () => markTypeFitReady(state),
    TYPE_FIT_FALLBACK_TIMEOUT_MS,
  );
}

function wirePortraitGate(state: ProfileLoadingVeilState): void {
  const img = state.section.querySelector('.profile-photo-frame img');
  if (!(img instanceof HTMLImageElement)) {
    markPortraitReady(state);
    return;
  }

  wirePortraitImage(state, img);
}

function wirePortraitImage(
  state: ProfileLoadingVeilState,
  img: HTMLImageElement,
): void {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const reveal = (): void => {
    if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    img.removeEventListener('load', onReady);
    img.removeEventListener('error', reveal);
    markPortraitReady(state);
  };

  const onReady = (): void => {
    /* decoding=sync on the portrait <img> — load means pixels are ready; skip
       a second decode() await that often added hundreds of ms on mobile. */
    reveal();
  };

  if (img.complete && img.naturalWidth > 0) {
    onReady();
    return;
  }

  img.addEventListener('load', onReady);
  img.addEventListener('error', reveal);
  timeoutId = window.setTimeout(reveal, PORTRAIT_READY_TIMEOUT_MS);
}
