import { dichromDeviceScale } from './dichrom-tier-select';
import {
  ZOOM_FREEZE_BASELINE_STORAGE_KEY,
  parseZoomFreezeBaselineJson,
} from './zoom-guard-storage';
import {
  computeDprPageZoom,
  computeWindowChromePageZoom,
  readZoomViewportSnapshot,
} from './zoom-signals';

/** Same scale the tier sync uses. Reads the zoom-freeze baseline; never writes it. */
export function readDichromDeviceScale(win: Window): number {
  const current = readZoomViewportSnapshot(win);
  let dprPageZoom = 1;
  let cssPageZoom = 1;
  try {
    const raw = win.sessionStorage.getItem(ZOOM_FREEZE_BASELINE_STORAGE_KEY);
    const baseline = parseZoomFreezeBaselineJson(raw);
    if (baseline) {
      dprPageZoom = computeDprPageZoom(baseline, current);
      cssPageZoom = computeWindowChromePageZoom(baseline, current);
    }
  } catch {
    dprPageZoom = 1;
    cssPageZoom = 1;
  }
  return dichromDeviceScale({
    devicePixelRatio: current.dpr,
    visualViewportScale: current.vvScale,
    dprPageZoom,
    cssPageZoom,
  });
}
