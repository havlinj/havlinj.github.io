/**
 * Profile grid:
 * - Default tile labels: one shared fit from the longest of the three visible
 *   profile tile labels (Why, What I do, Foundations); --profile-tile-label-font-size on
 *   .profile-section (all tiles inherit).
 * - Foundations reveal: separate --profile-reveal-font-size on the reveal box.
 * CSS provides clamp fallbacks when JS is off.
 * Dispatches `profileTileTypeFit` when done so Layout can show the grid (no FOUC).
 */

const LABEL_VAR = '--profile-tile-label-font-size';
const REVEAL_VAR = '--profile-reveal-font-size';
const PROFILE_RIGHT_HEIGHT_VAR = '--profile-right-height-px';
const PROFILE_PORTRAIT_SIDE_VAR = '--profile-portrait-side-px';

const DEFAULT_REVEAL_TIMEOUT_MS = 7000;
const REVEAL_FADE_MS = 180;
const REVEAL_PAUSE_MS = 50;

/** Layout.astro waits for this before fading the profile grid in (avoids font-size FOUC). */
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
  foundationsRevealInTile:
    '.prof-tile--foundations .prof-tile__reveal',
  foundationsRevealStanza: '.prof-tile__stanza',
  profileRightColumn: '.profile-right-column',
  profilePhotoShell: '.profile-photo-shell',
} as const;
const REVEAL_CLASSES = {
  revealed: 'is-revealed',
  fadingOut: 'is-reveal-fading-out',
  opening: 'is-reveal-opening',
} as const;

function queryElement<T extends Element>(
  root: ParentNode,
  selector: string,
  // eslint-disable-next-line no-unused-vars -- type-level constructor signature only
  ctor: { new (...args: never[]): T },
): T | null {
  const el = root.querySelector(selector);
  return el instanceof ctor ? el : null;
}

function rootRemPx(): number {
  return parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
}

function titleCapFontPx(): number {
  const h1 = document.querySelector(SELECTORS.pageTitle);
  if (!(h1 instanceof HTMLElement)) return Math.min(40, rootRemPx() * 2.5);
  return parseFloat(getComputedStyle(h1).fontSize) || 40;
}

function stanzaLines(stanza: Element): string[] {
  const lines: string[] = [];
  let acc = '';
  for (const node of stanza.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      acc += node.textContent ?? '';
    } else if (node instanceof HTMLBRElement) {
      const t = acc.trim();
      if (t) lines.push(t);
      acc = '';
    }
  }
  const tail = acc.trim();
  if (tail) lines.push(tail);
  return lines;
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

/** Measures max line width at the given font size (px). */
// eslint-disable-next-line no-unused-vars -- parameter names a type-only callback contract
type FontMeasure = (fontSizePx: number) => number;

function fitFontSize(
  available: number,
  minPx: number,
  maxPx: number,
  measure: FontMeasure,
): number {
  if (available <= 1) return minPx;
  const cap = available * 0.996;
  if (measure(maxPx) <= cap) return maxPx;
  if (measure(minPx) > cap) return minPx;
  let lo = minPx;
  let hi = maxPx;
  for (let i = 0; i < 26; i++) {
    const mid = (lo + hi) / 2;
    if (measure(mid) <= cap) lo = mid;
    else hi = mid;
  }
  return lo;
}

function roundPx(n: number): number {
  return Math.round(n * 100) / 100;
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
  /*
   * For tile labels we want true max-width utilization.
   * Do not cap by page-title size; use the tile content width as the practical upper bound.
   */
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

function collectRevealLines(reveal: HTMLElement): string[] {
  const lines: string[] = [];
  reveal
    .querySelectorAll(SELECTORS.foundationsRevealStanza)
    .forEach((stanza) => {
      lines.push(...stanzaLines(stanza));
    });
  return lines;
}

function fitFoundationsReveal(reveal: HTMLElement): void {
  const section = queryElement(document, SELECTORS.profileSection, HTMLElement);
  if (section) {
    const baseRaw = getComputedStyle(section)
      .getPropertyValue(LABEL_VAR)
      .trim();
    const basePx = Number.parseFloat(baseRaw);
    if (Number.isFinite(basePx) && basePx > 0) {
      reveal.style.setProperty(REVEAL_VAR, `${roundPx(basePx * 0.85)}px`);
      return;
    }
  }

  const rem = rootRemPx();
  const minPx = rem * 0.65;
  const maxPx = titleCapFontPx();
  const rcs = getComputedStyle(reveal);
  const available = contentWidthWithoutHorizontalPadding(reveal);
  /* Grid/transition can yield a one-frame width of 0; skip write to avoid a flash */
  if (available < 4) return;
  const lines = collectRevealLines(reveal);
  if (lines.length === 0) return;
  const fontPx = fitFontSize(available, minPx, maxPx, (fp) =>
    maxLineWidth(lines, fp, rcs),
  );
  reveal.style.setProperty(REVEAL_VAR, `${roundPx(fontPx)}px`);
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
  const parsedScale = Number.parseFloat(rawScale);
  const effectiveScale =
    Number.isFinite(parsedScale) && parsedScale > 0 ? parsedScale : 1;
  const w = shell.getBoundingClientRect().width / effectiveScale;
  if (!Number.isFinite(w) || w < 4) return; // keep waiting for layout

  rightColumn.style.setProperty(
    PROFILE_RIGHT_HEIGHT_VAR,
    `${roundPx(rcHeight)}px`,
  );
  rightColumn.style.setProperty(PROFILE_PORTRAIT_SIDE_VAR, `${roundPx(w)}px`);
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
    revealTimeoutId = 0;
    revealCloseStepId = 0;
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
    foundationsTile.classList.remove(
      REVEAL_CLASSES.fadingOut,
      REVEAL_CLASSES.opening,
    );
    foundationsTile.classList.add(REVEAL_CLASSES.revealed);
    clearRevealTimers();
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
}

/** Reveal width changes while column expands/compresses in state2; observe it directly. */
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

  requestAnimationFrame(() => {
    fitAll();
    requestAnimationFrame(() => {
      fitAll();
      signalTypeFitReady();
    });
  });

  wireResize();
  wireFoundationsRevealResize();
  wireFoundationsReveal();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => void start());
} else {
  void start();
}
