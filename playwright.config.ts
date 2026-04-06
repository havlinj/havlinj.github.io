import { defineConfig, devices } from '@playwright/test';

/** When `CI=1`: parallel browsers on Playwright-owned dev (see scripts/all.sh). */
function ciWorkerCount(): number {
  const raw = process.env.PW_WORKERS;
  if (raw) {
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : 12;
  }
  // Matches a strong local machine; GitHub Actions overrides via PW_WORKERS in workflow.
  return 12;
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? ciWorkerCount() : undefined,
  // html first (build report), then list: list ends with epilogue(true) = full stacks for failed tests.
  // Playwright's default `line` helper (html-only) uses epilogue(false) — only names at the end.
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: 'http://localhost:4321',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /.*-mobile\.spec\.ts/,
    },
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 7'] },
      testMatch: /.*-mobile\.spec\.ts/,
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:4321',
    // When Playwright starts dev (CI=1 / all.sh), hide its stdout — otherwise Vite/Astro floods the terminal.
    stdout: 'ignore',
    // Local `npm test`: reuse an existing dev on :4321 (fast iteration). That process
    // can degrade under many parallel Playwright workers; use `CI=1 npm test` or
    // `./scripts/all.sh` for a clean server each run (see scripts/all.sh).
    reuseExistingServer: !process.env.CI,
  },
});
