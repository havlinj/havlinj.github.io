import { readFileSync } from 'node:fs';
import path from 'node:path';
import maintenanceConfig from '../config/maintenance.json';

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

export const MAINTENANCE_FORCE_OFF_ENV = 'MAINTENANCE_FORCE_OFF';
export const MAINTENANCE_CONFIG_JSON_ENV = 'MAINTENANCE_CONFIG_JSON';
export const MAINTENANCE_CONFIG_PATH_ENV = 'MAINTENANCE_CONFIG_PATH';

type EnvLike = Record<string, string | undefined>;

function readProcessEnv(): EnvLike {
  return (globalThis as { process?: { env?: EnvLike } }).process?.env ?? {};
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
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!match) {
    throw new Error(
      `maintenance started date must be YYYY-MM-DD, got: ${JSON.stringify(isoDate)}`,
    );
  }
  const [, year, month, day] = match;
  return `${year.slice(2)}.${month}.${day}.`;
}

function assertNonEmptyString(
  value: unknown,
  label: string,
): asserts value is string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`maintenance.json: ${label} must be a non-empty string`);
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

function assertValidRoute(
  route: unknown,
  index: number,
): asserts route is MaintenanceRouteEntry {
  const label = `routes[${index}]`;
  if (route === null || typeof route !== 'object' || Array.isArray(route)) {
    throw new Error(`maintenance.json: ${label} must be an object`);
  }
  const record = route as Record<string, unknown>;
  for (const key of ['path', 'started', 'match'] as const) {
    if (!Object.prototype.hasOwnProperty.call(record, key)) {
      throw new Error(`maintenance.json: ${label}.${key} is required`);
    }
    if (record[key] === null) {
      throw new Error(`maintenance.json: ${label}.${key} must not be null`);
    }
  }
  assertNonEmptyString(record.path, `${label}.path`);
  if (!record.path.startsWith('/')) {
    throw new Error(`maintenance.json: ${label}.path must start with /`);
  }
  assertNonEmptyString(record.started, `${label}.started`);
  formatMaintenanceStartedDate(record.started);
  if (record.match !== 'exact' && record.match !== 'prefix') {
    throw new Error(
      `maintenance.json: ${label}.match must be "exact" or "prefix"`,
    );
  }
  assertNoExtraKeys(record, ['path', 'started', 'match'], label);
}

export function assertValidConfig(
  config: unknown,
): asserts config is MaintenanceConfigFile {
  if (config === null || typeof config !== 'object' || Array.isArray(config)) {
    throw new Error('maintenance.json: root must be an object');
  }
  const record = config as Record<string, unknown>;
  if (!Object.prototype.hasOwnProperty.call(record, 'mode')) {
    throw new Error(
      'maintenance.json: "mode" is required ("off" | "global" | "routes")',
    );
  }
  if (record.mode === null) {
    throw new Error('maintenance.json: "mode" must not be null');
  }
  if (record.mode === 'off') {
    assertNoExtraKeys(record, ['mode'], 'root (mode=off)');
    return;
  }
  if (record.mode === 'global') {
    if (!Object.prototype.hasOwnProperty.call(record, 'started')) {
      throw new Error('maintenance.json: started is required when mode=global');
    }
    if (record.started === null) {
      throw new Error('maintenance.json: started must not be null');
    }
    assertNonEmptyString(record.started, 'started');
    formatMaintenanceStartedDate(record.started);
    assertNoExtraKeys(record, ['mode', 'started'], 'root (mode=global)');
    return;
  }
  if (record.mode === 'routes') {
    if (!Object.prototype.hasOwnProperty.call(record, 'routes')) {
      throw new Error('maintenance.json: routes is required when mode=routes');
    }
    if (record.routes === null) {
      throw new Error('maintenance.json: routes must not be null');
    }
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
      return JSON.parse(jsonRaw) as unknown;
    } catch {
      throw new Error(`${MAINTENANCE_CONFIG_JSON_ENV} must be valid JSON`);
    }
  }
  const pathRaw = env[MAINTENANCE_CONFIG_PATH_ENV];
  if (pathRaw !== undefined && pathRaw !== '') {
    const absolute = path.isAbsolute(pathRaw)
      ? pathRaw
      : path.resolve(process.cwd(), pathRaw);
    return JSON.parse(readFileSync(absolute, 'utf8')) as unknown;
  }
  return maintenanceConfig;
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
  const path = normalizeRoutePath(entry.path);
  const current = normalizeRoutePath(pathname);
  if (entry.match === 'exact') {
    return current === path;
  }
  if (path === '/') {
    return true;
  }
  return current === path || current.startsWith(`${path}/`);
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
  const config =
    options.config !== undefined
      ? loadMaintenanceConfig(options.config)
      : loadMaintenanceConfig(readMaintenanceConfigSource(options.env));
  if (config.mode === 'global') {
    return {
      kind: 'global',
      started: config.started,
    };
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
