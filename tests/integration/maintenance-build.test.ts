import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);
const routesFixture = path.join(
  rootDir,
  'e2e/fixtures/maintenance-routes.json',
);
const globalFixture = path.join(
  rootDir,
  'e2e/fixtures/maintenance-global.json',
);

function buildWithMaintenanceConfig(configPath: string): void {
  execFileSync('npm', ['run', 'build'], {
    cwd: rootDir,
    env: {
      ...process.env,
      MAINTENANCE_FORCE_OFF: '0',
      MAINTENANCE_CONFIG_PATH: configPath,
    },
    stdio: 'pipe',
  });
}

function restoreDefaultDist(): void {
  execFileSync('npm', ['run', 'build'], {
    cwd: rootDir,
    env: {
      ...process.env,
      MAINTENANCE_FORCE_OFF: '1',
    },
    stdio: 'pipe',
  });
}

function readDist(pagePath: string): string {
  return readFileSync(path.join(rootDir, 'dist', pagePath), 'utf8');
}

describe('maintenance build integration', () => {
  afterAll(() => {
    restoreDefaultDist();
  });

  it('emits Whoops route notice for listed paths and leaves others intact', () => {
    buildWithMaintenanceConfig(routesFixture);

    const writing = readDist('writing/index.html');
    expect(writing).toContain('Whoops');
    expect(writing).toContain('route-maintenance-page');
    expect(writing).toContain('page-buttons-panel__media');
    expect(writing).toContain('frankie-cordoba-s8Y5e0DNiro-unsplash_dichrom');
    expect(writing).toContain('/writing');
    expect(writing).toContain('Started on 26.08.07.');
    expect(writing).toContain('site-header');
    expect(writing).not.toContain('writing-category-picker');

    const contactExact = readDist('contact/index.html');
    expect(contactExact).toContain('Whoops');
    expect(contactExact).toContain('Started on 26.08.08.');

    const contactForm = readDist('contact/form/index.html');
    expect(contactForm).not.toContain('route-maintenance-page');
    expect(contactForm).toContain('Contact');

    const profile = readDist('profile/index.html');
    expect(profile).not.toContain('route-maintenance-page');
    expect(profile).toContain('has-buttons-panel');
  }, 120_000);

  it('emits global home notice and redirects other routes to /', () => {
    buildWithMaintenanceConfig(globalFixture);

    const home = readDist('index.html');
    expect(home).toContain('Website under maintenance');
    expect(home).toContain('global-maintenance-page');
    expect(home).toContain('Started on 26.08.07.');
    expect(home).not.toContain('class="hero-header"');
    expect(home).not.toContain('Collected notes');

    const profile = readDist('profile/index.html');
    expect(profile).toMatch(/Redirecting|refresh/i);
    expect(profile).toContain('url=/');
  }, 120_000);
});
