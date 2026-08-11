import { defineConfig, devices } from '@playwright/test';

/**
 * Isolated Playwright run that builds with an injected maintenance fixture.
 * Default suite keeps MAINTENANCE_FORCE_OFF=1; this config asserts the notice UI.
 */
const port = Number(process.env.MAINTENANCE_PW_PORT ?? 4322);
const configPath =
  process.env.MAINTENANCE_CONFIG_PATH ?? 'e2e/fixtures/maintenance-routes.json';
// Do not honor PW_SKIP_BUILD from the main suite — that dist is FORCE_OFF.
// Opt into reuse only with MAINTENANCE_PW_SKIP_BUILD=1 after a matching build.
const skipBuild = process.env.MAINTENANCE_PW_SKIP_BUILD === '1';

const previewCommand = `npm run preview -- --host 127.0.0.1 --port ${port}`;
const buildEnv = [
  'MAINTENANCE_FORCE_OFF=0',
  `MAINTENANCE_CONFIG_PATH=${configPath}`,
].join(' ');
const webServerCommand = skipBuild
  ? previewCommand
  : `${buildEnv} npm run build && ${previewCommand}`;

export default defineConfig({
  testDir: './e2e',
  testMatch: /maintenance-(routes|global)\.spec\.ts/,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'maintenance-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: webServerCommand,
    url: `http://127.0.0.1:${port}`,
    env: {
      ...process.env,
      MAINTENANCE_FORCE_OFF: '0',
      MAINTENANCE_CONFIG_PATH: configPath,
    },
    stdout: 'ignore',
    reuseExistingServer: process.env.PW_REUSE_SERVER === '1',
    timeout: 60_000,
  },
});
