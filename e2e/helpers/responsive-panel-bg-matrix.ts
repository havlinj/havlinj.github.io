import { expect, type Locator, type Page } from '@playwright/test';
import { ZOOM_FREEZE_BASELINE_STORAGE_KEY } from '../../src/utils/zoom-guard-storage';
import {
  computeDprPageZoom,
  computeWindowChromePageZoom,
  type ZoomViewportSnapshot,
} from '../../src/utils/zoom-signals';
import {
  dichromDeviceScale,
  neededDichromBitmapWidth,
  parseDichromCandidates,
  selectDichromCandidate,
} from '../../src/utils/dichrom-tier-select';

type PaintedDichrom = {
  boxWidthCss: number;
  boxHeightCss: number;
  aspectWOverH: number;
  objectFit: string;
  currentSrc: string;
  candidates: string;
  chosenWidth: number;
  snapshot: ZoomViewportSnapshot;
  baseline: ZoomViewportSnapshot | null;
};

async function readPaintedDichrom(locator: Locator): Promise<PaintedDichrom> {
  return locator.evaluate((el, storageKey) => {
    const img = el as HTMLImageElement;
    const box = img.getBoundingClientRect();
    const attrWidth = Number(img.getAttribute('width'));
    const attrHeight = Number(img.getAttribute('height'));
    const aspect =
      img.naturalWidth > 0 && img.naturalHeight > 0
        ? img.naturalWidth / img.naturalHeight
        : attrWidth > 0 && attrHeight > 0
          ? attrWidth / attrHeight
          : 0;
    const vv = window.visualViewport;
    let baseline: {
      dpr: number;
      vvScale: number;
      innerWidth: number;
      outerWidth: number;
    } | null = null;
    try {
      const raw = window.sessionStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          dpr?: number;
          vvScale?: number;
          innerWidth?: number;
          outerWidth?: number;
        };
        if (
          typeof parsed.dpr === 'number' &&
          typeof parsed.vvScale === 'number' &&
          typeof parsed.innerWidth === 'number' &&
          typeof parsed.outerWidth === 'number'
        ) {
          baseline = {
            dpr: parsed.dpr,
            vvScale: parsed.vvScale,
            innerWidth: parsed.innerWidth,
            outerWidth: parsed.outerWidth,
          };
        }
      }
    } catch {
      baseline = null;
    }
    return {
      boxWidthCss: box.width,
      boxHeightCss: box.height,
      aspectWOverH: aspect,
      objectFit: getComputedStyle(img).objectFit,
      currentSrc: img.currentSrc || img.getAttribute('src') || '',
      candidates: img.getAttribute('data-dichrom-candidates') || '',
      chosenWidth: Number(img.getAttribute('data-dichrom-bitmap-width')) || 0,
      snapshot: {
        dpr: window.devicePixelRatio || 1,
        vvScale: vv && vv.scale ? vv.scale : 1,
        innerWidth: window.innerWidth || 0,
        outerWidth: window.outerWidth || 0,
      },
      baseline,
    };
  }, ZOOM_FREEZE_BASELINE_STORAGE_KEY);
}

function expectedHref(painted: PaintedDichrom): string {
  const dprPageZoom = painted.baseline
    ? computeDprPageZoom(painted.baseline, painted.snapshot)
    : 1;
  const cssPageZoom = painted.baseline
    ? computeWindowChromePageZoom(painted.baseline, painted.snapshot)
    : 1;
  const devicePx = neededDichromBitmapWidth({
    boxWidthCss: painted.boxWidthCss,
    boxHeightCss: painted.boxHeightCss,
    aspectWOverH: painted.aspectWOverH,
    objectFit: painted.objectFit,
    deviceScale: dichromDeviceScale({
      devicePixelRatio: painted.snapshot.dpr,
      visualViewportScale: painted.snapshot.vvScale,
      dprPageZoom,
      cssPageZoom,
    }),
  });
  const candidates = parseDichromCandidates(painted.candidates);
  const current = candidates.find(
    (candidate) => candidate.w === painted.chosenWidth,
  );
  const chosen = selectDichromCandidate(candidates, devicePx, current);
  return chosen?.href ?? '';
}

/** The loaded file matches the painted-size tier, not `sizes` × viewport. */
export async function expectDichromTierMatchesPaint(
  page: Page,
  imgSelector: string,
): Promise<void> {
  const locator = page.locator(imgSelector).first();
  await expect(locator).toBeAttached({ timeout: 15_000 });
  await expect
    .poll(
      async () => {
        const painted = await readPaintedDichrom(locator);
        if (!painted.candidates || !(painted.boxWidthCss > 0)) return '';
        const href = expectedHref(painted);
        if (!href) return 'no candidate';
        return painted.currentSrc.includes(href) ? 'ok' : painted.currentSrc;
      },
      { timeout: 15_000 },
    )
    .toBe('ok');
}
