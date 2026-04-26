import { defineConfig, devices } from '@playwright/test';

const serverMode = process.env.PW_SERVER_MODE === 'preview' ? 'preview' : 'dev';
const webServerCommand =
  serverMode === 'preview'
    ? 'npm run build && npm run preview -- --host 127.0.0.1 --port 4321'
    : 'npm run dev';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Keep CI deterministic on weaker GitHub runners.
  workers: process.env.CI ? 4 : undefined,
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
    {
      name: 'mobile-webkit',
      use: { ...devices['iPhone 13'] },
      testMatch: [
        /.*-mobile\.spec\.ts/,
        /.*-typography-safari\.spec\.ts/,
      ],
    },
  ],
  webServer: {
    command: webServerCommand,
    url: 'http://localhost:4321',
    // When Playwright starts dev (CI=1 / all.sh), hide its stdout — otherwise Vite/Astro floods the terminal.
    stdout: 'ignore',
    // Local `npm test` in dev-mode can reuse existing server for faster iteration.
    // CI/all.sh defaults to fresh server; preview mode always starts a clean server.
    // You can still opt into reuse when needed:
    //   PW_REUSE_SERVER=1 ./scripts/all.sh
    reuseExistingServer:
      serverMode === 'dev' &&
      (!process.env.CI || process.env.PW_REUSE_SERVER === '1'),
    timeout: 15_000,
  },
});
