import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const PLAYWRIGHT_PACKAGE = '@playwright/test';
export const PLAYWRIGHT_BROWSERS = ['chromium', 'webkit'];

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = join(SCRIPT_DIR, '../..');
const LOCKFILE_PATH = join(REPO_ROOT, 'package-lock.json');
const INSTALLED_PACKAGE_PATH = join(
  REPO_ROOT,
  'node_modules',
  PLAYWRIGHT_PACKAGE,
  'package.json',
);
const LOCKFILE_PACKAGE_KEY = `node_modules/${PLAYWRIGHT_PACKAGE}`;

export function readJsonFile(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function readLockfilePlaywrightVersion(lockfilePath = LOCKFILE_PATH) {
  const version =
    readJsonFile(lockfilePath).packages?.[LOCKFILE_PACKAGE_KEY]?.version ??
    null;
  if (!version) {
    throw new Error(`package-lock.json has no ${LOCKFILE_PACKAGE_KEY} version`);
  }
  return version;
}

export function readInstalledPlaywrightVersion(
  packageJsonPath = INSTALLED_PACKAGE_PATH,
) {
  try {
    return readJsonFile(packageJsonPath).version;
  } catch {
    return null;
  }
}

export function playwrightLockMismatchMessage(expected, installed) {
  if (installed === null) {
    return (
      `${PLAYWRIGHT_PACKAGE} is not installed. ` +
      `Expected ${expected} from package-lock.json.\n` +
      'Run: npm ci'
    );
  }
  if (installed !== expected) {
    return (
      `${PLAYWRIGHT_PACKAGE} mismatch: node_modules has ${installed}, ` +
      `package-lock.json has ${expected}.\n` +
      'Run: npm ci'
    );
  }
  return null;
}

export function assertPlaywrightMatchesLockfile(paths = {}) {
  const expected = readLockfilePlaywrightVersion(paths.lockfilePath);
  const installed = readInstalledPlaywrightVersion(paths.packageJsonPath);
  const mismatch = playwrightLockMismatchMessage(expected, installed);
  if (mismatch) {
    throw new Error(mismatch);
  }
  return expected;
}

export function shouldInstallOsDependencies(env = process.env) {
  return env.CI === 'true' || env.PLAYWRIGHT_INSTALL_DEPS === '1';
}

export function buildPlaywrightInstallArgs(
  env = process.env,
  browsers = PLAYWRIGHT_BROWSERS,
) {
  const args = ['playwright', 'install'];
  if (shouldInstallOsDependencies(env)) {
    args.push('--with-deps');
  }
  args.push(...browsers);
  return args;
}

export function installPlaywrightBrowsers(env = process.env, run = spawnSync) {
  const args = buildPlaywrightInstallArgs(env);
  console.log(
    `Installing ${PLAYWRIGHT_BROWSERS.join(' and ')} for that Playwright version...`,
  );
  const result = run('npx', args, {
    cwd: REPO_ROOT,
    stdio: 'inherit',
    env,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function printLockVersion() {
  process.stdout.write(`${readLockfilePlaywrightVersion()}\n`);
}

export function ensurePlaywright() {
  const version = assertPlaywrightMatchesLockfile();
  console.log(`${PLAYWRIGHT_PACKAGE} ${version} matches package-lock.json`);
  installPlaywrightBrowsers();
}

function main(argv = process.argv.slice(2)) {
  if (argv.includes('--print-lock-version')) {
    printLockVersion();
    return;
  }
  ensurePlaywright();
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
