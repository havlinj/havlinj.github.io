import { describe, expect, it } from 'vitest';
import {
  CONTACT_ERROR_CODES,
  CONTACT_ERROR_MESSAGES,
  CONTACT_STATUS_LAYOUT,
  CONTACT_STATUS_MESSAGES,
  CONTACT_UI_STATUS_CODES,
  estimateLineCount,
  isContactErrorCode,
  isContactStatusCode,
  messageForContactStatus,
  resolveContactStatusFromApi,
} from '../../src/lib/contact-status';

describe('contact-status registry', () => {
  it('lists every error code with a non-empty message', () => {
    for (const code of CONTACT_ERROR_CODES) {
      expect(CONTACT_ERROR_MESSAGES[code].trim().length).toBeGreaterThan(0);
      expect(messageForContactStatus(code)).toBe(CONTACT_ERROR_MESSAGES[code]);
    }
  });

  it('covers all status codes in CONTACT_STATUS_MESSAGES', () => {
    const codes = [...CONTACT_ERROR_CODES, ...CONTACT_UI_STATUS_CODES];
    expect(Object.keys(CONTACT_STATUS_MESSAGES).sort()).toEqual(
      [...codes].sort(),
    );
  });

  it('resolves API payloads by code and legacy error string', () => {
    expect(resolveContactStatusFromApi({ ok: true })).toBe('success');
    expect(
      resolveContactStatusFromApi({ ok: false, code: 'invalid_email' }),
    ).toBe('invalid_email');
    expect(
      resolveContactStatusFromApi({
        ok: false,
        error: 'Invalid email address.',
      }),
    ).toBe('invalid_email');
    expect(resolveContactStatusFromApi({ ok: false, error: 'mystery' })).toBe(
      'unknown',
    );
  });

  it('type guards distinguish error codes', () => {
    expect(isContactErrorCode('send_failed')).toBe(true);
    expect(isContactErrorCode('success')).toBe(false);
    expect(isContactStatusCode('network_error')).toBe(true);
  });
});

describe('contact-status layout budget', () => {
  it('each error message fits within the two-line char budget', () => {
    const { charsPerLineBudget, statusMaxLines } = CONTACT_STATUS_LAYOUT;

    for (const code of CONTACT_ERROR_CODES) {
      const lines = estimateLineCount(
        CONTACT_ERROR_MESSAGES[code],
        charsPerLineBudget,
      );
      expect(
        lines,
        `"${code}" wraps to ${lines} lines at ${charsPerLineBudget} chars/line`,
      ).toBeLessThanOrEqual(statusMaxLines);
    }
  });
});
