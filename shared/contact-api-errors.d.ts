export declare const CONTACT_ERROR_CODES: readonly [
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

export type ContactApiErrorCode = (typeof CONTACT_ERROR_CODES)[number];

export declare const CONTACT_ERROR_MESSAGES: Record<
  ContactApiErrorCode,
  string
>;

export declare function contactError(
  code: ContactApiErrorCode,
  extra?: Record<string, unknown>,
): {
  ok: false;
  code: ContactApiErrorCode;
  error: string;
} & Record<string, unknown>;
