/**
 * Profile grid typography:
 * - Shared tile label size from the longest of Why / What I do / Foundations → --profile-tile-label-font-size.
 * - Foundations reveal → --profile-reveal-font-size (often derived from tile size).
 * - Portrait column geometry → --profile-right-height-px, --profile-portrait-side-px.
 * Dispatches `profileTileTypeFit` when ready so Layout can drop the loading veil (with CSS clamp fallbacks if JS is off).
 */

const LABEL_VAR = '--profile-tile-label-font-size';
const REVEAL_VAR = '--profile-reveal-font-size';
const PROFILE_RIGHT_HEIGHT_VAR = '--profile-right-height-px';
const PROFILE_PORTRAIT_SIDE_VAR = '--profile-portrait-side-px';

const DEFAULT_REVEAL_TIMEOUT_MS = 7000;
const REVEAL_FADE_MS = 180;
const REVEAL_PAUSE_MS = 50;

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
  foundationsRevealStanza:
    '.tile-state-secondary .line-1, .tile-state-secondary .line-2',
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
  ctor: { new (): T },
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

/** Callback: measured width at a trial font size (px). */
// eslint-disable-next-line no-unused-vars
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
  const rem = rootRemPx();
  // Allow deeper downscale under aggressive browser zoom to avoid right-edge clipping.
  const minPx = Math.max(2, rem * 0.32);
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

  const stanza = queryElement(reveal, '.tile-state-secondary', HTMLElement);
  if (!stanza) return;

  // Grid animation can report 0× box for a frame; skip to avoid visible font flash.
  if (stanza.clientWidth < 4 || stanza.clientHeight < 4) return;

  // Hard cap by current rendered box: never allow a font larger than the box can physically host.
  const boxCapPx = Math.max(
    minPx,
    Math.min(stanza.clientWidth, stanza.clientHeight),
  );
  const maxPx = Math.max(minPx, Math.min(boxCapPx, preferredPx));

  const fits = (fontSizePx: number): boolean => {
    reveal.style.setProperty(REVEAL_VAR, `${roundPx(fontSizePx)}px`);
    // Real rendered fit check (both axes) using measured line geometry.
    const hSafetyPx = 2;
    const vSafetyPx = 1;
    const line1 = queryElement(
      reveal,
      '.tile-state-secondary .line-1',
      HTMLElement,
    );
    const maxH = Math.max(0, stanza.clientHeight - vSafetyPx);
    const boxFitsH = stanza.scrollHeight <= maxH;

    if (!line1) return boxFitsH;
    const lineRect = line1.getBoundingClientRect();
    const stanzaRect = stanza.getBoundingClientRect();
    // Tail buffer is part of .line-1 width via .question-mark::after, so this check is deterministic.
    const lineFits = lineRect.width <= stanzaRect.width - hSafetyPx;
    return boxFitsH && lineFits;
  };

  if (!fits(minPx)) {
    reveal.style.setProperty(REVEAL_VAR, `${roundPx(minPx)}px`);
    return;
  }
  if (fits(maxPx)) {
    reveal.style.setProperty(REVEAL_VAR, `${roundPx(maxPx)}px`);
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
    const reveal = queryElement(
      foundationsTile,
      SELECTORS.foundationsReveal,
      HTMLElement,
    );
    foundationsTile.classList.remove(
      REVEAL_CLASSES.fadingOut,
      REVEAL_CLASSES.opening,
    );
    foundationsTile.classList.add(REVEAL_CLASSES.revealed);
    if (reveal) {
      requestAnimationFrame(() => {
        fitFoundationsReveal(reveal);
        requestAnimationFrame(() => fitFoundationsReveal(reveal));
      });
    }
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
