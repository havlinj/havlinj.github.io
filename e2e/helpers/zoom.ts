import type { Page } from '@playwright/test';

type ApplyExtremeZoomOptions = {
  attempts?: number;
};

export async function applyExtremeZoom(
  page: Page,
  options: ApplyExtremeZoomOptions = {},
): Promise<void> {
  const attempts = Math.max(1, options.attempts ?? 1);

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      await page.evaluate(() => {
        document.documentElement.style.zoom = '3';
        window.dispatchEvent(new Event('resize'));
      });
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const retryable =
        message.includes('Execution context was destroyed') ||
        message.includes('Cannot find context with specified id');
      if (!retryable || attempt === attempts - 1) throw error;
      await page.waitForLoadState('domcontentloaded');
    }
  }
}
