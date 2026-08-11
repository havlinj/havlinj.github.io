import { describe, expect, it } from 'vitest';
import {
  assertValidConfig,
  findUnavailableRoute,
  formatMaintenanceStartedDate,
  gateNonHomeMaintenance,
  isMaintenanceForcedOff,
  loadMaintenanceConfig,
  normalizeRoutePath,
  readMaintenanceConfigSource,
  resolveMaintenance,
  type MaintenanceConfigFile,
} from '../../src/utils/maintenance';

const routesConfig: MaintenanceConfigFile = {
  mode: 'routes',
  routes: [
    { path: '/writing', started: '2026-08-07', match: 'prefix' },
    { path: '/contact/form', started: '2026-08-08', match: 'exact' },
  ],
};

const globalConfig: MaintenanceConfigFile = {
  mode: 'global',
  started: '2026-08-07',
};

describe('maintenance path + date helpers', () => {
  it('normalizes paths', () => {
    expect(normalizeRoutePath('/writing/')).toBe('/writing');
    expect(normalizeRoutePath('writing')).toBe('/writing');
    expect(normalizeRoutePath('/')).toBe('/');
    expect(normalizeRoutePath('///')).toBe('/');
  });

  it('formats started dates as YY.MM.DD.', () => {
    expect(formatMaintenanceStartedDate('2026-08-07')).toBe('26.08.07.');
    expect(formatMaintenanceStartedDate('1999-12-31')).toBe('99.12.31.');
  });

  it('rejects invalid started dates', () => {
    expect(() => formatMaintenanceStartedDate('08/07/2026')).toThrow(
      /YYYY-MM-DD/,
    );
    expect(() => formatMaintenanceStartedDate('')).toThrow(/YYYY-MM-DD/);
    expect(() => formatMaintenanceStartedDate('2026-8-7')).toThrow(
      /YYYY-MM-DD/,
    );
  });
});

describe('maintenance schema (mode discriminated union)', () => {
  it('accepts mode=off with no other keys', () => {
    expect(loadMaintenanceConfig({ mode: 'off' })).toEqual({ mode: 'off' });
  });

  it('accepts mode=global with started', () => {
    expect(
      loadMaintenanceConfig({ mode: 'global', started: '2026-08-07' }),
    ).toEqual({ mode: 'global', started: '2026-08-07' });
  });

  it('accepts mode=routes with required route fields', () => {
    expect(loadMaintenanceConfig(routesConfig)).toEqual({
      mode: 'routes',
      routes: [
        { path: '/writing', started: '2026-08-07', match: 'prefix' },
        { path: '/contact/form', started: '2026-08-08', match: 'exact' },
      ],
    });
  });

  it('rejects legacy global+routes shape', () => {
    expect(() =>
      assertValidConfig({
        global: null,
        routes: [],
      }),
    ).toThrow(/mode/);
  });

  it('rejects mixing global fields onto routes mode', () => {
    expect(() =>
      assertValidConfig({
        mode: 'routes',
        started: '2026-08-07',
        routes: [{ path: '/writing', started: '2026-08-07', match: 'prefix' }],
      }),
    ).toThrow(/unknown keys: started/);
  });

  it('rejects mixing routes onto global mode', () => {
    expect(() =>
      assertValidConfig({
        mode: 'global',
        started: '2026-08-07',
        routes: [{ path: '/writing', started: '2026-08-07', match: 'prefix' }],
      }),
    ).toThrow(/unknown keys: routes/);
  });

  it('rejects extra keys on mode=off', () => {
    expect(() =>
      assertValidConfig({
        mode: 'off',
        routes: [],
      }),
    ).toThrow(/unknown keys: routes/);
  });

  it('rejects empty routes when mode=routes', () => {
    expect(() => assertValidConfig({ mode: 'routes', routes: [] })).toThrow(
      /non-empty/,
    );
  });

  it('rejects null or missing required fields', () => {
    expect(() => assertValidConfig({ mode: 'global', started: null })).toThrow(
      /started must not be null/,
    );

    expect(() => assertValidConfig({ mode: 'global' })).toThrow(
      /started is required/,
    );

    expect(() =>
      assertValidConfig({
        mode: 'routes',
        routes: [{ path: '/writing', started: '2026-08-07' }],
      }),
    ).toThrow(/routes\[0\]\.match is required/);

    expect(() =>
      assertValidConfig({
        mode: 'routes',
        routes: [{ path: '/writing', started: null, match: 'prefix' }],
      }),
    ).toThrow(/routes\[0\]\.started must not be null/);

    expect(() =>
      assertValidConfig({
        mode: 'routes',
        routes: [{ path: 'writing', started: '2026-08-07', match: 'prefix' }],
      }),
    ).toThrow(/must start with \//);

    expect(() => assertValidConfig({ mode: 'nope' })).toThrow(
      /mode must be "off"/,
    );
  });

  it('loads the repo maintenance.json as mode=off', () => {
    const config = loadMaintenanceConfig();
    expect(config).toEqual({ mode: 'off' });
  });
});

describe('maintenance route matching', () => {
  it('matches prefix routes and prefers the longest match', () => {
    const config = loadMaintenanceConfig({
      mode: 'routes',
      routes: [
        { path: '/contact', started: '2026-08-01', match: 'prefix' },
        { path: '/contact/form', started: '2026-08-02', match: 'prefix' },
      ],
    });
    expect(findUnavailableRoute('/contact/form', config)?.path).toBe(
      '/contact/form',
    );
    expect(findUnavailableRoute('/contact', config)?.path).toBe('/contact');
    expect(findUnavailableRoute('/writing', config)).toBeNull();
  });

  it('respects exact match mode', () => {
    const config = loadMaintenanceConfig(routesConfig);
    expect(findUnavailableRoute('/contact/form', config)?.path).toBe(
      '/contact/form',
    );
    expect(findUnavailableRoute('/contact/form/extra', config)).toBeNull();
    expect(findUnavailableRoute('/writing/extra', config)?.path).toBe(
      '/writing',
    );
    expect(findUnavailableRoute('/blog/x', config)).toBeNull();
  });

  it('returns null for findUnavailableRoute when not in routes mode', () => {
    expect(findUnavailableRoute('/writing', { mode: 'off' })).toBeNull();
    expect(findUnavailableRoute('/writing', globalConfig)).toBeNull();
  });
});

describe('resolveMaintenance', () => {
  it('resolves global shutdown for every path', () => {
    expect(
      resolveMaintenance('/profile', { config: globalConfig, env: {} }),
    ).toEqual({ kind: 'global', started: '2026-08-07' });
    expect(resolveMaintenance('/', { config: globalConfig, env: {} })).toEqual({
      kind: 'global',
      started: '2026-08-07',
    });
  });

  it('resolves a route notice with the visited path', () => {
    expect(
      resolveMaintenance('/writing/', { config: routesConfig, env: {} }),
    ).toEqual({
      kind: 'route',
      configPath: '/writing',
      displayPath: '/writing',
      started: '2026-08-07',
    });
  });

  it('returns none for uncovered paths in routes mode', () => {
    expect(
      resolveMaintenance('/profile', { config: routesConfig, env: {} }),
    ).toEqual({ kind: 'none' });
  });

  it('returns none when mode=off', () => {
    expect(
      resolveMaintenance('/writing', { config: { mode: 'off' }, env: {} }),
    ).toEqual({ kind: 'none' });
  });

  it('force-off disables all maintenance decisions', () => {
    expect(isMaintenanceForcedOff({ MAINTENANCE_FORCE_OFF: '1' })).toBe(true);
    expect(
      resolveMaintenance('/writing', {
        config: routesConfig,
        env: { MAINTENANCE_FORCE_OFF: '1' },
      }),
    ).toEqual({ kind: 'none' });
    expect(
      resolveMaintenance('/', {
        config: globalConfig,
        env: { MAINTENANCE_FORCE_OFF: 'true' },
      }),
    ).toEqual({ kind: 'none' });
  });
});

describe('gateNonHomeMaintenance', () => {
  it('signals redirect-home for global mode', () => {
    expect(
      gateNonHomeMaintenance('/writing', { config: globalConfig, env: {} }),
    ).toEqual({
      redirectHome: true,
      decision: { kind: 'none' },
    });
  });

  it('passes through route and none decisions', () => {
    expect(
      gateNonHomeMaintenance('/writing', { config: routesConfig, env: {} }),
    ).toEqual({
      redirectHome: false,
      decision: {
        kind: 'route',
        configPath: '/writing',
        displayPath: '/writing',
        started: '2026-08-07',
      },
    });
    expect(
      gateNonHomeMaintenance('/profile', { config: routesConfig, env: {} }),
    ).toEqual({
      redirectHome: false,
      decision: { kind: 'none' },
    });
  });
});

describe('maintenance config source overrides', () => {
  it('reads MAINTENANCE_CONFIG_JSON', () => {
    const source = readMaintenanceConfigSource({
      MAINTENANCE_CONFIG_JSON: JSON.stringify({
        mode: 'global',
        started: '2026-01-02',
      }),
    });
    expect(loadMaintenanceConfig(source)).toEqual({
      mode: 'global',
      started: '2026-01-02',
    });
  });

  it('rejects invalid MAINTENANCE_CONFIG_JSON', () => {
    expect(() =>
      readMaintenanceConfigSource({ MAINTENANCE_CONFIG_JSON: '{not-json' }),
    ).toThrow(/valid JSON/);
  });

  it('reads MAINTENANCE_CONFIG_PATH fixture', () => {
    const source = readMaintenanceConfigSource({
      MAINTENANCE_CONFIG_PATH: 'e2e/fixtures/maintenance-routes.json',
    });
    const config = loadMaintenanceConfig(source);
    expect(config.mode).toBe('routes');
    if (config.mode === 'routes') {
      expect(config.routes[0]?.path).toBe('/writing');
    }
  });

  it('prefers JSON env over path env', () => {
    const source = readMaintenanceConfigSource({
      MAINTENANCE_CONFIG_JSON: JSON.stringify({ mode: 'off' }),
      MAINTENANCE_CONFIG_PATH: 'e2e/fixtures/maintenance-global.json',
    });
    expect(loadMaintenanceConfig(source)).toEqual({ mode: 'off' });
  });
});
