import { describe, expect, it } from 'vitest';
import {
  CONTACT_ERROR_CODES,
  CONTACT_ERROR_MESSAGES,
} from '../../src/lib/contact-status';
import {
  CONTACT_ERROR_CODES as WORKER_ERROR_CODES,
  CONTACT_ERROR_MESSAGES as WORKER_ERROR_MESSAGES,
} from '../../../contact_worker/worker/contact-errors.js';

describe('contact error registry sync (site ↔ worker)', () => {
  it('uses the same error codes in the same order', () => {
    expect([...WORKER_ERROR_CODES]).toEqual([...CONTACT_ERROR_CODES]);
  });

  it('uses identical user-facing messages for every code', () => {
    for (const code of CONTACT_ERROR_CODES) {
      expect(WORKER_ERROR_MESSAGES[code]).toBe(CONTACT_ERROR_MESSAGES[code]);
    }
  });
});
