import { EmailMessage } from 'cloudflare:email';
import { createMimeMessage, Mailbox } from 'mimetext/browser';
import { contactError } from './contact-errors.js';

const DEFAULT_FROM = 'noreply@janhavlin.com';
const DEFAULT_TO = 'hello@janhavlin.com';

function makeRequestId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }
}

function safeErrorMessage(error) {
  if (error instanceof Error && error.message) return error.message;
  return String(error ?? 'unknown_error');
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function countUrls(text) {
  const matches = text.match(/https?:\/\/|www\./gi);
  return matches ? matches.length : 0;
}

async function verifyTurnstileToken({ token, ip, secret }) {
  const formData = new FormData();
  formData.append('secret', secret);
  formData.append('response', token);

  if (ip) {
    formData.append('remoteip', ip);
  }

  const response = await fetch(
    'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    {
      method: 'POST',
      body: formData,
    },
  );

  return response.json();
}

export default {
  async fetch(request, env) {
    const requestId = makeRequestId();
    const log = (event, extra = {}) => {
      console.log(
        JSON.stringify({
          at: new Date().toISOString(),
          event,
          requestId,
          ...extra,
        }),
      );
    };
    const json = (body, init = {}) => {
      const headers = new Headers(init.headers || {});
      headers.set('x-contact-request-id', requestId);
      return Response.json({ requestId, ...body }, { ...init, headers });
    };

    const url = new URL(request.url);

    if (url.pathname === '/test') {
      return json({
        status: 'ok',
        worker: 'contact-worker',
      });
    }

    if (url.pathname !== '/api/contact') {
      log('not_found', { pathname: url.pathname, method: request.method });
      return new Response('Not found', { status: 404 });
    }

    if (request.method !== 'POST') {
      log('method_not_allowed', { method: request.method });
      return new Response('Method not allowed', { status: 405 });
    }

    const origin = request.headers.get('Origin') || '';
    const allowedOrigins = [
      'https://janhavlin.com',
      'https://www.janhavlin.com',
    ];

    if (!allowedOrigins.includes(origin)) {
      log('forbidden_origin', { origin });
      return new Response('Forbidden', { status: 403 });
    }

    const form = await request.formData();

    const name = String(form.get('name') || '').trim();
    const email = String(form.get('email') || '').trim();
    const message = String(form.get('message') || '').trim();
    const company = String(form.get('company') || '').trim();
    const turnstileToken = String(
      form.get('cf-turnstile-response') || '',
    ).trim();
    log('request_received', {
      origin,
      nameLen: name.length,
      emailLen: email.length,
      messageLen: message.length,
      companyLen: company.length,
      hasTurnstileToken: turnstileToken.length > 0,
    });

    // Honeypot
    if (company) {
      log('honeypot_triggered', { companyLen: company.length });
      return json({ ok: true });
    }

    if (!name || !email || !message) {
      log('validation_failed_missing_fields');
      return json(contactError('missing_fields'), { status: 400 });
    }

    if (name.length > 100) {
      log('validation_failed_name_length', { nameLen: name.length });
      return json(contactError('name_too_long'), { status: 400 });
    }

    if (!validEmail(email)) {
      log('validation_failed_email_format');
      return json(contactError('invalid_email'), { status: 400 });
    }

    if (message.length < 10 || message.length > 5000) {
      log('validation_failed_message_length', { messageLen: message.length });
      return json(contactError('message_length'), { status: 400 });
    }

    if (countUrls(message) > 3) {
      log('validation_failed_spam_url_count', { urlCount: countUrls(message) });
      return json(contactError('spam_urls'), { status: 400 });
    }

    if (!turnstileToken) {
      log('validation_failed_missing_turnstile');
      return json(contactError('turnstile_missing', { resetTurnstile: true }), {
        status: 400,
      });
    }

    const clientIp =
      request.headers.get('CF-Connecting-IP') ||
      request.headers.get('x-forwarded-for') ||
      '';

    let turnstileResult;
    try {
      turnstileResult = await verifyTurnstileToken({
        token: turnstileToken,
        ip: clientIp,
        secret: env.TURNSTILE_SECRET,
      });
      log('turnstile_verified', {
        success: !!turnstileResult?.success,
        errorCodes: Array.isArray(turnstileResult?.['error-codes'])
          ? turnstileResult['error-codes']
          : [],
      });
    } catch (error) {
      log('turnstile_verification_error', {
        error: safeErrorMessage(error),
      });
      return json(
        contactError('turnstile_unavailable', { resetTurnstile: true }),
        { status: 500 },
      );
    }

    if (!turnstileResult.success) {
      return json(contactError('turnstile_failed', { resetTurnstile: true }), {
        status: 400,
      });
    }

    const fromAddr = env.CONTACT_FROM || DEFAULT_FROM;
    const toAddr = env.CONTACT_TO || DEFAULT_TO;

    const msg = createMimeMessage();

    msg.setSender({
      name: 'janhavlin.com – contact form',
      addr: fromAddr,
    });

    msg.setRecipient(toAddr);
    msg.setHeader(
      'Reply-To',
      new Mailbox({ name, addr: email }, { type: 'Reply-To' }),
    );
    msg.setSubject(`Contact form: ${name}`);

    msg.addMessage({
      contentType: 'text/plain',
      data: `New message from the contact form on janhavlin.com

Name: ${name}
Email: ${email}

Message:
${message}

---
Reply to this email to respond directly to ${name}.`,
    });

    const emailMessage = new EmailMessage(fromAddr, toAddr, msg.asRaw());

    try {
      log('email_send_attempt');
      await env.CONTACT_EMAIL.send(emailMessage);
      log('email_send_success');
      return json({ ok: true });
    } catch (error) {
      log('email_send_error', {
        error: safeErrorMessage(error),
      });
      return json(contactError('send_failed'), { status: 500 });
    }
  },
};
