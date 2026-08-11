import { readFileSync } from 'node:fs';
import path from 'node:path';
import maintenanceConfigRaw from '../../config/maintenance.json?raw';

export type MaintenanceMatchMode = 'exact' | 'prefix';

export type MaintenanceRouteEntry = {
  path: string;
  started: string;
  match: MaintenanceMatchMode;
};

/** Discriminated config — global and routes cannot coexist. */
export type MaintenanceConfigFile =
  | { mode: 'off' }
  | { mode: 'global'; started: string }
  | { mode: 'routes'; routes: MaintenanceRouteEntry[] };

export type MaintenanceDecision =
  | { kind: 'none' }
  | { kind: 'global'; started: string }
  | {
      kind: 'route';
      configPath: string;
      displayPath: string;
      started: string;
    };

export type NonHomeMaintenanceDecision = Exclude<
  MaintenanceDecision,
  { kind: 'global' }
>;

export const MAINTENANCE_FORCE_OFF_ENV = 'MAINTENANCE_FORCE_OFF';
export const MAINTENANCE_CONFIG_JSON_ENV = 'MAINTENANCE_CONFIG_JSON';
export const MAINTENANCE_CONFIG_PATH_ENV = 'MAINTENANCE_CONFIG_PATH';

const ROUTE_FIELD_KEYS = ['path', 'started', 'match'] as const;
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

type EnvLike = Record<string, string | undefined>;

/** Allows // and /* *\/ comments in maintenance.json (JSONC-style). */
export function parseMaintenanceJson(raw: string): unknown {
  const withoutBlockComments = raw.replace(/\/\*[\s\S]*?\*\//g, '');
  const withoutLineComments = withoutBlockComments.replace(/^\s*\/\/.*$/gm, '');
  return JSON.parse(withoutLineComments) as unknown;
}

function readMaintenanceJsonFile(filePath: string): unknown {
  return parseMaintenanceJson(readFileSync(filePath, 'utf8'));
}

function readProcessEnv(): EnvLike {
  return (globalThis as { process?: { env?: EnvLike } }).process?.env ?? {};
}

function hasOwn(record: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`maintenance.json: ${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function assertNonEmptyString(
  value: unknown,
  label: string,
): asserts value is string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`maintenance.json: ${label} must be a non-empty string`);
  }
}

function assertRequiredPresent(
  record: Record<string, unknown>,
  key: string,
  label: string,
): void {
  if (!hasOwn(record, key)) {
    throw new Error(`maintenance.json: ${label} is required`);
  }
  if (record[key] === null) {
    throw new Error(`maintenance.json: ${label} must not be null`);
  }
}

function assertNoExtraKeys(
  record: Record<string, unknown>,
  allowed: readonly string[],
  label: string,
): void {
  const extraKeys = Object.keys(record).filter((key) => !allowed.includes(key));
  if (extraKeys.length > 0) {
    throw new Error(
      `maintenance.json: ${label} has unknown keys: ${extraKeys.join(', ')}`,
    );
  }
}

export function isMaintenanceForcedOff(
  env: EnvLike = readProcessEnv(),
): boolean {
  const raw = env[MAINTENANCE_FORCE_OFF_ENV];
  return raw === '1' || raw === 'true';
}

export function normalizeRoutePath(pathname: string): string {
  if (!pathname || pathname === '/') return '/';
  const withLeading = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const trimmed = withLeading.replace(/\/+$/, '');
  return trimmed === '' ? '/' : trimmed;
}

export function formatMaintenanceStartedDate(isoDate: string): string {
  const match = ISO_DATE_PATTERN.exec(isoDate.trim());
  if (!match) {
    throw new Error(
      `maintenance started date must be YYYY-MM-DD, got: ${JSON.stringify(isoDate)}`,
    );
  }
  const [, year, month, day] = match;
  return `${year.slice(2)}.${month}.${day}.`;
}

function assertStartedDate(value: unknown, label: string): string {
  assertNonEmptyString(value, label);
  formatMaintenanceStartedDate(value);
  return value.trim();
}

function assertValidRoute(
  route: unknown,
  index: number,
): asserts route is MaintenanceRouteEntry {
  const label = `routes[${index}]`;
  const record = asRecord(route, label);
  for (const key of ROUTE_FIELD_KEYS) {
    assertRequiredPresent(record, key, `${label}.${key}`);
  }
  assertNonEmptyString(record.path, `${label}.path`);
  if (!record.path.startsWith('/')) {
    throw new Error(`maintenance.json: ${label}.path must start with /`);
  }
  assertStartedDate(record.started, `${label}.started`);
  if (record.match !== 'exact' && record.match !== 'prefix') {
    throw new Error(
      `maintenance.json: ${label}.match must be "exact" or "prefix"`,
    );
  }
  assertNoExtraKeys(record, ROUTE_FIELD_KEYS, label);
}

export function assertValidConfig(
  config: unknown,
): asserts config is MaintenanceConfigFile {
  const record = asRecord(config, 'root');
  assertRequiredPresent(record, 'mode', '"mode"');
  if (record.mode === 'off') {
    assertNoExtraKeys(record, ['mode'], 'root (mode=off)');
    return;
  }
  if (record.mode === 'global') {
    assertRequiredPresent(record, 'started', 'started');
    assertStartedDate(record.started, 'started');
    assertNoExtraKeys(record, ['mode', 'started'], 'root (mode=global)');
    return;
  }
  if (record.mode === 'routes') {
    assertRequiredPresent(record, 'routes', 'routes');
    if (!Array.isArray(record.routes)) {
      throw new Error('maintenance.json: routes must be an array');
    }
    if (record.routes.length === 0) {
      throw new Error(
        'maintenance.json: routes must be non-empty when mode=routes (use mode=off instead)',
      );
    }
    record.routes.forEach((route, index) => assertValidRoute(route, index));
    assertNoExtraKeys(record, ['mode', 'routes'], 'root (mode=routes)');
    return;
  }
  throw new Error(
    'maintenance.json: mode must be "off", "global", or "routes"',
  );
}

export function readMaintenanceConfigSource(
  env: EnvLike = readProcessEnv(),
): unknown {
  const jsonRaw = env[MAINTENANCE_CONFIG_JSON_ENV];
  if (jsonRaw !== undefined && jsonRaw !== '') {
    try {
      return parseMaintenanceJson(jsonRaw);
    } catch {
      throw new Error(
        `${MAINTENANCE_CONFIG_JSON_ENV} must be valid JSON (comments allowed)`,
      );
    }
  }
  const pathRaw = env[MAINTENANCE_CONFIG_PATH_ENV];
  if (pathRaw !== undefined && pathRaw !== '') {
    const absolute = path.isAbsolute(pathRaw)
      ? pathRaw
      : path.resolve(process.cwd(), pathRaw);
    return readMaintenanceJsonFile(absolute);
  }
  return parseMaintenanceJson(maintenanceConfigRaw);
}

export function loadMaintenanceConfig(
  config: unknown = readMaintenanceConfigSource(),
): MaintenanceConfigFile {
  assertValidConfig(config);
  if (config.mode === 'off') {
    return { mode: 'off' };
  }
  if (config.mode === 'global') {
    return { mode: 'global', started: config.started.trim() };
  }
  return {
    mode: 'routes',
    routes: config.routes.map((route) => ({
      path: normalizeRoutePath(route.path),
      started: route.started.trim(),
      match: route.match,
    })),
  };
}

/** Validates active config at import time so bad JSON fails `astro build`. */
loadMaintenanceConfig();

function routeMatches(entry: MaintenanceRouteEntry, pathname: string): boolean {
  const configured = normalizeRoutePath(entry.path);
  const current = normalizeRoutePath(pathname);
  if (entry.match === 'exact') {
    return current === configured;
  }
  if (configured === '/') {
    return true;
  }
  return current === configured || current.startsWith(`${configured}/`);
}

export function findUnavailableRoute(
  pathname: string,
  config: MaintenanceConfigFile = loadMaintenanceConfig(),
): MaintenanceRouteEntry | null {
  if (config.mode !== 'routes') {
    return null;
  }
  const matches = config.routes.filter((route) =>
    routeMatches(route, pathname),
  );
  if (matches.length === 0) return null;
  matches.sort((a, b) => b.path.length - a.path.length);
  return matches[0] ?? null;
}

export function resolveMaintenance(
  pathname: string,
  options: {
    config?: MaintenanceConfigFile;
    env?: EnvLike;
  } = {},
): MaintenanceDecision {
  if (isMaintenanceForcedOff(options.env)) {
    return { kind: 'none' };
  }
  const source =
    options.config !== undefined
      ? options.config
      : readMaintenanceConfigSource(options.env);
  const config = loadMaintenanceConfig(source);
  if (config.mode === 'global') {
    return { kind: 'global', started: config.started };
  }
  if (config.mode === 'off') {
    return { kind: 'none' };
  }
  const route = findUnavailableRoute(pathname, config);
  if (!route) {
    return { kind: 'none' };
  }
  return {
    kind: 'route',
    configPath: route.path,
    displayPath: normalizeRoutePath(pathname),
    started: route.started,
  };
}

/**
 * Gate for every page except home. Callers must `return Astro.redirect('/')`
 * when `redirectHome` is true.
 */
export function gateNonHomeMaintenance(
  pathname: string,
  options: {
    config?: MaintenanceConfigFile;
    env?: EnvLike;
  } = {},
): {
  redirectHome: boolean;
  decision: NonHomeMaintenanceDecision;
} {
  const decision = resolveMaintenance(pathname, options);
  if (decision.kind === 'global') {
    return { redirectHome: true, decision: { kind: 'none' } };
  }
  return { redirectHome: false, decision };
}
