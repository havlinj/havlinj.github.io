import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  PLAYWRIGHT_PACKAGE,
  buildPlaywrightInstallArgs,
  playwrightDockerImage,
  playwrightLockMismatchMessage,
  readInstalledPlaywrightVersion,
  readLockfilePlaywrightVersion,
  shouldInstallOsDependencies,
} from '../../scripts/ci/ensure-playwright.mjs';

function writeTempJson(fileName: string, value: unknown): string {
  const dir = mkdtempSync(join(tmpdir(), 'ensure-playwright-'));
  const path = join(dir, fileName);
  writeFileSync(path, `${JSON.stringify(value)}\n`);
  return path;
}

describe('ensure-playwright gate', () => {
  it('reads the lockfile Playwright version', () => {
    const lockfilePath = writeTempJson('package-lock.json', {
      packages: {
        [`node_modules/${PLAYWRIGHT_PACKAGE}`]: { version: '1.65.1' },
      },
    });
    expect(readLockfilePlaywrightVersion(lockfilePath)).toBe('1.65.1');
  });

  it('returns null when Playwright is missing from node_modules', () => {
    expect(
      readInstalledPlaywrightVersion(
        join(tmpdir(), 'missing-playwright-package.json'),
      ),
    ).toBeNull();
  });

  it('explains a missing or mismatched install', () => {
    expect(playwrightLockMismatchMessage('1.65.1', null)).toContain(
      'Run: npm ci',
    );
    expect(playwrightLockMismatchMessage('1.65.1', '1.58.2')).toContain(
      'mismatch',
    );
    expect(playwrightLockMismatchMessage('1.65.1', '1.65.1')).toBeNull();
  });

  it('adds --with-deps only in CI or when explicitly requested', () => {
    expect(shouldInstallOsDependencies({})).toBe(false);
    expect(shouldInstallOsDependencies({ CI: 'true' })).toBe(true);
    expect(shouldInstallOsDependencies({ PLAYWRIGHT_INSTALL_DEPS: '1' })).toBe(
      true,
    );
    expect(
      shouldInstallOsDependencies({
        CI: 'true',
        PLAYWRIGHT_SKIP_OS_DEPS: '1',
      }),
    ).toBe(false);
    expect(buildPlaywrightInstallArgs({})).toEqual([
      'playwright',
      'install',
      'chromium',
      'webkit',
    ]);
    expect(buildPlaywrightInstallArgs({ CI: 'true' })).toEqual([
      'playwright',
      'install',
      '--with-deps',
      'chromium',
      'webkit',
    ]);
    expect(
      buildPlaywrightInstallArgs({ CI: 'true', PLAYWRIGHT_SKIP_OS_DEPS: '1' }),
    ).toEqual(['playwright', 'install', 'chromium', 'webkit']);
  });

  it('keeps the Actions Playwright image tag aligned with package-lock', () => {
    const lockVersion = readLockfilePlaywrightVersion();
    const expectedImage = playwrightDockerImage(lockVersion);
    const workflow = readFileSync(
      join(process.cwd(), '.github/workflows/deploy.yml'),
      'utf8',
    );
    expect(workflow).toContain(`image: ${expectedImage}`);
  });
});
