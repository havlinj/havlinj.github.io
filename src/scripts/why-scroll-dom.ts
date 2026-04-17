export function readRootRemPx(): number {
  return (
    Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
  );
}

export function firstLineRectInElement(el: Element | null): DOMRect | null {
  if (!(el instanceof HTMLElement)) return null;
  try {
    const range = document.createRange();
    range.selectNodeContents(el);
    const rects = range.getClientRects();
    if (rects.length > 0) return rects[0];
  } catch {
    /* ignore Range errors */
  }
  return null;
}

export function lastLineBottomInElement(el: Element | null): number | null {
  if (!(el instanceof HTMLElement)) return null;
  try {
    const range = document.createRange();
    range.selectNodeContents(el);
    const rects = range.getClientRects();
    if (rects.length > 0) return rects[rects.length - 1].bottom;
  } catch {
    /* ignore Range errors */
  }
  return null;
}

export function lineTextStartLeftPx(lineEl: HTMLElement): number {
  try {
    const range = document.createRange();
    range.selectNodeContents(lineEl);
    const rects = range.getClientRects();
    if (rects.length > 0) return rects[0].left;
  } catch {
    /* ignore Range errors and use fallback */
  }
  const rr = lineEl.getBoundingClientRect();
  const cs = getComputedStyle(lineEl);
  const padL = Number.parseFloat(cs.paddingLeft) || 0;
  return rr.left + padL;
}

/**
 * Vertical center of `el` in `.why-scroll` content coordinates (ignores transforms).
 */
export function elementCenterYInScrollContent(
  scrollEl: HTMLElement,
  el: Element | null,
): number {
  if (!(el instanceof Element)) return Number.NaN;
  let top = 0;
  let n: Element | null = el;
  while (n && n !== scrollEl) {
    top += (n as HTMLElement).offsetTop;
    n = (n as HTMLElement).offsetParent as Element | null;
  }
  if (n !== scrollEl) return Number.NaN;
  return Math.round((top + (el as HTMLElement).offsetHeight * 0.5) * 4) / 4;
}
