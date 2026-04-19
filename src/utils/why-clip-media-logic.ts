import {
  WHY_CLIP_VIDEO_DESKTOP,
  WHY_CLIP_VIDEO_MOBILE,
} from '../constants/why-layout';

/** Minimal `matchMedia` shape used by `clipVideoPathForViewport`. */
export type MobileMqLike = { matches: boolean };

export function clipVideoPathForViewport(mobileMq: MobileMqLike): string {
  return mobileMq.matches ? WHY_CLIP_VIDEO_MOBILE : WHY_CLIP_VIDEO_DESKTOP;
}

/**
 * Resolved pathname for a media element's effective URL (same logic as
 * `why-clip-media.ts` on the client).
 */
export function pathnameOfMediaSrc(
  currentSrc: string,
  src: string,
  baseHref: string,
): string {
  const raw = currentSrc || src;
  if (!raw) return '';
  try {
    return new URL(raw, baseHref).pathname;
  } catch {
    return '';
  }
}
