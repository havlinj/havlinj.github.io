/** Single source for API error codes shared by the site and contact worker. */

export const CONTACT_ERROR_CODES = [
  'missing_fields',
  'name_too_long',
  'invalid_email',
  'message_length',
  'spam_urls',
  'turnstile_missing',
  'turnstile_unavailable',
  'turnstile_failed',
  'send_failed',
];

/** @type {Record<(typeof CONTACT_ERROR_CODES)[number], string>} */
export const CONTACT_ERROR_MESSAGES = {
  missing_fields: 'Please fill in all fields.',
  name_too_long: 'Name is too long.',
  invalid_email: 'Invalid email address.',
  message_length: 'Message must be between 10 and 5000 characters.',
  spam_urls: 'Your message looks like spam.',
  turnstile_missing: 'Please complete the verification.',
  turnstile_unavailable: 'Verification unavailable. Please try again.',
  turnstile_failed: 'Verification failed. Please try again.',
  send_failed: 'Failed to send message.',
};

/**
 * @param {keyof typeof CONTACT_ERROR_MESSAGES} code
 * @param {Record<string, unknown>} [extra]
 */
export function contactError(code, extra = {}) {
  return {
    ok: false,
    code,
    error: CONTACT_ERROR_MESSAGES[code],
    ...extra,
  };
}
