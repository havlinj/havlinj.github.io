/**
 * Profile grid typography:
 * - Shared tile label size from the longest of Why / What I do / Foundations → --profile-tile-label-font-size.
 * - Foundations reveal → --profile-reveal-font-size (often derived from tile size).
 * Dispatches `profileTileTypeFit` when ready so Layout can drop the loading veil (reveal uses a fixed rem fallback in CSS if JS is off — no clamp).
 *
 * Implementation is split across profile-tile-type-fit-*.ts modules; this file is the entry + startup sequence only.
 */

import { wireProfileGifTileMedia } from './profile-gif-tile-video';
import { syncProfileFrameGuttersFromWhatTile } from './profile-frame-gutters';
import { queryElement } from './profile-fit-dom';
import {
  LABEL_VAR,
  TYPE_FIT_EVENT,
  SELECTORS,
} from './profile-tile-type-fit-constants';
import {
  wireFoundationsRevealResize,
  wireResize,
} from './profile-tile-type-fit-observers';
import { fitAll } from './profile-tile-type-fit-pass';
import { wireFoundationsReveal } from './profile-tile-type-fit-reveal-wire';

const INITIAL_FIT_MAX_FRAMES = 24;
const INITIAL_FIT_STABLE_PASSES = 1;
const PROFILE_FONT_WAIT_MS = 4000;
const PROFILE_CSS_WAIT_MS = 3000;
/** ResizeObserver's first delivery often refits on the frame after reveal — defer wiring. */
const RESIZE_OBSERVER_DEFER_FRAMES = 4;

function signalTypeFitReady(): void {
  document.dispatchEvent(new CustomEvent(TYPE_FIT_EVENT));
}

/** Tile labels use Inter 700; Foundations reveal copy uses 400 but is hidden until open. */
function waitForProfileFonts(): Promise<void> {
  const fonts = document.fonts;
  if (!fonts?.load) return Promise.resolve();

  return Promise.race([
    fonts.load('700 16px Inter').then(() => undefined),
    new Promise<void>((resolve) => {
      window.setTimeout(resolve, PROFILE_FONT_WAIT_MS);
    }),
  ]).catch(() => undefined);
}

function profileLayoutCssReady(): boolean {
  const tile = document.querySelector(`${SELECTORS.profileSection} .prof-tile`);
  if (!(tile instanceof HTMLElement)) return false;
  return getComputedStyle(tile).maxHeight === 'none';
}

function waitForProfileLayoutCss(): Promise<void> {
  if (profileLayoutCssReady()) return Promise.resolve();

  return new Promise((resolve) => {
    const deadline = performance.now() + PROFILE_CSS_WAIT_MS;
    const tick = () => {
      if (profileLayoutCssReady() || performance.now() >= deadline) {
        resolve();
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

function waitForProfileSection(): Promise<HTMLElement | null> {
  const existing = queryElement(document, SELECTORS.profileSection, HTMLElement);
  if (existing) return Promise.resolve(existing);

  return new Promise((resolve) => {
    const deadline = performance.now() + PROFILE_CSS_WAIT_MS;
    const tick = () => {
      const section = queryElement(
        document,
        SELECTORS.profileSection,
        HTMLElement,
      );
      if (section || performance.now() >= deadline) {
        resolve(section);
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

function readLayoutKey(section: HTMLElement): string {
  const why = document.querySelector(SELECTORS.whyTile);
  const what = document.querySelector(SELECTORS.whatIDoTile);
  const foundations = document.querySelector(SELECTORS.foundationsTile);

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

  const labelSize = section.style.getPropertyValue(LABEL_VAR).trim();
  const blockGutter = section.style
    .getPropertyValue('--profile-frame-gutter-block-px')
    .trim();
  const sideGutter = section.style
    .getPropertyValue('--profile-frame-gutter-side-px')
    .trim();

  return [
    toRectKey(section),
    toRectKey(why),
    toRectKey(what),
    toRectKey(foundations),
    labelSize,
    blockGutter,
    sideGutter,
  ].join('|');
}

function runInitialFitUntilStable(onDone: () => void): void {
  const section = queryElement(
    document,
    SELECTORS.profileSection,
    HTMLElement,
  );
  if (!section) {
    onDone();
    return;
  }

  let frameCount = 0;
  let stablePasses = 0;
  let previousKey = '';

  /* One sync fit before the rAF loop — saves a frame vs waiting for first animation frame. */
  fitAll({ includeReveal: false });
  previousKey = readLayoutKey(section);
  frameCount = 1;

  const step = () => {
    fitAll({ includeReveal: false });
    const currentKey = readLayoutKey(section);
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

function deferWireResizeObservers(onReady: () => void): void {
  let framesLeft = RESIZE_OBSERVER_DEFER_FRAMES;
  const tick = () => {
    framesLeft -= 1;
    if (framesLeft <= 0) {
      onReady();
      return;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

async function start(): Promise<void> {
  wireFoundationsReveal();

  const section = await waitForProfileSection();
  if (!section) return;

  await Promise.all([waitForProfileFonts(), waitForProfileLayoutCss()]);

  runInitialFitUntilStable(() => {
    signalTypeFitReady();
    deferWireResizeObservers(() => {
      /* What I do MP4 (~3.7 MB) — after veil + 4 rAF; poster JPG is in markup + head preload. */
      wireProfileGifTileMedia();
      wireResize();
      wireFoundationsRevealResize();
    });
  });
}

void start();
