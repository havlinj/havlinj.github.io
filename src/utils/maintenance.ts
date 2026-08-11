import maintenanceConfig from '../config/maintenance.json';

export type MaintenanceMatchMode = 'exact' | 'prefix';

export type MaintenanceRouteEntry = {
  path: string;
  started: string;
  match: MaintenanceMatchMode;
};

export type MaintenanceGlobalEntry = {
  started: string;
};

export type MaintenanceConfigFile = {
  global: MaintenanceGlobalEntry | null;
  routes: MaintenanceRouteEntry[];
};

export type MaintenanceDecision =
  | { kind: 'none' }
  | { kind: 'global'; started: string }
  | {
      kind: 'route';
      configPath: string;
      displayPath: string;
      started: string;
    };

const FORCE_OFF_ENV = 'MAINTENANCE_FORCE_OFF';

type EnvLike = Record<string, string | undefined>;

function readProcessEnv(): EnvLike {
  return (globalThis as { process?: { env?: EnvLike } }).process?.env ?? {};
}

export function isMaintenanceForcedOff(
  env: EnvLike = readProcessEnv(),
): boolean {
  const raw = env[FORCE_OFF_ENV];
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

function assertValidGlobal(
  global: unknown,
): asserts global is MaintenanceGlobalEntry | null {
  if (global === null) {
    return;
  }
  if (typeof global !== 'object' || Array.isArray(global)) {
    throw new Error(
      'maintenance.json: "global" must be null or { "started": "YYYY-MM-DD" }',
    );
  }
  const record = global as Record<string, unknown>;
  if (!Object.prototype.hasOwnProperty.call(record, 'started')) {
    throw new Error('maintenance.json: global.started is required');
  }
  if (record.started === null) {
    throw new Error('maintenance.json: global.started must not be null');
  }
  assertNonEmptyString(record.started, 'global.started');
  formatMaintenanceStartedDate(record.started);
  const extraKeys = Object.keys(record).filter((key) => key !== 'started');
  if (extraKeys.length > 0) {
    throw new Error(
      `maintenance.json: global has unknown keys: ${extraKeys.join(', ')}`,
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
  const extraKeys = Object.keys(record).filter(
    (key) => key !== 'path' && key !== 'started' && key !== 'match',
  );
  if (extraKeys.length > 0) {
    throw new Error(
      `maintenance.json: ${label} has unknown keys: ${extraKeys.join(', ')}`,
    );
  }
}

export function assertValidConfig(
  config: unknown,
): asserts config is MaintenanceConfigFile {
  if (config === null || typeof config !== 'object' || Array.isArray(config)) {
    throw new Error('maintenance.json: root must be an object');
  }
  const record = config as Record<string, unknown>;
  if (!Object.prototype.hasOwnProperty.call(record, 'global')) {
    throw new Error(
      'maintenance.json: "global" is required (use null when off)',
    );
  }
  if (!Object.prototype.hasOwnProperty.call(record, 'routes')) {
    throw new Error('maintenance.json: "routes" is required');
  }
  if (record.routes === null) {
    throw new Error('maintenance.json: "routes" must not be null');
  }
  if (!Array.isArray(record.routes)) {
    throw new Error('maintenance.json: "routes" must be an array');
  }
  assertValidGlobal(record.global);
  record.routes.forEach((route, index) => assertValidRoute(route, index));
  const extraKeys = Object.keys(record).filter(
    (key) => key !== 'global' && key !== 'routes',
  );
  if (extraKeys.length > 0) {
    throw new Error(
      `maintenance.json: unknown top-level keys: ${extraKeys.join(', ')}`,
    );
  }
}

export function loadMaintenanceConfig(
  config: unknown = maintenanceConfig,
): MaintenanceConfigFile {
  assertValidConfig(config);
  return {
    global:
      config.global === null ? null : { started: config.global.started.trim() },
    routes: config.routes.map((route) => ({
      path: normalizeRoutePath(route.path),
      started: route.started.trim(),
      match: route.match,
    })),
  };
}

/** Validates repo config at import time so bad JSON fails `astro build`. */
loadMaintenanceConfig(maintenanceConfig);

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
  const config = loadMaintenanceConfig(options.config);
  if (config.global !== null) {
    return {
      kind: 'global',
      started: config.global.started,
    };
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
