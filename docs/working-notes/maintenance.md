# Maintenance mode

Build-time switch for unavailable routes (and optional whole-site shutdown). Visitors get static HTML — there is **no runtime check** on each request, so page load time is unaffected.

Invalid config throws during `astro build` (schema is validated when `src/utils/maintenance.ts` loads).

## Config

`mode` is a discriminated union — global and routes cannot be set together.

Edit [`config/maintenance.json`](../config/maintenance.json):

```json
{ "mode": "off" }
```

Route maintenance:

```json
{
  "mode": "routes",
  "routes": [
    { "path": "/writing", "started": "2026-08-07", "match": "prefix" },
    { "path": "/contact/form", "started": "2026-08-08", "match": "exact" }
  ]
}
```

Global shutdown:

```json
{
  "mode": "global",
  "started": "2026-08-07"
}
```

| Field              | Meaning                                              |
| ------------------ | ---------------------------------------------------- |
| `mode`             | `"off"` \| `"global"` \| `"routes"` (required).      |
| `started`          | Only with `mode=global`. `YYYY-MM-DD` (required).    |
| `routes`           | Only with `mode=routes`. Non-empty array (required). |
| `routes[].path`    | URL path starting with `/`.                          |
| `routes[].started` | `YYYY-MM-DD`; rendered as `YY.MM.DD.`                |
| `routes[].match`   | `"prefix"` or `"exact"`.                             |

Every required field must be present with a real value — `null` / omitted keys / unknown keys fail the build.

### Test overrides

- `MAINTENANCE_CONFIG_PATH` — load JSON from a file (used by e2e fixtures).
- `MAINTENANCE_CONFIG_JSON` — inline JSON string (wins over path).
- `MAINTENANCE_FORCE_OFF=1` — ignore config (CI default).

Per-route pages keep the normal site header/footer, use the **Whoops** page title, and show the notice inside the usual square panel (global page background, no photo).

## Local development while a route is listed

```bash
MAINTENANCE_FORCE_OFF=1 npm run dev
```

CI / Playwright / Lighthouse set `MAINTENANCE_FORCE_OFF=1` so the full site is always exercised. The Pages deploy build does **not** set that flag, so production respects `maintenance.json`.

Maintenance coverage: unit (`tests/unit/maintenance.test.ts`), build HTML (`tests/integration/maintenance-build.test.ts`), browser (`e2e/maintenance-routes.spec.ts` / `e2e/maintenance-global.spec.ts` via `playwright.maintenance.config.ts`).
