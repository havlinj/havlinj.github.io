/**
 * Profile grid typography:
 * - Shared tile label size from the longest of Why / What I do / Foundations → --profile-tile-label-font-size.
 * - Foundations reveal → --profile-reveal-font-size (often derived from tile size).
 * Dispatches `profileTileTypeFit` when ready so Layout can drop the loading veil (reveal uses a fixed rem fallback in CSS if JS is off — no clamp).
 *
 * Implementation is split across profile-tile-type-fit-*.ts modules; this file is the entry + startup sequence only.
 */

import { wireProfileGifTileMedia } from './profile-gif-tile-video';
import { TYPE_FIT_EVENT } from './profile-tile-type-fit-constants';
import {
  wireFoundationsRevealResize,
  wireResize,
} from './profile-tile-type-fit-observers';
import { fitAll } from './profile-tile-type-fit-pass';
import { wireFoundationsReveal } from './profile-tile-type-fit-reveal-wire';

const INITIAL_FIT_MAX_FRAMES = 18;
const INITIAL_FIT_STABLE_PASSES = 2;

function signalTypeFitReady(): void {
  document.dispatchEvent(new CustomEvent(TYPE_FIT_EVENT));
}

function readLayoutKey(): string {
  const section = document.querySelector('.profile-section');
  const why = document.querySelector(".profile-section > a[href='/why']");
  const what = document.querySelector(
    ".profile-section > a[href='/what-i-do']",
  );
  const foundations = document.querySelector(
    '.profile-section .prof-tile--foundations',
  );

  const toRectKey = (el: Element | null): string => {
    if (!(el instanceof HTMLElement)) return 'na';
    const r = el.getBoundingClientRect();
    return [
      Math.round(r.width * 1000) / 1000,
      Math.round(r.height * 1000) / 1000,
      Math.round(r.left * 1000) / 1000,
      Math.round(r.top * 1000) / 1000,
    ].join(',');
  };

  const rootStyle = document.documentElement.style;
  const labelSize = rootStyle.getPropertyValue(
    '--profile-tile-label-font-size',
  );
  const revealSize = rootStyle.getPropertyValue('--profile-reveal-font-size');

  return [
    toRectKey(section),
    toRectKey(why),
    toRectKey(what),
    toRectKey(foundations),
    labelSize.trim(),
    revealSize.trim(),
  ].join('|');
}

function runInitialFitUntilStable(onDone: () => void): void {
  let frameCount = 0;
  let stablePasses = 0;
  let previousKey = '';

  const step = () => {
    fitAll();
    const currentKey = readLayoutKey();
    if (currentKey !== '' && currentKey === previousKey) {
      stablePasses += 1;
    } else {
      stablePasses = 0;
      previousKey = currentKey;
    }
    frameCount += 1;

    if (
      stablePasses >= INITIAL_FIT_STABLE_PASSES ||
      frameCount >= INITIAL_FIT_MAX_FRAMES
    ) {
      onDone();
      return;
    }
    requestAnimationFrame(step);
  };

  requestAnimationFrame(step);
}

async function start(): Promise<void> {
  wireProfileGifTileMedia();

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
  runInitialFitUntilStable(() => {
    signalTypeFitReady();
    wireResize();
    wireFoundationsRevealResize();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => void start());
} else {
  void start();
}
