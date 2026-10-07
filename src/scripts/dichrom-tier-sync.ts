import { readDichromDeviceScale } from '../utils/read-dichrom-device-scale';
import {
  neededDichromBitmapWidth,
  parseDichromCandidates,
  selectDichromCandidate,
  type DichromCandidate,
} from '../utils/dichrom-tier-select';

const CANDIDATES_ATTR = 'data-dichrom-candidates';
const CHOSEN_WIDTH_ATTR = 'data-dichrom-bitmap-width';

let listening = false;
let scheduledFrame = 0;
let resolutionQuery: MediaQueryList | null = null;

export function initDichromTierSync(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  ensureListening();
  syncDichromTiers();
}

function ensureListening(): void {
  if (listening) return;
  listening = true;
  window.addEventListener('resize', scheduleDichromTierSync, { passive: true });
  window.visualViewport?.addEventListener('resize', scheduleDichromTierSync, {
    passive: true,
  });
  watchDevicePixelRatio();
  const fonts = document.fonts;
  if (fonts?.ready) {
    void fonts.ready.then(() => scheduleDichromTierSync());
  }
}

function watchDevicePixelRatio(): void {
  resolutionQuery?.removeEventListener('change', onResolutionChange);
  resolutionQuery = window.matchMedia(
    `(resolution: ${window.devicePixelRatio || 1}dppx)`,
  );
  resolutionQuery.addEventListener('change', onResolutionChange);
}

function onResolutionChange(): void {
  watchDevicePixelRatio();
  scheduleDichromTierSync();
}

function scheduleDichromTierSync(): void {
  if (scheduledFrame !== 0) return;
  scheduledFrame = window.requestAnimationFrame(() => {
    scheduledFrame = window.requestAnimationFrame(() => {
      scheduledFrame = 0;
      syncDichromTiers();
    });
  });
}

function syncDichromTiers(): void {
  const images = document.querySelectorAll(`img[${CANDIDATES_ATTR}]`);
  for (const node of images) {
    if (node instanceof HTMLImageElement) syncDichromImage(node);
  }
}

function syncDichromImage(img: HTMLImageElement): void {
  const raw = img.getAttribute(CANDIDATES_ATTR);
  if (!raw) return;
  const candidates = parseDichromCandidates(raw);
  if (candidates.length === 0) return;
  observeImage(img);

  const box = img.getBoundingClientRect();
  const devicePx = neededDichromBitmapWidth({
    boxWidthCss: box.width,
    boxHeightCss: box.height,
    aspectWOverH: imageAspect(img),
    objectFit: getComputedStyle(img).objectFit,
    deviceScale: readDichromDeviceScale(window),
  });
  if (!(devicePx > 0)) return;

  const current = currentCandidate(img, candidates);
  const chosen = selectDichromCandidate(
    candidates,
    devicePx,
    current ?? undefined,
  );
  if (!chosen) return;
  if (current?.href === chosen.href && !pictureSources(img).length) return;
  showCandidate(img, chosen);
}

function imageAspect(img: HTMLImageElement): number {
  if (img.naturalWidth > 0 && img.naturalHeight > 0) {
    return img.naturalWidth / img.naturalHeight;
  }
  const attrWidth = Number(img.getAttribute('width'));
  const attrHeight = Number(img.getAttribute('height'));
  if (attrWidth > 0 && attrHeight > 0) return attrWidth / attrHeight;
  return 0;
}

function currentCandidate(
  img: HTMLImageElement,
  candidates: readonly DichromCandidate[],
): DichromCandidate | null {
  const stored = Number(img.getAttribute(CHOSEN_WIDTH_ATTR));
  if (Number.isFinite(stored) && stored > 0) {
    return candidates.find((candidate) => candidate.w === stored) ?? null;
  }
  return null;
}

function pictureSources(img: HTMLImageElement): HTMLSourceElement[] {
  const picture = img.parentElement;
  if (!(picture instanceof HTMLPictureElement)) return [];
  return [...picture.querySelectorAll('source')];
}

function showCandidate(img: HTMLImageElement, chosen: DichromCandidate): void {
  img.removeAttribute('srcset');
  img.removeAttribute('sizes');
  if (mediaPath(img.getAttribute('src') || '') !== mediaPath(chosen.href)) {
    img.src = chosen.href;
  }
  for (const source of pictureSources(img)) source.remove();
  img.setAttribute(CHOSEN_WIDTH_ATTR, String(chosen.w));
}

function mediaPath(url: string): string {
  try {
    return new URL(url, window.location.href).pathname;
  } catch {
    return url;
  }
}

const observedImages = new WeakSet<HTMLImageElement>();

function observeImage(img: HTMLImageElement): void {
  if (observedImages.has(img)) return;
  observedImages.add(img);
  const observer = new ResizeObserver(() => scheduleDichromTierSync());
  observer.observe(img);
  img.addEventListener('load', scheduleDichromTierSync);
}
