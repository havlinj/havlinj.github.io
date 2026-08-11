# Maintenance mode

Build-time switch for unavailable routes (and optional whole-site shutdown). Visitors get static HTML — there is **no runtime check** on each request, so page load time is unaffected.

Invalid config throws during `astro build` (schema is validated when `src/utils/maintenance.ts` loads).

## Config

Edit [`src/config/maintenance.json`](../src/config/maintenance.json):

```json
{
  "global": null,
  "routes": [
    { "path": "/writing", "started": "2026-08-07", "match": "prefix" },
    { "path": "/contact/form", "started": "2026-08-08", "match": "exact" }
  ]
}
```

Global shutdown:

```json
{
  "global": { "started": "2026-08-07" },
  "routes": []
}
```

| Field              | Meaning                                                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `global`           | `null` = site open. Object `{ "started": "YYYY-MM-DD" }` = whole-site maintenance (home notice; other routes redirect to `/`). |
| `routes[].path`    | URL path starting with `/` (required, non-null).                                                                               |
| `routes[].started` | `YYYY-MM-DD` (required, non-null); rendered as `YY.MM.DD.`                                                                     |
| `routes[].match`   | `"prefix"` or `"exact"` (required, non-null). Prefix: `/contact` also covers `/contact/form`.                                  |

Every listed field must be present with a real value — `null` / omitted keys fail the build.

Per-route pages keep the normal site header/footer, use the **Whoops** page title, and show the notice inside the usual square panel (global page background, no photo).

## Local development while a route is listed

```bash
MAINTENANCE_FORCE_OFF=1 npm run dev
```

CI / Playwright / Lighthouse set `MAINTENANCE_FORCE_OFF=1` so the full site is always exercised. The Pages deploy build does **not** set that flag, so production respects `maintenance.json`.
