import { describe, expect, it } from 'vitest';
import {
  assertValidConfig,
  findUnavailableRoute,
  formatMaintenanceStartedDate,
  isMaintenanceForcedOff,
  loadMaintenanceConfig,
  normalizeRoutePath,
  resolveMaintenance,
  type MaintenanceConfigFile,
} from '../../src/utils/maintenance';

const sampleConfig: MaintenanceConfigFile = {
  global: null,
  routes: [
    { path: '/writing', started: '2026-08-07', match: 'prefix' },
    { path: '/contact/form', started: '2026-08-08', match: 'exact' },
  ],
};

describe('maintenance utils', () => {
  it('normalizes paths', () => {
    expect(normalizeRoutePath('/writing/')).toBe('/writing');
    expect(normalizeRoutePath('writing')).toBe('/writing');
    expect(normalizeRoutePath('/')).toBe('/');
  });

  it('formats started dates as YY.MM.DD.', () => {
    expect(formatMaintenanceStartedDate('2026-08-07')).toBe('26.08.07.');
  });

  it('rejects invalid started dates', () => {
    expect(() => formatMaintenanceStartedDate('08/07/2026')).toThrow(
      /YYYY-MM-DD/,
    );
  });

  it('matches prefix routes and prefers the longest match', () => {
    const config = loadMaintenanceConfig({
      global: null,
      routes: [
        { path: '/contact', started: '2026-08-01', match: 'prefix' },
        { path: '/contact/form', started: '2026-08-02', match: 'prefix' },
      ],
    });
    const hit = findUnavailableRoute('/contact/form', config);
    expect(hit?.path).toBe('/contact/form');
    expect(findUnavailableRoute('/contact', config)?.path).toBe('/contact');
    expect(findUnavailableRoute('/writing', config)).toBeNull();
  });

  it('respects exact match mode', () => {
    const config = loadMaintenanceConfig(sampleConfig);
    expect(findUnavailableRoute('/contact/form', config)?.path).toBe(
      '/contact/form',
    );
    expect(findUnavailableRoute('/contact/form/extra', config)).toBeNull();
    expect(findUnavailableRoute('/writing/extra', config)?.path).toBe(
      '/writing',
    );
  });

  it('resolves global shutdown before route checks', () => {
    const decision = resolveMaintenance('/profile', {
      config: {
        global: { started: '2026-08-07' },
        routes: [{ path: '/profile', started: '2026-01-01', match: 'prefix' }],
      },
      env: {},
    });
    expect(decision).toEqual({
      kind: 'global',
      started: '2026-08-07',
    });
  });

  it('resolves a route notice with the visited path', () => {
    const decision = resolveMaintenance('/writing/', {
      config: sampleConfig,
      env: {},
    });
    expect(decision).toEqual({
      kind: 'route',
      configPath: '/writing',
      displayPath: '/writing',
      started: '2026-08-07',
    });
  });

  it('force-off disables all maintenance decisions', () => {
    expect(isMaintenanceForcedOff({ MAINTENANCE_FORCE_OFF: '1' })).toBe(true);
    expect(
      resolveMaintenance('/writing', {
        config: sampleConfig,
        env: { MAINTENANCE_FORCE_OFF: '1' },
      }),
    ).toEqual({ kind: 'none' });
    expect(
      resolveMaintenance('/', {
        config: { global: { started: '2026-08-07' }, routes: [] },
        env: { MAINTENANCE_FORCE_OFF: 'true' },
      }),
    ).toEqual({ kind: 'none' });
  });

  it('loads the repo maintenance.json schema', () => {
    const config = loadMaintenanceConfig();
    expect(config.global).toBeNull();
    expect(Array.isArray(config.routes)).toBe(true);
  });

  it('rejects null or missing required fields (build-time contract)', () => {
    expect(() =>
      assertValidConfig({
        global: { started: null },
        routes: [],
      }),
    ).toThrow(/global\.started must not be null/);

    expect(() =>
      assertValidConfig({
        global: {},
        routes: [],
      }),
    ).toThrow(/global\.started is required/);

    expect(() =>
      assertValidConfig({
        global: null,
        routes: [{ path: '/writing', started: '2026-08-07' }],
      }),
    ).toThrow(/routes\[0\]\.match is required/);

    expect(() =>
      assertValidConfig({
        global: null,
        routes: [{ path: '/writing', started: null, match: 'prefix' }],
      }),
    ).toThrow(/routes\[0\]\.started must not be null/);

    expect(() =>
      assertValidConfig({
        global: false,
        routes: [],
      }),
    ).toThrow(/global" must be null or/);
  });
});
