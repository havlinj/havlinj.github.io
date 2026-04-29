export type WritingPoolEntry = readonly [
  url: string,
  opacity: number,
  nudgeX: number,
  nudgeY: number,
];

export const FALLBACK_WRITING_POOL_OPACITY = 0.94;

// TODO(refactor-writing-bg): Single fixed writing background for now.
// Keep this marker until pool rotation is intentionally reintroduced.
export const WRITING_FIXED_ENTRY: WritingPoolEntry = [
  '/assets/pages/writing/weichao-deng-k0JQkPtfN3s-unsplashdichrom.png',
  0.94,
  0,
  0,
];

export type WritingPoolResolvedEntry = {
  url: string;
  opacity: number;
  nudgeX: number;
  nudgeY: number;
};

function safeNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function resolveWritingPoolEntry(
  value: unknown,
): WritingPoolResolvedEntry | null {
  if (!Array.isArray(value) || value.length < 4) return null;
  const [url, opacity, nudgeX, nudgeY] = value;
  if (typeof url !== 'string' || url.length === 0) return null;
  return {
    url,
    opacity: safeNumber(opacity, FALLBACK_WRITING_POOL_OPACITY),
    nudgeX: safeNumber(nudgeX, 0),
    nudgeY: safeNumber(nudgeY, 0),
  };
}

export function toPanelBgPosition(value: number): string {
  return `calc(50% + ${value}px)`;
}
