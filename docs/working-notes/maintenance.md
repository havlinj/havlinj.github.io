# Maintenance mode

Build-time switch for unavailable routes (and optional whole-site shutdown). Visitors get static HTML — there is **no runtime check** on each request, so page load time is unaffected.

Invalid config throws during `astro build` (schema is validated when `src/utils/maintenance.ts` loads).

## Config

`mode` is a discriminated union — global and routes cannot be set together.

Edit [`config/maintenance.json`](../config/maintenance.json) (JSONC — `//` and `/* */` comments allowed). The file header documents both scenarios; summary:

```json
{ "mode": "off" }
```

Route maintenance:

```json
{
  "mode": "routes",
  "routes": [
    { "path": "/writing", "match": "prefix" },
    { "path": "/contact/form", "match": "exact" }
  ]
}
```

Global shutdown (same Whoops panel and photo as route maintenance; nav labels omitted but the nav line is kept; footer starts at Credits):

```json
{ "mode": "global" }
```

Whole-site reconstruction (content panel + background photo; nav labels and footer omitted, nav line kept as empty space; other URLs redirect to `/`):

```json
{ "mode": "reconstruction" }
```

The reconstruction photo is `public/assets/pages/reconstruction/pexels-anastasia-shuraeva-5495064_dichrom_{720,900,1080,1440,1920,2400}.png` (`RECONSTRUCTION_PANEL_BG_STEM`). The 900 tier uses the same intrinsic widths as the hero.

| Field            | Meaning                                                               |
| ---------------- | --------------------------------------------------------------------- |
| `mode`           | `"off"` \| `"global"` \| `"reconstruction"` \| `"routes"` (required). |
| `routes`         | Only with `mode=routes`. Non-empty array (required).                  |
| `routes[].path`  | URL path starting with `/`.                                           |
| `routes[].match` | `"prefix"` or `"exact"`.                                              |

Every required field must be present with a real value — `null` / omitted keys / unknown keys fail the build.

### Test overrides

- `MAINTENANCE_CONFIG_PATH` — load JSON from a file (used by e2e fixtures).
- `MAINTENANCE_CONFIG_JSON` — inline JSON string (wins over path).
- `MAINTENANCE_FORCE_OFF=1` — ignore config (CI default).

Per-route pages keep the normal site header/footer, use the **Whoops** page title, and show the notice inside the usual content panel (photo behind the copy). The copy band is centered on the panel. Reconstruction stays on the upper third. Global mode uses the same band as route maintenance.

`mode=reconstruction` is the whole-site variant of that panel: home renders only the square content panel (photo from `public/assets/pages/reconstruction/`), the header labels are not shown but the header still occupies its usual line plus `--page-nav-margin-bottom`, and the footer is omitted. Every other URL redirects to `/`, same as `mode=global`.

## Local development while a route is listed

```bash
MAINTENANCE_FORCE_OFF=1 npm run dev
```

CI / Playwright / Lighthouse set `MAINTENANCE_FORCE_OFF=1` so the full site is always exercised. The Pages deploy build does **not** set that flag, so production respects `maintenance.json`.

Maintenance coverage: unit (`tests/unit/maintenance.test.ts`), build HTML (`tests/integration/maintenance-build.test.ts`), browser (`e2e/maintenance-routes.spec.ts` / `e2e/maintenance-global.spec.ts` / `e2e/maintenance-reconstruction.spec.ts` via `playwright.maintenance.config.ts`). The reconstruction panel screenshot is refreshed by `scripts/web/update-playwright-snapshots.sh`.
