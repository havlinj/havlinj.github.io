/**
 * Profile grid:
 * - Default tile labels: one fit from the string "PROFESSIONAL" and the
 *   /professional tile inner width; --profile-tile-label-font-size on
 *   .profile-section (all tiles inherit).
 * - Foundations reveal: separate --profile-reveal-font-size on the reveal box.
 * CSS provides clamp fallbacks when JS is off.
 * Dispatches `profileTileTypeFit` when done so Layout can show the grid (no FOUC).
 */

const LABEL_VAR = '--profile-tile-label-font-size';
const REVEAL_VAR = '--profile-reveal-font-size';

/** Longest default label; measurement uses this string, not other tiles’ copy. */
const TILE_LABEL_REFERENCE = 'PROFESSIONAL';

const REVEAL_TIMEOUT_MS = 7000;
const REVEAL_FADE_MS = 180;
const REVEAL_PAUSE_MS = 50;

/** Layout.astro waits for this before fading the profile grid in (avoids font-size FOUC). */
const TYPE_FIT_EVENT = 'profileTileTypeFit';

function rootRemPx(): number {
  return parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
}

function titleCapFontPx(): number {
  const h1 = document.querySelector('article h1.page-title');
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

function fitTileLabels(): void {
  const section = document.querySelector('.profile-section');
  if (!(section instanceof HTMLElement)) return;

  const professional = section.querySelector(
    'a.profile-tile-button[href="/professional"]',
  );
  if (!(professional instanceof HTMLAnchorElement)) return;

  const inner = professional.querySelector('.page-button__inner');
  const textEl = professional.querySelector('.page-button__text');
  if (!(inner instanceof HTMLElement) || !(textEl instanceof HTMLElement)) return;

  const rem = rootRemPx();
  const minPx = rem * 0.7;
  const maxPx = titleCapFontPx();
  const ics = getComputedStyle(inner);
  const padL = parseFloat(ics.paddingLeft) || 0;
  const padR = parseFloat(ics.paddingRight) || 0;
  const available = inner.clientWidth - padL - padR;
  const tcs = getComputedStyle(textEl);
  const lines = [TILE_LABEL_REFERENCE];
  const fontPx = fitFontSize(available, minPx, maxPx, (fp) =>
    maxLineWidth(lines, fp, tcs),
  );
  section.style.setProperty(LABEL_VAR, `${roundPx(fontPx)}px`);
}

function fitFoundationsReveal(): void {
  const reveal = document.querySelector('.profile-tile-button__reveal');
  if (!(reveal instanceof HTMLElement)) return;
  const rem = rootRemPx();
  const minPx = rem * 0.65;
  const maxPx = titleCapFontPx();
  const rcs = getComputedStyle(reveal);
  const padL = parseFloat(rcs.paddingLeft) || 0;
  const padR = parseFloat(rcs.paddingRight) || 0;
  const available = reveal.clientWidth - padL - padR;
  const lines: string[] = [];
  reveal.querySelectorAll('.profile-tile-button__reveal-stanza').forEach((st) => {
    lines.push(...stanzaLines(st));
  });
  if (lines.length === 0) return;
  const fontPx = fitFontSize(available, minPx, maxPx, (fp) =>
    maxLineWidth(lines, fp, rcs),
  );
  reveal.style.setProperty(REVEAL_VAR, `${roundPx(fontPx)}px`);
}

function fitAll(): void {
  fitTileLabels();
  fitFoundationsReveal();
}

function wireFoundationsReveal(): void {
  const foundationsTile = document.querySelector(
    '.profile-tile-button--foundations',
  );
  if (!(foundationsTile instanceof HTMLAnchorElement)) return;

  let revealTimeoutId = 0;
  let revealCloseStepId = 0;

  const clearRevealTimers = () => {
    window.clearTimeout(revealTimeoutId);
    window.clearTimeout(revealCloseStepId);
    revealTimeoutId = 0;
    revealCloseStepId = 0;
  };

  const finishRevealClose = () => {
    foundationsTile.classList.remove('is-revealed', 'is-reveal-fading-out');
    foundationsTile.classList.add('is-reveal-opening');
    void foundationsTile.offsetWidth;
    foundationsTile.classList.remove('is-reveal-opening');
  };

  const runRevealCloseSequence = () => {
    foundationsTile.classList.add('is-reveal-fading-out');
    revealCloseStepId = window.setTimeout(() => {
      finishRevealClose();
      revealCloseStepId = 0;
    }, REVEAL_FADE_MS + REVEAL_PAUSE_MS);
  };

  foundationsTile.addEventListener('click', (event) => {
    if (foundationsTile.classList.contains('is-reveal-fading-out')) {
      event.preventDefault();
      return;
    }
    if (foundationsTile.classList.contains('is-reveal-opening')) {
      event.preventDefault();
      return;
    }
    if (foundationsTile.classList.contains('is-revealed')) {
      clearRevealTimers();
      return;
    }
    event.preventDefault();
    foundationsTile.classList.remove(
      'is-reveal-fading-out',
      'is-reveal-opening',
    );
    foundationsTile.classList.add('is-revealed');
    clearRevealTimers();
    revealTimeoutId = window.setTimeout(() => {
      revealTimeoutId = 0;
      runRevealCloseSequence();
    }, REVEAL_TIMEOUT_MS);
  });
}

function wireResize(): void {
  const section = document.querySelector('.profile-section');
  if (!(section instanceof HTMLElement)) return;
  const ro = new ResizeObserver(() => {
    requestAnimationFrame(() => fitAll());
  });
  ro.observe(section);
  window.addEventListener('orientationchange', () => {
    requestAnimationFrame(() => fitAll());
  });
}

/** Reveal box mění šířku při hover insetu (2. stav) — sekce se neroztáhne, takže vlastní RO. */
function wireFoundationsRevealResize(): void {
  const reveal = document.querySelector(
    '.profile-tile-button--foundations .profile-tile-button__reveal',
  );
  if (!(reveal instanceof HTMLElement)) return;
  let rafId = 0;
  const ro = new ResizeObserver(() => {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      rafId = 0;
      fitFoundationsReveal();
    });
  });
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
