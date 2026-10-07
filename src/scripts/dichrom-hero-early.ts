import { readDichromDeviceScale } from '../utils/read-dichrom-device-scale';
import {
  neededDichromBitmapWidth,
  parseDichromCandidates,
  selectDichromCandidate,
  type DichromCandidate,
} from '../utils/dichrom-tier-select';

const HERO_IMG_SELECTOR = 'img.hero-bg__image';
const CHOSEN_WIDTH_ATTR = 'data-dichrom-bitmap-width';
const CANDIDATES_ATTR = 'data-dichrom-candidates';
const FALLBACK_ATTR = 'data-dichrom-fallback';

export function assignDichromHeroSrc(): void {
  const img = document.querySelector(HERO_IMG_SELECTOR);
  if (!(img instanceof HTMLImageElement)) return;

  const chosen = chooseHeroCandidate(img);
  const href =
    chosen?.href ?? img.getAttribute('src') ?? img.getAttribute(FALLBACK_ATTR);
  if (!href) return;
  if (chosen) img.setAttribute(CHOSEN_WIDTH_ATTR, String(chosen.w));
  if (mediaPath(img.getAttribute('src') || '') !== mediaPath(href)) {
    img.src = href;
  }
}

function mediaPath(url: string): string {
  try {
    return new URL(url, window.location.href).pathname;
  } catch {
    return url;
  }
}

function chooseHeroCandidate(img: HTMLImageElement): DichromCandidate | null {
  const raw = img.getAttribute(CANDIDATES_ATTR);
  if (!raw) return null;
  const candidates = parseDichromCandidates(raw);
  if (candidates.length === 0) return null;

  const box = img.getBoundingClientRect();
  if (!(box.width > 0) || !(box.height > 0)) return null;

  const devicePx = neededDichromBitmapWidth({
    boxWidthCss: box.width,
    boxHeightCss: box.height,
    aspectWOverH: attributeAspect(img),
    objectFit: getComputedStyle(img).objectFit,
    deviceScale: readDichromDeviceScale(window),
  });
  if (!(devicePx > 0)) return null;
  return selectDichromCandidate(candidates, devicePx);
}

function attributeAspect(img: HTMLImageElement): number {
  const attrWidth = Number(img.getAttribute('width'));
  const attrHeight = Number(img.getAttribute('height'));
  if (attrWidth > 0 && attrHeight > 0) return attrWidth / attrHeight;
  return 0;
}
