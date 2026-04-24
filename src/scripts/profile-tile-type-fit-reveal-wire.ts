import {
  minRevealFontPx,
  queryElement,
  setPxCustomProperty,
} from './profile-fit-dom';
import {
  DEFAULT_REVEAL_TIMEOUT_MS,
  REVEAL_CLASSES,
  REVEAL_COPY_FALLBACK_MS,
  REVEAL_FADE_MS,
  REVEAL_LAYOUT_STABLE_FRAMES,
  REVEAL_PAUSE_MS,
  REVEAL_VAR,
  SELECTORS,
} from './profile-tile-type-fit-constants';
import {
  clearFoundationsRevealFontLock,
  fitFoundationsReveal,
} from './profile-tile-type-fit-reveal-fit';

export function wireFoundationsReveal(): void {
  const foundationsTile = queryElement(
    document,
    SELECTORS.foundationsTile,
    HTMLAnchorElement,
  );
  if (!foundationsTile) return;

  let revealTimeoutId = 0;
  let revealCloseStepId = 0;
  let revealCopyFallbackId = 0;
  let revealStableRafId = 0;
  const revealTimeoutMs = (): number => {
    const raw = getComputedStyle(foundationsTile)
      .getPropertyValue('--profile-reveal-timeout-ms')
      .trim();
    const parsed = Number.parseFloat(raw);
    if (!Number.isFinite(parsed) || parsed <= 0)
      return DEFAULT_REVEAL_TIMEOUT_MS;
    return parsed;
  };

  const clearRevealTimers = () => {
    window.clearTimeout(revealTimeoutId);
    window.clearTimeout(revealCloseStepId);
    window.clearTimeout(revealCopyFallbackId);
    if (revealStableRafId) {
      window.cancelAnimationFrame(revealStableRafId);
      revealStableRafId = 0;
    }
    revealTimeoutId = 0;
    revealCloseStepId = 0;
    revealCopyFallbackId = 0;
  };

  const resetRevealToState1 = () => {
    clearRevealTimers();
    clearFoundationsRevealFontLock(foundationsTile);
    foundationsTile.classList.remove(
      REVEAL_CLASSES.revealed,
      REVEAL_CLASSES.fadingOut,
      REVEAL_CLASSES.opening,
      REVEAL_CLASSES.typefitReady,
    );
  };

  const isRevealed = (): boolean =>
    foundationsTile.classList.contains(REVEAL_CLASSES.revealed);
  const isFadingOut = (): boolean =>
    foundationsTile.classList.contains(REVEAL_CLASSES.fadingOut);
  const isOpening = (): boolean =>
    foundationsTile.classList.contains(REVEAL_CLASSES.opening);

  const finishRevealClose = () => {
    foundationsTile.classList.remove(
      REVEAL_CLASSES.revealed,
      REVEAL_CLASSES.fadingOut,
      REVEAL_CLASSES.typefitReady,
    );
    foundationsTile.classList.add(REVEAL_CLASSES.opening);
    void foundationsTile.offsetWidth;
    foundationsTile.classList.remove(REVEAL_CLASSES.opening);
  };

  const runRevealCloseSequence = () => {
    foundationsTile.classList.add(REVEAL_CLASSES.fadingOut);
    revealCloseStepId = window.setTimeout(() => {
      finishRevealClose();
      revealCloseStepId = 0;
    }, REVEAL_FADE_MS + REVEAL_PAUSE_MS);
  };

  const openReveal = () => {
    const reveal = queryElement(
      foundationsTile,
      SELECTORS.foundationsReveal,
      HTMLElement,
    );
    foundationsTile.classList.remove(
      REVEAL_CLASSES.fadingOut,
      REVEAL_CLASSES.opening,
      REVEAL_CLASSES.typefitReady,
    );
    foundationsTile.classList.add(REVEAL_CLASSES.revealed);
    clearRevealTimers();
    clearFoundationsRevealFontLock(foundationsTile);
    if (reveal) {
      // Avoid first paint using the CSS `clamp(...)` fallback: it can overshoot on narrow viewports
      // while the stanza box is still mid-transition (looks “huge” and clips `?`).
      // Seed must stay >0: line copy sizes use `em` vs this var; 0px collapses the stanza and breaks fit.
      const revealSeedPx = minRevealFontPx();
      if (revealSeedPx > 0) {
        setPxCustomProperty(reveal, REVEAL_VAR, revealSeedPx);
      } else {
        reveal.style.removeProperty(REVEAL_VAR);
      }

      const showRevealCopy = () => {
        if (revealStableRafId) {
          window.cancelAnimationFrame(revealStableRafId);
          revealStableRafId = 0;
        }
        if (revealCopyFallbackId) {
          window.clearTimeout(revealCopyFallbackId);
          revealCopyFallbackId = 0;
        }
        fitFoundationsReveal(reveal);
        revealStableRafId = window.requestAnimationFrame(() => {
          fitFoundationsReveal(reveal);
          revealStableRafId = window.requestAnimationFrame(() => {
            fitFoundationsReveal(reveal);
            revealStableRafId = 0;
            foundationsTile.classList.add(REVEAL_CLASSES.typefitReady);
          });
        });
      };
      revealCopyFallbackId = window.setTimeout(() => {
        revealCopyFallbackId = 0;
        if (foundationsTile.classList.contains(REVEAL_CLASSES.revealed)) {
          showRevealCopy();
        }
      }, REVEAL_COPY_FALLBACK_MS);

      /*
       * Wait for a stable stanza box + reveal font var across consecutive frames before
       * showing reveal copy; this avoids first-paint clipping/smear on slower devices.
       */
      let lastW = NaN;
      let lastH = NaN;
      let lastVar = '';
      let stableFrames = 0;
      const tick = () => {
        revealStableRafId = 0;
        if (!foundationsTile.classList.contains(REVEAL_CLASSES.revealed))
          return;
        fitFoundationsReveal(reveal);
        const stanza = queryElement(
          reveal,
          SELECTORS.foundationsRevealStateSecondary,
          HTMLElement,
        );
        if (!stanza || stanza.clientWidth < 4 || stanza.clientHeight < 4) {
          revealStableRafId = window.requestAnimationFrame(tick);
          return;
        }
        const w = Math.round(stanza.clientWidth);
        const h = Math.round(stanza.clientHeight);
        const v = getComputedStyle(reveal).getPropertyValue(REVEAL_VAR).trim();
        if (w === lastW && h === lastH && v === lastVar) {
          stableFrames++;
          if (stableFrames >= REVEAL_LAYOUT_STABLE_FRAMES) {
            showRevealCopy();
            return;
          }
        } else {
          stableFrames = 0;
          lastW = w;
          lastH = h;
          lastVar = v;
        }
        revealStableRafId = window.requestAnimationFrame(tick);
      };
      revealStableRafId = window.requestAnimationFrame(tick);
    } else {
      foundationsTile.classList.add(REVEAL_CLASSES.typefitReady);
    }
    revealTimeoutId = window.setTimeout(() => {
      revealTimeoutId = 0;
      runRevealCloseSequence();
    }, revealTimeoutMs());
  };

  foundationsTile.addEventListener('click', (event) => {
    if (isFadingOut() || isOpening()) {
      event.preventDefault();
      return;
    }
    if (isRevealed()) {
      clearRevealTimers();
      event.preventDefault();
      window.location.assign(foundationsTile.href);
      return;
    }
    event.preventDefault();
    openReveal();
  });

  // Mobile browsers can restore /profile from BFCache after visiting /foundations.
  // In that case, old reveal classes/timers may stay stale; always restore state1.
  window.addEventListener('pageshow', () => {
    resetRevealToState1();
  });
}
