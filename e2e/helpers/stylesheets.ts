import type { Page } from '@playwright/test';

/** Stylesheet URLs linked in `<head>` (Astro/Vite hashed bundles under `/_astro/`). */
export async function readStylesheetHrefs(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(
      (el) => (el as HTMLLinkElement).href,
    ),
  );
}

/** True when any stylesheet href contains `/_astro/<bundle>.` (e.g. bundle `profile`). */
export function hasAstroStylesheetBundle(
  hrefs: string[],
  bundle: string,
): boolean {
  const needle = `/_astro/${bundle}.`;
  return hrefs.some((href) => href.includes(needle));
}
