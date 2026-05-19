import { describe, expect, it } from 'vitest';
import {
  CONTACT_ERROR_CODES,
  CONTACT_ERROR_MESSAGES,
} from '../../shared/contact-api-errors.mjs';
import {
  CONTACT_ERROR_CODES as SITE_ERROR_CODES,
  CONTACT_ERROR_MESSAGES as SITE_ERROR_MESSAGES,
} from '../../src/lib/contact-status';
import {
  CONTACT_ERROR_CODES as WORKER_ERROR_CODES,
  CONTACT_ERROR_MESSAGES as WORKER_ERROR_MESSAGES,
} from '../../contact_worker/worker/contact-errors.js';

describe('contact API errors (shared ↔ site ↔ worker)', () => {
  it('site re-exports the shared registry', () => {
    expect([...SITE_ERROR_CODES]).toEqual([...CONTACT_ERROR_CODES]);
    for (const code of CONTACT_ERROR_CODES) {
      expect(SITE_ERROR_MESSAGES[code]).toBe(CONTACT_ERROR_MESSAGES[code]);
    }
  });

  it('worker re-exports the shared registry', () => {
    expect([...WORKER_ERROR_CODES]).toEqual([...CONTACT_ERROR_CODES]);
    for (const code of CONTACT_ERROR_CODES) {
      expect(WORKER_ERROR_MESSAGES[code]).toBe(CONTACT_ERROR_MESSAGES[code]);
    }
  });
});
