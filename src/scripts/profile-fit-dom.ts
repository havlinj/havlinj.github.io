import { roundPx } from '../utils/profile-fit-math';

export function queryElement<T extends Element>(
  root: ParentNode,
  selector: string,
  ctor: { new (): T },
): T | null {
  const el = root.querySelector(selector);
  return el instanceof ctor ? el : null;
}

export function rootRemPx(): number {
  return parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
}

/** Lower bound for reveal type fit; also used as immediate inline size before post-fit settle. */
export function minRevealFontPx(): number {
  return Math.max(2, rootRemPx() * 0.32);
}

export function setPxCustomProperty(
  el: HTMLElement,
  propertyName: string,
  valuePx: number,
): void {
  el.style.setProperty(propertyName, `${roundPx(valuePx)}px`);
}

export function titleCapFontPx(pageTitleSelector: string): number {
  const h1 = document.querySelector(pageTitleSelector);
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

export function maxLineWidth(
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

export function contentWidthWithoutHorizontalPadding(el: HTMLElement): number {
  const cs = getComputedStyle(el);
  const padL = parseFloat(cs.paddingLeft) || 0;
  const padR = parseFloat(cs.paddingRight) || 0;
  return el.clientWidth - padL - padR;
}
