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
const reconstructionFixture = path.join(
  rootDir,
  'e2e/fixtures/maintenance-reconstruction.json',
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
    expect(writing).toContain('Let the mechanics work…');
    expect(writing).toContain('site-header');
    expect(writing).not.toContain('writing-category-picker');

    const contactExact = readDist('contact/index.html');
    expect(contactExact).toContain('Whoops');
    expect(contactExact).toContain('Let the mechanics work…');

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
    expect(home).toContain('class="page-title">Whoops');
    expect(home).toContain('The website');
    expect(home).toContain('is under maintenance');
    expect(home).toContain('global-maintenance-page');
    expect(home).toContain('page-buttons-panel__media');
    expect(home).toContain('frankie-cordoba-s8Y5e0DNiro-unsplash_dichrom');
    expect(home).toContain('Let the mechanics work…');
    expect(home).toContain('site-footer__credits');
    expect(home).toContain('site-footer__home--reserved');
    expect(home).not.toMatch(/<a[^>]*site-footer__home/);
    expect(home).toContain('site-header--reserved');
    expect(home).not.toContain('site-nav__link');
    expect(home).not.toContain('class="hero-header"');
    expect(home).not.toContain('class="page-title">Jan Havlín');

    const profile = readDist('profile/index.html');
    expect(profile).toMatch(/Redirecting|refresh/i);
    expect(profile).toContain('url=/');

    const credits = readDist('credits/index.html');
    expect(credits).toContain('Frankie Cordoba');
    expect(credits).toContain('Maintenance page background image');
    expect(credits).toContain('site-header--reserved');
    expect(credits).toContain('href="/" class="site-footer__link site-footer__home"');
    expect(credits).not.toContain('site-footer__home--reserved');
    expect(credits).not.toMatch(/<a[^>]*site-header__item/);
    expect(credits).not.toContain('Anastasia Shuraeva');
    expect(credits).not.toContain('vackground.com');
  }, 120_000);

  it('emits the reconstruction panel on home and redirects other routes', () => {
    buildWithMaintenanceConfig(reconstructionFixture);

    const home = readDist('index.html');
    expect(home).toContain('is getting a new look');
    expect(home).toContain('Let the painters paint…');
    expect(home).toContain('reconstruction-panel');
    expect(home).toContain('site-header--reserved');
    expect(home).toContain('pexels-anastasia-shuraeva-5495064_dichrom_900');
    expect(home).toContain('site-footer__credits');
    expect(home).toContain('site-footer__home--reserved');
    expect(home).not.toMatch(/<a[^>]*site-footer__home/);
    expect(home).not.toContain('class="page-title">Jan Havlín');
    expect(home).not.toContain('>Profile</a>');

    const profile = readDist('profile/index.html');
    expect(profile).toMatch(/Redirecting|refresh/i);
    expect(profile).toContain('url=/');

    const credits = readDist('credits/index.html');
    expect(credits).toContain('Anastasia Shuraeva');
    expect(credits).toContain('Reconstruction page background image');
    expect(credits).toContain('site-header--reserved');
    expect(credits).toContain('href="/" class="site-footer__link site-footer__home"');
    expect(credits).not.toContain('site-footer__home--reserved');
    expect(credits).not.toMatch(/<a[^>]*site-header__item/);
    expect(credits).not.toContain('Frankie Cordoba');
    expect(credits).not.toContain('vackground.com');
  }, 120_000);
});
