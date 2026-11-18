import { describe, expect, it } from 'vitest';
import {
  evaluateAudit,
  exceptionStaleReason,
  PICOMATCH_AUDIT_EXCEPTION,
} from '../../scripts/ci/audit-high.mjs';

const picomatchVia = {
  severity: 'high',
  title: 'picomatch ReDoS',
  url: `https://github.com/advisories/${PICOMATCH_AUDIT_EXCEPTION.id}`,
};

const openException = {
  patchedVersions: [] as string[],
  registryLatest: PICOMATCH_AUDIT_EXCEPTION.acceptedLatest,
};

function reportWith(via: object[]) {
  return { vulnerabilities: { picomatch: { via } } };
}

describe('picomatch audit exception', () => {
  it('accepts the advisory while no patched release exists', () => {
    const result = evaluateAudit(reportWith([picomatchVia]), openException);
    expect(result.ok).toBe(true);
    expect(result.notes[0]).toContain(PICOMATCH_AUDIT_EXCEPTION.id);
    expect(result.notes[0]).toContain('fails on its own');
  });

  it('fails when the advisory drops out of npm audit', () => {
    const result = evaluateAudit({ vulnerabilities: {} }, openException);
    expect(result.ok).toBe(false);
    expect(result.blocking[0]).toContain('no longer reported');
    expect(result.blocking[0]).toContain('audit-high.mjs');
  });

  it('fails when the advisory names a patched picomatch', () => {
    const reason = exceptionStaleReason(true, {
      patchedVersions: ['4.0.8'],
      registryLatest: '4.0.7',
    });
    expect(reason).toContain('picomatch@4.0.8');
    expect(reason).toContain('delete the exception');
  });

  it('fails when the registry moves past the accepted picomatch and the advisory feed is down', () => {
    const reason = exceptionStaleReason(true, {
      patchedVersions: null,
      registryLatest: '4.0.8',
    });
    expect(reason).toContain('picomatch@4.0.8');
    expect(reason).toContain(PICOMATCH_AUDIT_EXCEPTION.acceptedLatest);
  });

  it('stays closed when the patch check cannot be completed', () => {
    const reason = exceptionStaleReason(true, {
      patchedVersions: null,
      registryLatest: null,
    });
    expect(reason).toContain('Could not verify');
  });

  it('still fails on any other high advisory', () => {
    const result = evaluateAudit(
      reportWith([
        picomatchVia,
        {
          severity: 'high',
          title: 'other',
          url: 'https://github.com/advisories/GHSA-other-other-other',
        },
      ]),
      openException,
    );
    expect(result.ok).toBe(false);
    expect(result.blocking.join('\n')).toContain('GHSA-other-other-other');
  });
});
