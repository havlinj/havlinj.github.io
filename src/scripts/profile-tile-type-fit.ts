/**
 * Profile grid typography:
 * - Shared tile label size from the longest of Why / What I do / Foundations → --profile-tile-label-font-size.
 * - Foundations reveal → --profile-reveal-font-size (often derived from tile size).
 * - Portrait column geometry → --profile-right-height-px, --profile-portrait-side-px.
 * Dispatches `profileTileTypeFit` when ready so Layout can drop the loading veil (reveal uses a fixed rem fallback in CSS if JS is off — no clamp).
 *
 * Implementation is split across profile-tile-type-fit-*.ts modules; this file is the entry + startup sequence only.
 */

import { TYPE_FIT_EVENT } from './profile-tile-type-fit-constants';
import {
  wireFoundationsRevealResize,
  wireResize,
} from './profile-tile-type-fit-observers';
import { fitAll } from './profile-tile-type-fit-pass';
import { wireFoundationsReveal } from './profile-tile-type-fit-reveal-wire';

function signalTypeFitReady(): void {
  document.dispatchEvent(new CustomEvent(TYPE_FIT_EVENT));
}

async function start(): Promise<void> {
  try {
    await Promise.race([
      document.fonts.ready,
      new Promise<void>((resolve) => window.setTimeout(resolve, 6000)),
    ]);
  } catch {
    /* ignore */
  }

  /*
   * ResizeObserver on `.profile-section` must attach only after the first-fit burst + signal.
   * If RO is registered earlier, its first delivery often lands on the frame after
   * `profileTileTypeFit` — then a late `fitAll()` nudges label size / cqi while the grid
   * is already visible (seams at Why/What I do and What I do/Foundations).
   */
  wireFoundationsReveal();

  requestAnimationFrame(() => {
    fitAll();
    requestAnimationFrame(() => {
      fitAll();
      requestAnimationFrame(() => {
        fitAll();
        signalTypeFitReady();
        wireResize();
        wireFoundationsRevealResize();
      });
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => void start());
} else {
  void start();
}
