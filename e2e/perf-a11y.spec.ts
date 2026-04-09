import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

type PerfBudgetResult = {
  lcp: number;
  cls: number;
  tbt: number;
};

const PERF_BUDGET = {
  lcpMs: 4000,
  cls: 0.1,
  tbtMs: 300,
} as const;

test.describe('Homepage quality gates', () => {
  test('performance budget stays within conservative limits', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      (
        window as unknown as {
          __perfBudget?: { lcp: number; cls: number; tbt: number };
        }
      ).__perfBudget = {
        lcp: 0,
        cls: 0,
        tbt: 0,
      };

      const state = (
        window as unknown as {
          __perfBudget: { lcp: number; cls: number; tbt: number };
        }
      ).__perfBudget;

      let lcpObserver: PerformanceObserver | null = null;
      try {
        lcpObserver = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            if (entry.startTime > state.lcp) state.lcp = entry.startTime;
          }
        });
        lcpObserver.observe({
          type: 'largest-contentful-paint',
          buffered: true,
        });
      } catch {
        // Unsupported observer type in this runtime.
      }

      let clsObserver: PerformanceObserver | null = null;
      try {
        clsObserver = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries() as unknown as Array<{
            value: number;
            hadRecentInput?: boolean;
          }>) {
            if (!entry.hadRecentInput) state.cls += entry.value;
          }
        });
        clsObserver.observe({ type: 'layout-shift', buffered: true });
      } catch {
        // Unsupported observer type in this runtime.
      }

      let longTaskObserver: PerformanceObserver | null = null;
      try {
        longTaskObserver = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            state.tbt += Math.max(0, entry.duration - 50);
          }
        });
        longTaskObserver.observe({ type: 'longtask', buffered: true });
      } catch {
        // Unsupported observer type in this runtime.
      }

      document.addEventListener(
        'visibilitychange',
        () => {
          if (document.visibilityState === 'hidden') {
            lcpObserver?.takeRecords();
            clsObserver?.takeRecords();
            longTaskObserver?.takeRecords();
            lcpObserver?.disconnect();
            clsObserver?.disconnect();
            longTaskObserver?.disconnect();
          }
        },
        { once: true },
      );
    });

    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);

    const metrics = await page.evaluate<PerfBudgetResult>(() => {
      const state = (window as unknown as { __perfBudget: PerfBudgetResult })
        .__perfBudget;
      return {
        lcp: state?.lcp ?? 0,
        cls: state?.cls ?? 0,
        tbt: state?.tbt ?? 0,
      };
    });

    expect(metrics.lcp).toBeGreaterThan(0);
    expect(metrics.lcp).toBeLessThanOrEqual(PERF_BUDGET.lcpMs);
    expect(metrics.cls).toBeLessThanOrEqual(PERF_BUDGET.cls);
    expect(metrics.tbt).toBeLessThanOrEqual(PERF_BUDGET.tbtMs);
  });

  test('homepage has no critical axe violations and keyboard flow basics work', async ({
    page,
  }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const criticalViolations = accessibilityScanResults.violations.filter(
      (violation) => violation.impact === 'critical',
    );
    expect(criticalViolations).toEqual([]);

    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Profile' })).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Writing' })).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Contact' })).toBeFocused();
  });
});
