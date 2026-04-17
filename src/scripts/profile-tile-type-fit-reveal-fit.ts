import { roundPx } from '../utils/profile-fit-math';
import {
  REVEAL_RIGHT_MARGIN_FIT_EPSILON_PX,
  REVEAL_RIGHT_MARGIN_RATIO_MIN,
  REVEAL_RIGHT_RENDER_PAD_PX,
} from '../utils/profile-reveal-constants';
import {
  minRevealFontPx,
  queryElement,
  setPxCustomProperty,
  titleCapFontPx,
} from './profile-fit-dom';
import {
  FOUNDATIONS_REVEAL_UNIFORM_SCALE_VAR,
  LABEL_VAR,
  REVEAL_CLASSES,
  REVEAL_INK_H_PAD_PX,
  REVEAL_OVERFLOW_H_PAD_PX,
  REVEAL_OVERFLOW_V_PAD_PX,
  REVEAL_VAR,
  SELECTORS,
} from './profile-tile-type-fit-constants';

/** While Foundations is revealed, keep font size from first fit and only shrink via uniform scale. */
const foundationsRevealFontLock = new WeakMap<HTMLElement, number>();

export function clearFoundationsRevealFontLock(tile: HTMLElement | null): void {
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

export function fitFoundationsReveal(reveal: HTMLElement): void {
  const minPx = minRevealFontPx();
  let preferredPx = titleCapFontPx(SELECTORS.pageTitle);

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
