# janhavlin contact worker

Cloudflare Worker handling the contact form for **janhavlin.com**.

It lives in this monorepo under `contact_worker/`. API error codes and copy are defined once in `shared/contact-api-errors.mjs` (also used by the Astro site).

## Architecture

`/contact/form` → POST `/api/contact` → Cloudflare Worker → email

The static site is built from the repo root; this folder is only the Worker backend.

## Setup

From this directory:

```bash
npm ci
```

Add the Turnstile secret:

npx wrangler secret put TURNSTILE_SECRET

## Test

```bash
npm test -- --run
```

From the repo root, worker tests also run via `bash scripts/contact_worker/all.sh` or `npm run all:contact-worker`.

## Deploy

```bash
npx wrangler deploy
```

The Worker is exposed via the route:

https://janhavlin.com/api/contact

## Environment

Secrets stored in Cloudflare:

TURNSTILE_SECRET

Vars (in `wrangler.toml`):

- `CONTACT_FROM` – envelope/header From (default `noreply@janhavlin.com`)
- `CONTACT_TO` – must match `destination_address` in the send_email binding

### Deliverability (Proton / spam)

Contact notifications are sent **from** `noreply@janhavlin.com` **to** `hello@janhavlin.com`, with **Reply-To** set to the visitor’s address so you can reply in one click.

In Cloudflare **Email Routing**, add a custom address `noreply@janhavlin.com` (it does not need to forward anywhere; it only authorizes sending from that address).

Ensure Email Routing DNS (SPF/DKIM) stays enabled for `janhavlin.com`. In Proton, mark the first message as “Not spam” and optionally add a filter for `From: noreply@janhavlin.com`.
