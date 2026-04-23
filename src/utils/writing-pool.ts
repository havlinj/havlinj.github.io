export type WritingPoolEntry = readonly [
  url: string,
  opacity: number,
  nudgeX: number,
  nudgeY: number,
];

export const FALLBACK_WRITING_POOL_OPACITY = 0.94;

export const WRITING_POOL_ENTRIES: WritingPoolEntry[] = [
  [
    '/assets/pages/writing/pool/joschka-silzle-90pi4AI8MwA_dichrom.png',
    0.8,
    0,
    0,
  ],
  [
    '/assets/pages/writing/pool/k8-4-jjSmhXytw-unsplash_dichrom.png',
    0.96,
    0,
    0,
  ],
  [
    '/assets/pages/writing/pool/nguy-n-hi-p-mvYyxn02rjk-unsplash_dichrom.png',
    0.94,
    0,
    0,
  ],
  [
    '/assets/pages/writing/pool/samuel-regan-asante-POCZmzEPxNc-unsplash_dichrom.png',
    0.94,
    0,
    0,
  ],
  [
    '/assets/pages/writing/pool/thomas-kinto-3WvTJrQBb38-unsplash_dichrom.png',
    1,
    0,
    60,
  ],
  [
    '/assets/pages/writing/pool/thomas-kinto-fBTQhWKEf20-unsplash_dichrom.png',
    0.94,
    0,
    5,
  ],
];

export type WritingPoolResolvedEntry = {
  url: string;
  opacity: number;
  nudgeX: number;
  nudgeY: number;
};

export type WritingPoolStep = {
  entry: WritingPoolResolvedEntry;
  currentIndex: number;
  nextIndex: number;
};

export function readNonNegativeInt(
  rawValue: string | null | undefined,
): number {
  const parsed = Number.parseInt(rawValue ?? '0', 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

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

export function getWritingPoolStep(
  entries: unknown[],
  rawIndex: string | null | undefined,
): WritingPoolStep | null {
  if (!Array.isArray(entries) || entries.length === 0) return null;
  const currentIndex = readNonNegativeInt(rawIndex) % entries.length;
  const nextIndex = (currentIndex + 1) % entries.length;
  const resolved = resolveWritingPoolEntry(entries[currentIndex]);
  if (!resolved) return null;
  return {
    entry: resolved,
    currentIndex,
    nextIndex,
  };
}

export function toPanelBgPosition(value: number): string {
  return `calc(50% + ${value}px)`;
}
