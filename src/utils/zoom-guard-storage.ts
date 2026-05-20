/**
 * SessionStorage JSON for zoom-guard-init.ts — parsed shape only, no DOM.
 */

export type ZoomFreezeBaselineV2 = {
  dpr: number;
  vvScale: number;
  innerWidth: number;
};

export function hasValidZoomFreezeBaseline(
  baseline: ZoomFreezeBaselineV2 | null | undefined,
): baseline is ZoomFreezeBaselineV2 {
  return (
    !!baseline &&
    Number.isFinite(baseline.dpr) &&
    baseline.dpr > 0 &&
    Number.isFinite(baseline.vvScale) &&
    baseline.vvScale > 0 &&
    Number.isFinite(baseline.innerWidth) &&
    baseline.innerWidth > 0
  );
}

export function parseZoomFreezeBaselineJson(
  raw: string | null,
): ZoomFreezeBaselineV2 | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ZoomFreezeBaselineV2;
    if (!hasValidZoomFreezeBaseline(parsed)) return null;
    return parsed;
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
