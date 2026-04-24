import { PNG } from 'pngjs';

/**
 * Pixel stats for a **tile-only** PNG (e.g. `getByRole('link', { name: 'Foundations' })`
 * with `screenshot({ scale: 'css' })`). Do not pass viewport or section crops — surrounding
 * page wash would inflate `pageWashInk` and invalidate black/ink ratios.
 */

/** #111 panel */
const PANEL_R = 17;
const PANEL_G = 17;
const PANEL_B = 17;
/** `global.css` --color-page-bg #e0f7fa (reveal copy) */
const INK_R = 224;
const INK_G = 247;
const INK_B = 250;

function distSq(
  r: number,
  g: number,
  b: number,
  tr: number,
  tg: number,
  tb: number,
): number {
  const dr = r - tr;
  const dg = g - tg;
  const db = b - tb;
  return dr * dr + dg * dg + db * db;
}

function classifyPixel(
  data: Buffer,
  width: number,
  x: number,
  y: number,
  blackMaxSq: number,
  inkMaxSq: number,
): { opaque: boolean; black: boolean; wash: boolean } {
  const i = (width * y + x) * 4;
  const a = data[i + 3] ?? 255;
  if (a < 200) return { opaque: false, black: false, wash: false };
  const r = data[i] ?? 0;
  const g = data[i + 1] ?? 0;
  const b = data[i + 2] ?? 0;
  return {
    opaque: true,
    black: distSq(r, g, b, PANEL_R, PANEL_G, PANEL_B) <= blackMaxSq,
    wash: distSq(r, g, b, INK_R, INK_G, INK_B) <= inkMaxSq,
  };
}

/** Strict panel #111 (interior + inset rims away from rounded outer edge). */
function isPanelBlack(
  r: number,
  g: number,
  b: number,
  blackMaxSq: number,
): boolean {
  return distSq(r, g, b, PANEL_R, PANEL_G, PANEL_B) <= blackMaxSq;
}

/**
 * Decode a Playwright element PNG and count pixels near panel black vs near page-wash ink.
 * Uses squared distance so anti-aliased text edges still count as ink.
 *
 * `insetRimBlackRatio` — among opaque pixels on a **frame inset a few CSS px inside** the PNG
 * edge, fraction matching #111. The outermost 1–2 px are often AA blends at rounded corners;
 * a few px inward the reveal fill is solid #111. A wrong crop (viewport / different tile) remains
 * light or tinted even on this frame.
 */
export function countRevealRasterSignature(pngBuffer: Buffer): {
  width: number;
  height: number;
  opaque: number;
  panelBlack: number;
  pageWashInk: number;
  insetRimBlackRatio: number;
} {
  const png = PNG.sync.read(pngBuffer);
  const { width, height, data } = png;
  let opaque = 0;
  let panelBlack = 0;
  let pageWashInk = 0;
  const blackMaxSq = 26 * 26;
  const inkMaxSq = 95 * 95;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const c = classifyPixel(data, width, x, y, blackMaxSq, inkMaxSq);
      if (!c.opaque) continue;
      opaque++;
      if (c.black) panelBlack++;
      if (c.wash) pageWashInk++;
    }
  }

  let rim = 0;
  let rimBlack = 0;
  const inset = Math.min(
    6,
    Math.max(2, Math.floor(Math.min(width, height) * 0.04)),
  );
  if (width > inset * 2 + 2 && height > inset * 2 + 2) {
    const sampleRim = (x: number, y: number) => {
      const d = Math.min(x, y, width - 1 - x, height - 1 - y);
      if (d !== inset) return;
      const i = (width * y + x) * 4;
      const a = data[i + 3] ?? 255;
      if (a < 200) return;
      rim++;
      const r = data[i] ?? 0;
      const g = data[i + 1] ?? 0;
      const b = data[i + 2] ?? 0;
      if (isPanelBlack(r, g, b, blackMaxSq)) rimBlack++;
    };
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) sampleRim(x, y);
    }
  }

  return {
    width,
    height,
    opaque,
    panelBlack,
    pageWashInk,
    insetRimBlackRatio: rim > 0 ? rimBlack / rim : 0,
  };
}
