import {
  CONTACT_ERROR_CODES as SHARED_CONTACT_ERROR_CODES,
  CONTACT_ERROR_MESSAGES as SHARED_CONTACT_ERROR_MESSAGES,
} from '../../shared/contact-api-errors.mjs';

/** API error codes (shared/contact-api-errors.mjs ↔ contact_worker). */
export const CONTACT_ERROR_CODES = SHARED_CONTACT_ERROR_CODES;

export type ContactErrorCode = (typeof CONTACT_ERROR_CODES)[number];

export const CONTACT_UI_STATUS_CODES = [
  'sending',
  'success',
  'network_error',
  'unknown',
] as const;

export type ContactUiStatusCode = (typeof CONTACT_UI_STATUS_CODES)[number];

export type ContactStatusCode = ContactErrorCode | ContactUiStatusCode;

export const CONTACT_ERROR_MESSAGES: Record<ContactErrorCode, string> =
  SHARED_CONTACT_ERROR_MESSAGES;

export const CONTACT_UI_MESSAGES: Record<ContactUiStatusCode, string> = {
  sending: 'Sending...',
  success: 'Thanks! Your message has been sent.',
  network_error: 'Network error. Please try again.',
  unknown: 'Something went wrong.',
};

export const CONTACT_STATUS_MESSAGES: Record<ContactStatusCode, string> = {
  ...CONTACT_ERROR_MESSAGES,
  ...CONTACT_UI_MESSAGES,
};

/** Layout budget: must match src/styles/contact.css */
export const CONTACT_STATUS_LAYOUT = {
  sendButtonMaxHeightRem: 2,
  statusPadBlockRem: 0.15,
  statusPadInlineRem: 0.1,
  statusMaxLines: 2,
  statusFontSizeRem: 0.75,
  statusLineHeight: 1.25,
  /** Conservative chars/line for narrow slot beside Send (mobile). */
  charsPerLineBudget: 26,
} as const;

export function isContactErrorCode(code: string): code is ContactErrorCode {
  return (CONTACT_ERROR_CODES as readonly string[]).includes(code);
}

export function isContactStatusCode(code: string): code is ContactStatusCode {
  return code in CONTACT_STATUS_MESSAGES;
}

export function messageForContactStatus(code: ContactStatusCode): string {
  return CONTACT_STATUS_MESSAGES[code];
}

const LEGACY_ERROR_MESSAGE_TO_CODE: Record<string, ContactErrorCode> = {
  'Please fill in all fields.': 'missing_fields',
  'Name is too long.': 'name_too_long',
  'Invalid email address.': 'invalid_email',
  'Message must be between 10 and 5000 characters.': 'message_length',
  'Your message looks like spam.': 'spam_urls',
  'Please complete the verification.': 'turnstile_missing',
  'Verification unavailable. Please try again.': 'turnstile_unavailable',
  'Verification service unavailable. Please try again.':
    'turnstile_unavailable',
  'Verification failed. Please try again.': 'turnstile_failed',
  'Failed to send message.': 'send_failed',
};

export type ContactApiPayload = {
  ok?: boolean;
  code?: string;
  error?: string;
  resetTurnstile?: boolean;
};

export function resolveContactStatusFromApi(
  data: ContactApiPayload,
): ContactStatusCode {
  if (data.ok) return 'success';
  if (data.code && isContactStatusCode(data.code)) return data.code;
  if (data.error && data.error in LEGACY_ERROR_MESSAGE_TO_CODE) {
    return LEGACY_ERROR_MESSAGE_TO_CODE[data.error];
  }
  return 'unknown';
}

/** Word-wrap estimate for unit tests (not font-accurate). */
export function estimateLineCount(
  text: string,
  maxCharsPerLine: number = CONTACT_STATUS_LAYOUT.charsPerLineBudget,
): number {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 0;

  let lines = 1;
  let currentLen = 0;

  for (const word of words) {
    const wordLen = word.length;
    if (currentLen === 0) {
      currentLen = wordLen;
      continue;
    }
    if (currentLen + 1 + wordLen <= maxCharsPerLine) {
      currentLen += 1 + wordLen;
    } else {
      lines += 1;
      currentLen = wordLen;
    }
  }

  return lines;
}
