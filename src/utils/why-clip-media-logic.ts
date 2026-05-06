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
