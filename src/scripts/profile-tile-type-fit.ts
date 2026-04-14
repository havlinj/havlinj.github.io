/**
 * Profile grid typography:
 * - Shared tile label size from the longest of Why / What I do / Foundations → --profile-tile-label-font-size.
 * - Foundations reveal → --profile-reveal-font-size (often derived from tile size).
 * - Portrait column geometry → --profile-right-height-px, --profile-portrait-side-px.
 * Dispatches `profileTileTypeFit` when ready so Layout can drop the loading veil (reveal uses a fixed rem fallback in CSS if JS is off — no clamp).
 */

import {
  baseWidthFromEffectiveScale,
  fitFontSize,
  normalizePositiveScale,
  roundPx,
} from '../utils/profile-fit-math';
import {
  REVEAL_RIGHT_MARGIN_FIT_EPSILON_PX,
  REVEAL_RIGHT_MARGIN_RATIO_MIN,
  REVEAL_RIGHT_RENDER_PAD_PX,
} from '../utils/profile-reveal-constants';

const LABEL_VAR = '--profile-tile-label-font-size';
const REVEAL_VAR = '--profile-reveal-font-size';
const PROFILE_RIGHT_HEIGHT_VAR = '--profile-right-height-px';
const PROFILE_PORTRAIT_SIDE_VAR = '--profile-portrait-side-px';

const DEFAULT_REVEAL_TIMEOUT_MS = 7000;
const REVEAL_FADE_MS = 180;
const REVEAL_PAUSE_MS = 50;
/** Conservative padding vs `clientWidth` / `clientHeight` (overflow-based fit). */
const REVEAL_OVERFLOW_H_PAD_PX = 10;
const REVEAL_OVERFLOW_V_PAD_PX = 4;
/**
 * Last-glyph slack vs the stanza’s right padding edge. `scrollWidth` can match `clientWidth`
 * on some WebKit builds even when `overflow:visible` ink still clips under `overflow:hidden`
 * ancestors — so we also measure the `?` box directly.
 */
const REVEAL_INK_H_PAD_PX = 4;

/** Layout.astro listens (once) before fading `.profile-section--loading` away. */
const TYPE_FIT_EVENT = 'profileTileTypeFit';
const SELECTORS = {
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
  profileRightColumn: '.profile-right-column',
  profilePhotoShell: '.profile-photo-shell',
} as const;
const REVEAL_CLASSES = {
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
const REVEAL_COPY_FALLBACK_MS = 3200;
/** Consecutive frames with identical stanza box + font var after fit (post-CSS-transition). */
const REVEAL_LAYOUT_STABLE_FRAMES = 3;

const FOUNDATIONS_REVEAL_UNIFORM_SCALE_VAR =
  '--foundations-reveal-uniform-scale';

/** While Foundations is revealed, keep font size from first fit and only shrink via uniform scale. */
const foundationsRevealFontLock = new WeakMap<HTMLElement, number>();

function clearFoundationsRevealFontLock(tile: HTMLElement | null): void {
  if (tile) foundationsRevealFontLock.delete(tile);
}

function setRevealCopyUniformScale(
  inner: HTMLElement | null,
  scale: number,
): void {
  if (!inner) return;
  inner.style.setProperty(FOUNDATIONS_REVEAL_UNIFORM_SCALE_VAR, String(scale));
}

function applyRevealCopyUniformScale(
  stanza: HTMLElement,
  inner: HTMLElement | null,
): void {
  if (!inner) return;
  setRevealCopyUniformScale(inner, 1);
  void stanza.offsetHeight;
  const iw = inner.offsetWidth;
  const ih = inner.offsetHeight;
  if (iw < 2 || ih < 2) return;
  const pad = 6;
  const sw = Math.max(stanza.clientWidth - pad, 1);
  const sh = Math.max(stanza.clientHeight - pad, 1);
  const s = Math.min(1, sw / iw, sh / ih);
  setRevealCopyUniformScale(inner, s);
}

function queryElement<T extends Element>(
  root: ParentNode,
  selector: string,
  ctor: { new (): T },
): T | null {
  const el = root.querySelector(selector);
  return el instanceof ctor ? el : null;
}

function rootRemPx(): number {
  return parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
}

/** Lower bound for reveal type fit; also used as immediate inline size so CSS clamp is never the first paint. */
function minRevealFontPx(): number {
  return Math.max(2, rootRemPx() * 0.32);
}

function setPxCustomProperty(
  el: HTMLElement,
  propertyName: string,
  valuePx: number,
): void {
  el.style.setProperty(propertyName, `${roundPx(valuePx)}px`);
}

function titleCapFontPx(): number {
  const h1 = document.querySelector(SELECTORS.pageTitle);
  if (!(h1 instanceof HTMLElement)) return Math.min(40, rootRemPx() * 2.5);
  return parseFloat(getComputedStyle(h1).fontSize) || 40;
}

function measureLineWidth(
  line: string,
  fontSizePx: number,
  style: CSSStyleDeclaration,
): number {
  const s = document.createElement('span');
  s.setAttribute('aria-hidden', 'true');
  s.style.cssText =
    'position:absolute;left:-9999px;top:0;white-space:nowrap;visibility:hidden;pointer-events:none;contain:content';
  s.style.fontFamily = style.fontFamily;
  s.style.fontWeight = style.fontWeight;
  s.style.fontStyle = style.fontStyle;
  s.style.letterSpacing = style.letterSpacing;
  s.style.textTransform = style.textTransform;
  s.style.lineHeight = style.lineHeight;
  s.style.fontSize = `${fontSizePx}px`;
  s.textContent = line;
  document.body.appendChild(s);
  const w = s.offsetWidth;
  s.remove();
  return w;
}

function maxLineWidth(
  lines: string[],
  fontSizePx: number,
  style: CSSStyleDeclaration,
): number {
  let m = 0;
  for (const line of lines) {
    m = Math.max(m, measureLineWidth(line, fontSizePx, style));
  }
  return m;
}

function contentWidthWithoutHorizontalPadding(el: HTMLElement): number {
  const cs = getComputedStyle(el);
  const padL = parseFloat(cs.paddingLeft) || 0;
  const padR = parseFloat(cs.paddingRight) || 0;
  return el.clientWidth - padL - padR;
}

function fitTileLabels(section: HTMLElement): void {
  const foundations = queryElement(
    section,
    SELECTORS.foundationsTile,
    HTMLAnchorElement,
  );
  const whatIDo = queryElement(
    section,
    SELECTORS.whatIDoTile,
    HTMLAnchorElement,
  );
  const why = queryElement(section, SELECTORS.whyTile, HTMLAnchorElement);
  const measureTile = foundations ?? whatIDo ?? why;
  if (!measureTile) return;

  const inner = queryElement(
    measureTile,
    SELECTORS.pageButtonInner,
    HTMLElement,
  );
  const textEl = queryElement(
    measureTile,
    SELECTORS.pageButtonText,
    HTMLElement,
  );
  if (!inner || !textEl) return;

  const rem = rootRemPx();
  const minPx = rem * 0.7;
  const available = contentWidthWithoutHorizontalPadding(inner);
  // Use full inner width as max — tiles should use the column, not cap to page-title optical size.
  const maxPx = Math.max(minPx, available);
  const tcs = getComputedStyle(textEl);
  const lines = Array.from(
    section.querySelectorAll<HTMLElement>(
      `${SELECTORS.whyTile} ${SELECTORS.pageButtonText}, ${SELECTORS.whatIDoTile} ${SELECTORS.pageButtonText}, ${SELECTORS.foundationsTile} ${SELECTORS.pageButtonText}`,
    ),
  )
    .map((el) => el.textContent?.trim() ?? '')
    .filter((text) => text.length > 0);
  if (lines.length === 0) return;
  const fontPx = fitFontSize(available, minPx, maxPx, (fp) =>
    maxLineWidth(lines, fp, tcs),
  );
  section.style.setProperty(LABEL_VAR, `${roundPx(fontPx)}px`);
}

function fitFoundationsReveal(reveal: HTMLElement): void {
  const minPx = minRevealFontPx();
  let preferredPx = titleCapFontPx();

  const section = queryElement(document, SELECTORS.profileSection, HTMLElement);
  if (section) {
    const baseRaw = getComputedStyle(section)
      .getPropertyValue(LABEL_VAR)
      .trim();
    const basePx = Number.parseFloat(baseRaw);
    if (Number.isFinite(basePx) && basePx > 0) {
      // Keep existing desktop look as preference; actual cap is always real box size.
      preferredPx = Math.min(preferredPx, basePx * 0.85);
    }
  }

  const stanza = queryElement(
    reveal,
    SELECTORS.foundationsRevealStateSecondary,
    HTMLElement,
  );
  if (!stanza) return;

  // Grid animation can report 0× box for a frame; skip to avoid visible font flash.
  if (stanza.clientWidth < 4 || stanza.clientHeight < 4) return;

  const tile =
    (reveal.closest(SELECTORS.foundationsTile) as HTMLElement | null) ??
    queryElement(document, SELECTORS.foundationsTile, HTMLElement);
  const copyInner = queryElement(
    stanza,
    SELECTORS.foundationsRevealCopyInner,
    HTMLElement,
  );
  const isRevealed = Boolean(tile?.classList.contains(REVEAL_CLASSES.revealed));

  if (!isRevealed) {
    clearFoundationsRevealFontLock(tile);
    setRevealCopyUniformScale(copyInner, 1);
  }

  // Hard cap by current rendered box: never allow a font larger than the box can physically host.
  const boxCapPx = Math.max(
    minPx,
    Math.min(stanza.clientWidth, stanza.clientHeight),
  );
  const maxPx = Math.max(minPx, Math.min(boxCapPx, preferredPx));

  if (isRevealed && copyInner && tile && foundationsRevealFontLock.has(tile)) {
    setPxCustomProperty(
      reveal,
      REVEAL_VAR,
      foundationsRevealFontLock.get(tile)!,
    );
    applyRevealCopyUniformScale(stanza, copyInner);
    return;
  }

  const fits = (fontSizePx: number): boolean => {
    reveal.style.setProperty(REVEAL_VAR, `${roundPx(fontSizePx)}px`);
    setRevealCopyUniformScale(copyInner, 1);
    void stanza.offsetHeight;

    const line1 = queryElement(
      reveal,
      SELECTORS.foundationsRevealLine1,
      HTMLElement,
    );
    const line2 = queryElement(
      reveal,
      SELECTORS.foundationsRevealLine2,
      HTMLElement,
    );

    const wBudget = Math.max(0, stanza.clientWidth - REVEAL_OVERFLOW_H_PAD_PX);
    const hBudget = Math.max(0, stanza.clientHeight - REVEAL_OVERFLOW_V_PAD_PX);

    const l1w = line1?.scrollWidth ?? 0;
    const l2w = line2?.scrollWidth ?? 0;
    const linesFitW = l1w <= wBudget && l2w <= wBudget;

    const stanzaFitsW =
      stanza.scrollWidth <= stanza.clientWidth + REVEAL_OVERFLOW_H_PAD_PX;
    const stanzaFitsH = stanza.scrollHeight <= hBudget;

    if (!line1) return linesFitW && stanzaFitsW && stanzaFitsH;

    const stanzaRect = stanza.getBoundingClientRect();
    const questionInkFits = (() => {
      const mark = line1.querySelector('.question-mark');
      if (!(mark instanceof HTMLElement)) return true;
      const mr = mark.getBoundingClientRect();
      const mcs = getComputedStyle(mark);
      const marginR = Number.parseFloat(mcs.marginRight || '0') || 0;
      const inkRight = mr.right + marginR;
      return inkRight <= stanzaRect.right - REVEAL_INK_H_PAD_PX;
    })();

    const lineRect = line1.getBoundingClientRect();
    const revealRect = reveal.getBoundingClientRect();
    const line1Style = getComputedStyle(line1);
    const lineMarginLeft = Number.parseFloat(line1Style.marginLeft || '0') || 0;
    const lineMarginRight =
      Number.parseFloat(line1Style.marginRight || '0') || 0;
    const lineLeftPx = lineRect.left - lineMarginLeft;
    const lineRightPx = lineRect.right + lineMarginRight;
    const leftMarginPx = Math.max(0, lineLeftPx - revealRect.left);
    const rightMarginPx = Math.max(0, revealRect.right - lineRightPx);
    const rightMarginFits =
      rightMarginPx + REVEAL_RIGHT_MARGIN_FIT_EPSILON_PX >=
      leftMarginPx * REVEAL_RIGHT_MARGIN_RATIO_MIN + REVEAL_RIGHT_RENDER_PAD_PX;

    return (
      linesFitW &&
      stanzaFitsW &&
      stanzaFitsH &&
      questionInkFits &&
      rightMarginFits
    );
  };

  if (!fits(minPx)) {
    setPxCustomProperty(reveal, REVEAL_VAR, minPx);
    if (isRevealed && tile) foundationsRevealFontLock.set(tile, minPx);
    applyRevealCopyUniformScale(stanza, copyInner);
    return;
  }
  if (fits(maxPx)) {
    setPxCustomProperty(reveal, REVEAL_VAR, maxPx);
    if (isRevealed && tile) foundationsRevealFontLock.set(tile, maxPx);
    applyRevealCopyUniformScale(stanza, copyInner);
    return;
  }

  let lo = minPx;
  let hi = maxPx;
  for (let i = 0; i < 26; i++) {
    const mid = (lo + hi) / 2;
    if (fits(mid)) lo = mid;
    else hi = mid;
  }
  const fontPx = lo;
  setPxCustomProperty(reveal, REVEAL_VAR, fontPx);
  if (isRevealed && tile) foundationsRevealFontLock.set(tile, fontPx);
  applyRevealCopyUniformScale(stanza, copyInner);
}

function fitAll(): void {
  const section = queryElement(document, SELECTORS.profileSection, HTMLElement);
  if (section) fitTileLabels(section);
  const reveal = queryElement(
    document,
    SELECTORS.foundationsReveal,
    HTMLElement,
  );
  if (reveal) fitFoundationsReveal(reveal);
  measurePortraitGeometryPx();
}

function measurePortraitGeometryPx(): void {
  const rightColumn = queryElement(
    document,
    SELECTORS.profileRightColumn,
    HTMLElement,
  );
  if (!rightColumn) return;

  // A = height of the right column (big square / whole right region)
  const rcHeight = rightColumn.getBoundingClientRect().height;
  if (!Number.isFinite(rcHeight) || rcHeight < 4) return;

  const shell = queryElement(
    rightColumn,
    SELECTORS.profilePhotoShell,
    HTMLElement,
  );
  if (!shell) return;

  // Portrait width is the "c" we need for h_max = A - c.
  // Keep this as BASE width (before visual scale in state2), otherwise c gets scaled twice.
  const cs = getComputedStyle(rightColumn);
  const rawScale = cs.getPropertyValue('--portrait-effective-scale').trim();
  const effectiveScale = normalizePositiveScale(rawScale);
  const w = baseWidthFromEffectiveScale(
    shell.getBoundingClientRect().width,
    effectiveScale,
  );
  if (!Number.isFinite(w) || w < 4) return; // keep waiting for layout

  setPxCustomProperty(rightColumn, PROFILE_RIGHT_HEIGHT_VAR, rcHeight);
  setPxCustomProperty(rightColumn, PROFILE_PORTRAIT_SIDE_VAR, w);
}

function wireFoundationsReveal(): void {
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
      setPxCustomProperty(reveal, REVEAL_VAR, minRevealFontPx());

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
       * Tile height and portrait scale animate (~--profile-motion-duration). Early rAF fits
       * target a mid-transition box; ResizeObserver then refits → visible “smear”. Wait until
       * stanza size and reveal font var match for several frames after each fit.
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

function wireResize(): void {
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
function wireFoundationsRevealResize(): void {
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
