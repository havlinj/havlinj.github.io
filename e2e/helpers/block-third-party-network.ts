import type { Page } from '@playwright/test';
import { UMAMI_SCRIPT_SRC } from '../../src/constants/analytics';

/**
 * Abort analytics CDN fetches in e2e.
 * Same idea as the Turnstile stub on the contact form: third-party hosts must
 * not hang navigations when DNS or the CDN is slow/unreachable.
 *
 * Prefer the shared `e2e/pw-test` fixture; this helper is for one-off pages
 * created outside that fixture path.
 */
export async function blockThirdPartyAnalytics(page: Page): Promise<void> {
  const host = new URL(UMAMI_SCRIPT_SRC).host;
  await page.route(`**/${host}/**`, (route) => route.abort());
}
