# Contact landing — intro box restore

The `/contact` landing panel currently shows **links only** (Message / GitHub / LinkedIn).
The intro inset rectangle was removed for a cleaner hierarchy-page look.
This note records the last known proportions and wiring so the intro can be restored
and behave as before.

## Last copy (at removal)

```text
Interesting project? Let’s work together.
```

Markup used a mild prompt emphasis:

```html
<p class="contact-page__intro">
  <span class="contact-page__intro-prompt">Interesting project?</span>
  Let’s work together.
</p>
```

## Markup to re-insert

Place **before** `.contact-page__inset-rect--links` inside `.contact-page__fit-content`
in `src/pages/contact.astro`:

```html
<div class="contact-page__inset-rect contact-page__inset-rect--intro">
  <p class="contact-page__intro">
    <span class="contact-page__intro-prompt">Interesting project?</span>
    Let’s work together.
  </p>
</div>
```

`contact-layout-fit.ts` already supports an optional intro node: when
`.contact-page__inset-rect--intro` is present again, it resumes the intro+links
vertical stack math automatically.

## Panel / inset proportions (restore contract)

From `src/constants/contact-layout.ts` + `src/styles/contact.css` (keep in sync):

| Token / rule                       | Value                                          | Role                                                       |
| ---------------------------------- | ---------------------------------------------- | ---------------------------------------------------------- |
| `CONTACT_LAYOUT.insetPanelPadFrac` | `0.1`                                          | Panel inset pad fraction (matches `--panel-padding-*` 10%) |
| `--panel-padding-top` / `left`     | `10%`                                          | Panel content inset                                        |
| `--panel-padding-bottom`           | `24%`                                          | Space below last row                                       |
| `--contact-links-width`            | `38%`                                          | Links column width (right-aligned)                         |
| Intro width                        | `calc(100% - var(--panel-padding-left))`       | Full remaining panel width                                 |
| Intro position                     | `top: var(--contact-intro-top-px)`; `right: 0` | Set by fit JS                                              |
| Links position                     | `top: var(--contact-links-top-px)`; `right: 0` | Set by fit JS                                              |
| Intro→links gap                    | `computeIntroLinksGapPx(introH, panelEdge)`    | See below                                                  |

### Intro→links gap formula

```ts
gap = round(
  max(
    introLinksGapMinPx, // 32
    min(
      introOuterH * introLinksGapIntroHeightRatio, // 0.74
      panelEdge * introLinksGapPanelRatio, // 0.072
    ),
  ),
);
```

Constants (`CONTACT_LAYOUT`):

- `introLinksGapMinPx: 32`
- `introLinksGapIntroHeightRatio: 0.74`
- `introLinksGapPanelRatio: 0.072`

### Vertical placement (fit JS)

With intro present:

```text
--contact-intro-top-px = panel padding-top (px)
--contact-links-top-px = introTop + introOuterHeight + introLinksGap
```

Needed height for fit passes:

```text
topPad + introH + introLinksGap + linksH + topPad + fitSafetyYPx
```

Needed width:

```text
max(introW, linksW) + leftPad + fitSafetyXPx
```

Safety: `fitSafetyXPx: 2`, `fitSafetyYPx: 6`.

Without intro (current): links stack center sits at **25% of panel height from the bottom**
(`CONTACT_LAYOUT.linksCenterFromBottomRatio = 0.25`):

```text
centerYFromTop = panelHeight * (1 - 0.25)
--contact-links-top-px = clamp(round(centerYFromTop - linksH / 2))
--contact-links-y-transform = none
```

CSS fallback before fit / noscript: `top: 75%` + `translateY(-50%)`.

## Intro box CSS (kept in `contact.css`)

These rules remain in the stylesheet even while markup is absent:

- `.contact-page__inset-rect--intro` padding (roomier inset):
  - `--contact-intro-pad-left: clamp(0.74rem, 0.56rem + 2.05vw, 1.02rem)`
  - `--contact-intro-pad-right: clamp(1.02rem, 0.82rem + 2.35vw, 1.42rem)`
  - `--contact-intro-pad-top: clamp(0.88rem, 0.62rem + 1.45vw, 1.32rem)`
  - `--contact-intro-pad-bottom: clamp(0.86rem, 0.66rem + 1.8vw, 1.28rem)`
- Gap between multi-line intro paragraphs: `clamp(0.72em, 0.58rem + 1.35vw, 0.98em)`
- `.contact-page__intro`: weight `500`, `line-height: 1.52`, `letter-spacing: 0.018em`
- `.contact-page__intro-prompt`: weight `600`, `font-size: 1.045em`, `letter-spacing: 0.02em`
- Narrow (`max-width: 36rem`): intro weight stays `500` (see `CONTACT_PANEL_INTRO_*`)

Shared fluid type: `--contact-fluid-font` × `--contact-font-scale` on both intro and links
(icons track `em`). Narrow scales: `0.91` @ ≤36rem, `0.82` @ ≤22rem.

## Typography constants

`src/constants/contact-panel-typography.ts`:

- `CONTACT_PANEL_TYPO_NARROW_MAX_WIDTH = '36rem'`
- `CONTACT_PANEL_INTRO_FONT_WEIGHT_DESKTOP = 500`
- `CONTACT_PANEL_INTRO_FONT_WEIGHT_NARROW = 500`
- `CONTACT_PANEL_LINK_TEXT_FONT_WEIGHT = 500`
- `CONTACT_PANEL_LINKS_FONT_SCALE = 1`

## Tests to restore / extend when re-enabling intro

- `e2e/pages.spec.ts` — intro visibility + copy; fit overflow for intro+links;
  layout ratios (`linksWidthFrac ≈ 0.38`, intro→links gap &lt; intro height)
- `e2e/square-containment.spec.ts` + `e2e/helpers/zoom-guard.ts` —
  add `.contact-page__inset-rect--intro` back to `requiredInsideSelectors`
- Unit: `computeIntroLinksGapPx` already covered in `tests/unit/contact-layout-math.test.ts`
- Contracts: intro weight selectors in `tests/unit/layout-contracts.test.ts`

## Restore checklist

1. Re-insert intro markup in `contact.astro` (snippet above).
2. Confirm CSS + `CONTACT_LAYOUT` intro gap tokens unchanged.
3. Re-add e2e assertions for intro + intro→links gap.
4. Run: `npm run test:unit -- tests/unit/contact-layout-math.test.ts tests/unit/layout-contracts.test.ts`
5. Run contact e2e: landing fit / square-containment / pages contact tests.
