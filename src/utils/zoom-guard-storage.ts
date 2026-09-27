/**
 * SessionStorage JSON for zoom-guard-init.ts — parsed shape only, no DOM.
 */
import { snapshotLooksValid, type ZoomViewportSnapshot } from './zoom-signals';

export const ZOOM_FREEZE_BASELINE_STORAGE_KEY = 'zoomFreezeBaselineV3';
export const ZOOM_FREEZE_GUARD_STATE_STORAGE_KEY = 'zoomFreezeGuardStateV2';

export type ZoomFreezeBaselineV3 = ZoomViewportSnapshot;

export function hasValidZoomFreezeBaseline(
  baseline: ZoomFreezeBaselineV3 | null | undefined,
): baseline is ZoomFreezeBaselineV3 {
  return !!baseline && snapshotLooksValid(baseline);
}

export function parseZoomFreezeBaselineJson(
  raw: string | null,
): ZoomFreezeBaselineV3 | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ZoomFreezeBaselineV3>;
    const dpr = parsed.dpr;
    const vvScale = parsed.vvScale;
    const innerWidth = parsed.innerWidth;
    const outerWidth =
      Number.isFinite(parsed.outerWidth) && (parsed.outerWidth as number) >= 0
        ? (parsed.outerWidth as number)
        : 0;
    const snapshot: ZoomFreezeBaselineV3 = {
      dpr: dpr as number,
      vvScale: vvScale as number,
      innerWidth: innerWidth as number,
      outerWidth,
    };
    if (!hasValidZoomFreezeBaseline(snapshot)) return null;
    return snapshot;
  } catch {
    return null;
  }
}

export type ZoomGuardStatePayload = {
  active?: boolean;
  freezeScale?: number;
};

/** Mirrors zoom-guard-init guard JSON parsing (partial fields allowed). */
export function parseZoomGuardStateJson(
  raw: string | null,
): ZoomGuardStatePayload | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const p = parsed as { active?: unknown; freezeScale?: unknown };
  const out: ZoomGuardStatePayload = {};
  if (typeof p.active === 'boolean') out.active = p.active;
  if (Number.isFinite(p.freezeScale as number)) {
    out.freezeScale = p.freezeScale as number;
  }
  return out;
}
