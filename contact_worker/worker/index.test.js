import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('cloudflare:email', () => {
  return {
    EmailMessage: class {
      constructor(from, to, raw) {
        this.from = from;
        this.to = to;
        this.raw = raw;
      }
    },
  };
});

import worker from './index.js';

function makeEnv(overrides = {}) {
  return {
    TURNSTILE_SECRET: 'test-secret',
    CONTACT_EMAIL: { send: vi.fn() },
    ...overrides,
  };
}

function validFormData() {
  const fd = new FormData();
  fd.set('name', 'Test User');
  fd.set('email', 'test@example.com');
  fd.set('message', 'Hello there, this is valid.');
  fd.set('cf-turnstile-response', 'dummy-token');
  return fd;
}

async function callWorker(
  path,
  {
    method = 'POST',
    origin = 'https://janhavlin.com',
    formData,
    envOverrides,
    headers = {},
  } = {},
) {
  const url = `https://janhavlin.com${path}`;
  const options = {
    method,
    headers: {
      Origin: origin,
      ...headers,
    },
  };
  if (formData) {
    options.body = formData;
  }
  const req = new Request(url, options);
  const env = makeEnv(envOverrides);

  return worker.fetch(req, env);
}

beforeEach(() => {
  vi.resetAllMocks();
  // default mock pro Turnstile (success)
  global.fetch = vi.fn(
    async () =>
      new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
      }),
  );
});

describe('healthcheck /test', () => {
  it('returns ok status', async () => {
    const res = await callWorker('/test', { method: 'GET' });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('ok');
    expect(json.worker).toBe('contact-worker');
  });
});

describe('/api/contact routing', () => {
  it('returns 404 for other paths', async () => {
    const res = await callWorker('/something-else', { method: 'GET' });
    expect(res.status).toBe(404);
  });

  it('returns 405 for non-POST methods', async () => {
    const res = await callWorker('/api/contact', { method: 'GET' });
    expect(res.status).toBe(405);
  });
});

describe('/api/contact validation', () => {
  it('accepts allowed www origin', async () => {
    const res = await callWorker('/api/contact', {
      origin: 'https://www.janhavlin.com',
      formData: validFormData(),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it('rejects disallowed origin', async () => {
    const res = await callWorker('/api/contact', {
      origin: 'https://evil.com',
    });
    expect(res.status).toBe(403);
  });

  it('rejects when required fields are missing', async () => {
    const fd = new FormData();
    const res = await callWorker('/api/contact', { formData: fd });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.code).toBe('missing_fields');
    expect(json.error).toMatch(/fill in all fields/i);
  });

  it('rejects when name is too long', async () => {
    const fd = validFormData();
    fd.set('name', 'a'.repeat(101));
    const res = await callWorker('/api/contact', { formData: fd });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.code).toBe('name_too_long');
    expect(json.error).toMatch(/name is too long/i);
  });

  it('rejects invalid email format', async () => {
    const fd = validFormData();
    fd.set('email', 'not-an-email');
    const res = await callWorker('/api/contact', { formData: fd });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.code).toBe('invalid_email');
    expect(json.error).toMatch(/invalid email/i);
  });

  it('rejects when message is too short', async () => {
    const fd = validFormData();
    fd.set('message', 'short');
    const res = await callWorker('/api/contact', { formData: fd });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.code).toBe('message_length');
    expect(json.error).toMatch(/between 10 and 5000/i);
  });

  it('rejects when message is too long', async () => {
    const fd = validFormData();
    fd.set('message', 'x'.repeat(5001));
    const res = await callWorker('/api/contact', { formData: fd });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.code).toBe('message_length');
    expect(json.error).toMatch(/between 10 and 5000/i);
  });

  it('rejects spammy message with too many links', async () => {
    const fd = validFormData();
    fd.set(
      'message',
      'See http://a.com and http://b.com and http://c.com and http://d.com',
    );
    const res = await callWorker('/api/contact', { formData: fd });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.code).toBe('spam_urls');
    expect(json.error).toMatch(/looks like spam/i);
  });

  it('treats filled honeypot as ok but does not send email', async () => {
    const fd = new FormData();
    fd.set('name', 'Test');
    fd.set('email', 'test@example.com');
    fd.set('message', 'Hello there, this is valid.');
    fd.set('company', 'Bot Ltd');
    fd.set('cf-turnstile-response', 'dummy');

    const env = makeEnv();
    const res = await worker.fetch(
      new Request('https://janhavlin.com/api/contact', {
        method: 'POST',
        headers: { Origin: 'https://janhavlin.com' },
        body: fd,
      }),
      env,
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(env.CONTACT_EMAIL.send).not.toHaveBeenCalled();
  });

  it('rejects when Turnstile token is missing', async () => {
    const fd = new FormData();
    fd.set('name', 'Test');
    fd.set('email', 'test@example.com');
    fd.set('message', 'Hello there, this is valid.');

    const res = await callWorker('/api/contact', { formData: fd });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.code).toBe('turnstile_missing');
    expect(json.resetTurnstile).toBe(true);
  });

  it('rejects when Turnstile verification fails', async () => {
    global.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ success: false }), {
          headers: { 'Content-Type': 'application/json' },
        }),
    );

    const fd = new FormData();
    fd.set('name', 'Test');
    fd.set('email', 'test@example.com');
    fd.set('message', 'Hello there, this is valid.');
    fd.set('cf-turnstile-response', 'dummy');

    const res = await callWorker('/api/contact', { formData: fd });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.code).toBe('turnstile_failed');
    expect(json.resetTurnstile).toBe(true);
  });

  it('returns 500 when Turnstile verification request fails', async () => {
    global.fetch = vi.fn(async () => {
      throw new Error('turnstile unavailable');
    });

    const res = await callWorker('/api/contact', { formData: validFormData() });
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.code).toBe('turnstile_unavailable');
    expect(json.error).toMatch(/verification unavailable/i);
    expect(json.resetTurnstile).toBe(true);
  });

  it('passes token, secret, and client ip to Turnstile verify', async () => {
    let verifyRequest;
    global.fetch = vi.fn(async (input, init) => {
      verifyRequest = { input, init };
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const fd = validFormData();
    const res = await callWorker('/api/contact', {
      formData: fd,
      headers: { 'CF-Connecting-IP': '203.0.113.9' },
      envOverrides: { TURNSTILE_SECRET: 'secret-from-env' },
    });
    expect(res.status).toBe(200);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(String(verifyRequest.input)).toBe(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    );
    expect(verifyRequest.init.method).toBe('POST');
    const body = verifyRequest.init.body;
    expect(body.get('secret')).toBe('secret-from-env');
    expect(body.get('response')).toBe('dummy-token');
    expect(body.get('remoteip')).toBe('203.0.113.9');
  });
});

describe('/api/contact email sending', () => {
  it('sends email and returns ok on valid input', async () => {
    const fd = new FormData();
    fd.set('name', 'Test');
    fd.set('email', 'test@example.com');
    fd.set('message', 'Hello there, this is valid.');
    fd.set('cf-turnstile-response', 'dummy');

    const env = makeEnv();
    const req = new Request('https://janhavlin.com/api/contact', {
      method: 'POST',
      headers: { Origin: 'https://janhavlin.com' },
      body: fd,
    });

    const res = await worker.fetch(req, env);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(env.CONTACT_EMAIL.send).toHaveBeenCalledTimes(1);

    const message = env.CONTACT_EMAIL.send.mock.calls[0][0];
    expect(message.from).toBe('noreply@janhavlin.com');
    expect(message.to).toBe('hello@janhavlin.com');
    expect(message.raw).toMatch(/Reply-To:/i);
    expect(message.raw).toMatch(/test@example\.com/);
  });

  it('returns 500 if sending fails', async () => {
    const fd = new FormData();
    fd.set('name', 'Test');
    fd.set('email', 'test@example.com');
    fd.set('message', 'Hello there, this is valid.');
    fd.set('cf-turnstile-response', 'dummy');

    const env = makeEnv({
      CONTACT_EMAIL: {
        send: vi.fn(() => {
          throw new Error('send failed');
        }),
      },
    });

    const req = new Request('https://janhavlin.com/api/contact', {
      method: 'POST',
      headers: { Origin: 'https://janhavlin.com' },
      body: fd,
    });

    const res = await worker.fetch(req, env);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.code).toBe('send_failed');
    expect(json.error).toMatch(/Failed to send message/i);
  });
});
