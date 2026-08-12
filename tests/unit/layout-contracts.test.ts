/**
 * Contract tests: TS constants ↔ CSS literals ↔ e2e helpers must stay aligned.
 * When changing one side, update the paired source and this file if needed.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  WHY_CTA_ARROW_FLOOR_OPACITY,
  WHY_CTA_ARROW_PEAK_OPACITY,
  WHY_CTA_BOX_WIDTH_FRAC,
} from '../../src/constants/why-layout';
import {
  MIN_CONTENT_WIDTH_CH,
  MAX_CONTENT_WIDTH_CH,
  WHY_CTA_VEIL_CLEARANCE_BELOW_LEAD_PX,
  WHY_CTA_VEIL_MIN_GAP_ABOVE_ARROW_PX,
  WHY_FIT_FAIL_LOCK_VIEWPORT_WIDTH,
} from '../../e2e/constants';
import {
  PROFILE_SEAM_MEDIA_MIN_WIDTHS,
  PROFILE_SHARED_EDGE_RATIO_BY_STEP,
} from '../../e2e/profile-seam-ratios';
import {
  REVEAL_PADDING_RATIO_ASSERT_TOLERANCE_PX,
  REVEAL_RIGHT_MARGIN_FIT_EPSILON_PX,
  REVEAL_RIGHT_MARGIN_RATIO_MIN,
  REVEAL_RIGHT_RENDER_PAD_PX,
} from '../../src/utils/profile-reveal-constants';
import { CONTACT_STATUS_LAYOUT } from '../../src/lib/contact-status';
import {
  PAGE_REVEAL_OPACITY_TRANSITION,
  PAGE_REVEAL_STYLESHEETS,
} from '../../src/constants/page-reveal';
import {
  CONTACT_PANEL_LINKS_FONT_SCALE,
  CONTACT_PANEL_LINK_TEXT_FONT_WEIGHT,
  CONTACT_PANEL_TYPO_NARROW_MAX_WIDTH,
} from '../../src/constants/contact-panel-typography';
import { COLOR_INK_HEX, COLOR_PAGE_BG_HEX } from '../../src/constants/colors';

const repoRoot = path.join(fileURLToPath(new URL('../..', import.meta.url)));

function readRepoFile(relPath: string): string {
  return readFileSync(path.join(repoRoot, relPath), 'utf8');
}

function cssCustomProp(css: string, name: string): string | null {
  const re = new RegExp(
    `${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:\\s*([^;]+);`,
  );
  const m = css.match(re);
  return m ? m[1].trim() : null;
}

function whyBoxScrollLiteral(name: string): number {
  const src = readRepoFile('src/scripts/why-box-scroll.ts');
  const re = new RegExp(`${name}:\\s*([\\d.]+)`);
  const m = src.match(re);
  expect(m, `why-box-scroll.ts should define ${name}`).toBeTruthy();
  return Number(m![1]);
}

describe('layout contracts: profile seam ratios (CSS ↔ e2e/profile-seam-ratios.ts)', () => {
  const css = readRepoFile('src/styles/pages/profile.css');

  it('CSS custom props match PROFILE_SHARED_EDGE_RATIO_BY_STEP', () => {
    const pairs: [string, keyof typeof PROFILE_SHARED_EDGE_RATIO_BY_STEP][] = [
      ['--profile-shared-edge-ratio-base', 'base'],
      ['--profile-shared-edge-ratio-360', 'at360'],
      ['--profile-shared-edge-ratio-480', 'at480'],
      ['--profile-shared-edge-ratio-720', 'at720'],
      ['--profile-shared-edge-ratio-960', 'at960'],
    ];
    for (const [varName, key] of pairs) {
      const raw = cssCustomProp(css, varName);
      expect(raw, varName).toBeTruthy();
      expect(Number.parseFloat(raw!)).toBe(
        PROFILE_SHARED_EDGE_RATIO_BY_STEP[key],
      );
    }
  });

  it('@media min-width breakpoints match PROFILE_SEAM_MEDIA_MIN_WIDTHS', () => {
    const found = [...css.matchAll(/@media\s*\(min-width:\s*(\d+)px\)/g)].map(
      (m) => Number(m[1]),
    );
    const seamBreakpoints = found.filter((w) =>
      (PROFILE_SEAM_MEDIA_MIN_WIDTHS as readonly number[]).includes(w),
    );
    expect(seamBreakpoints).toEqual([...PROFILE_SEAM_MEDIA_MIN_WIDTHS]);
  });
});

describe('layout contracts: global content width (CSS ↔ e2e/constants.ts)', () => {
  const css = readRepoFile('src/styles/global.css');

  it('--content-min-width and --content-width match e2e ch constants', () => {
    expect(cssCustomProp(css, '--content-min-width')).toBe(
      `${MIN_CONTENT_WIDTH_CH}ch`,
    );
    expect(cssCustomProp(css, '--content-width')).toBe(
      `${MAX_CONTENT_WIDTH_CH}ch`,
    );
  });
});

describe('layout contracts: why layout (constants ↔ Astro ↔ why-box-scroll ↔ e2e)', () => {
  it('WhyContent.astro sets CTA horizontal from WHY_CTA_BOX_WIDTH_FRAC', () => {
    const astro = readRepoFile('src/components/WhyContent.astro');
    expect(astro).toContain(
      "'--why-cta-horizontal': `${WHY_CTA_BOX_WIDTH_FRAC * 100}%`",
    );
    expect(WHY_CTA_BOX_WIDTH_FRAC).toBe(0.5);
  });

  it('e2e/constants re-exports match src/constants/why-layout.ts', () => {
    expect(WHY_CTA_ARROW_PEAK_OPACITY).toBe(0.47);
    expect(WHY_CTA_ARROW_FLOOR_OPACITY).toBe(0.08);
  });

  it('CTA veil px literals match e2e/constants.ts and why-box-scroll.ts', () => {
    expect(whyBoxScrollLiteral('CTA_VEIL_CLEARANCE_BELOW_LEAD_PX')).toBe(
      WHY_CTA_VEIL_CLEARANCE_BELOW_LEAD_PX,
    );
    expect(whyBoxScrollLiteral('CTA_VEIL_MIN_GAP_ABOVE_ARROW_PX')).toBe(
      WHY_CTA_VEIL_MIN_GAP_ABOVE_ARROW_PX,
    );
  });

  it('FIT_FAIL lock padding matches why-box-scroll (e2e viewport is documented intent)', () => {
    expect(whyBoxScrollLiteral('FIT_FAIL_LOCK_PADDING_PX')).toBe(6);
    expect(whyBoxScrollLiteral('FIT_FAIL_FRAMES')).toBe(4);
    expect(WHY_FIT_FAIL_LOCK_VIEWPORT_WIDTH).toBe(400);
  });
});

describe('layout contracts: profile reveal (TS ↔ CSS calc)', () => {
  it('profile.css uses REVEAL_RIGHT_MARGIN_RATIO_MIN in reveal inset calc', () => {
    const css = readRepoFile('src/styles/pages/profile.css');
    expect(css).toContain(`* ${REVEAL_RIGHT_MARGIN_RATIO_MIN}`);
    expect(REVEAL_RIGHT_MARGIN_RATIO_MIN).toBe(1.02);
    expect(REVEAL_RIGHT_RENDER_PAD_PX).toBe(1);
    expect(REVEAL_RIGHT_MARGIN_FIT_EPSILON_PX).toBe(0.5);
    expect(REVEAL_PADDING_RATIO_ASSERT_TOLERANCE_PX).toBe(0.5);
  });
});

describe('layout contracts: content panel selectors (constants ↔ e2e)', () => {
  it('CONTENT_PANEL_SELECTORS match CONTENT_PANEL_CASES routes', async () => {
    const { CONTENT_PANEL_SELECTORS } =
      await import('../../src/constants/content-panel');
    const { CONTENT_PANEL_CASES } =
      await import('../../e2e/helpers/zoom-guard');

    expect(CONTENT_PANEL_CASES.map((c) => c.name)).toEqual([
      'hero',
      'profile',
      'writing',
      'contact',
    ]);
    for (const routeCase of CONTENT_PANEL_CASES) {
      expect(routeCase.contentPanelSelector).toBe(
        CONTENT_PANEL_SELECTORS[routeCase.name],
      );
    }
  });
});

/*
 * The vertical skeleton (nav → page title → content panel → footer) has exactly one
 * definition. Per-page overrides previously drifted to 1.1rem / 1.3rem / 1.35rem / 1.5rem
 * and needed a masking strip on hero, which put panel edges and footer at three heights.
 */
describe('layout contracts: unified content panel skeleton', () => {
  const CONTENT_PANEL_MARKUP: readonly [string, string][] = [
    ['src/components/HomeHero.astro', 'hero content-panel'],
    [
      'src/components/WritingPageBody.astro',
      'page-buttons-panel content-panel',
    ],
    [
      'src/components/ContactPageBody.astro',
      'page-buttons-panel content-panel',
    ],
    [
      'src/components/RouteMaintenanceNotice.astro',
      'route-maintenance-panel content-panel',
    ],
    ['src/content/pages/profile.md', 'profile-section content-panel'],
  ];

  const CONTENT_PANEL_PAGE_MARKUP: readonly string[] = [
    'src/components/HomeHero.astro',
    'src/components/ProfilePageBody.astro',
    'src/components/WritingPageBody.astro',
    'src/components/ContactPageBody.astro',
    'src/components/RouteMaintenanceNotice.astro',
  ];

  const ROUTE_STYLESHEETS: readonly string[] = [
    'src/styles/pages/hero.css',
    'src/styles/pages/profile.css',
    'src/styles/pages/writing.css',
    'src/styles/pages/contact.css',
    'src/styles/pages/maintenance.css',
  ];

  it('content-panel.css owns the title gap and the square geometry', async () => {
    const { CONTENT_PANEL_CLASS, CONTENT_PANEL_PAGE_CLASS } =
      await import('../../src/constants/content-panel');
    const css = readRepoFile('src/styles/content-panel.css');
    const global = readRepoFile('src/styles/global.css');

    expect(css).toContain(`.${CONTENT_PANEL_PAGE_CLASS} > h1.page-title`);
    expect(css).toContain('margin-bottom: var(--content-panel-title-gap)');
    expect(css).toMatch(
      new RegExp(
        `\\.${CONTENT_PANEL_CLASS}\\s*\\{[^}]*height:\\s*100cqw[^}]*margin:\\s*0`,
      ),
    );
    expect(cssCustomProp(global, '--content-panel-title-gap')).toBe('1.35rem');
    expect(cssCustomProp(global, '--page-nav-margin-bottom')).toBe('1rem');
  });

  it('Layout.astro loads content-panel.css after page-buttons.css', () => {
    const layout = readRepoFile('src/layouts/Layout.astro');
    expect(
      layout.indexOf("import '../styles/content-panel.css'"),
    ).toBeGreaterThan(layout.indexOf("import '../styles/page-buttons.css'"));
  });

  it('both navigations share --page-nav-margin-bottom', () => {
    expect(readRepoFile('src/styles/site-header.css')).toContain(
      'margin-bottom: var(--page-nav-margin-bottom)',
    );
    expect(readRepoFile('src/styles/pages/hero.css')).toContain(
      'margin-bottom: var(--page-nav-margin-bottom)',
    );
  });

  it('every route marks up its page wrapper and content panel', () => {
    for (const relPath of CONTENT_PANEL_PAGE_MARKUP) {
      expect(readRepoFile(relPath), relPath).toContain('content-panel-page');
    }
    for (const [relPath, classes] of CONTENT_PANEL_MARKUP) {
      expect(readRepoFile(relPath), relPath).toContain(classes);
    }
  });

  it('no route stylesheet redefines the title gap or the panel square', () => {
    for (const relPath of ROUTE_STYLESHEETS) {
      const css = readRepoFile(relPath);
      expect(css, relPath).not.toContain('--page-title-margin-bottom');
      expect(css, relPath).not.toContain('aspect-ratio: 1 / 1');
      expect(css, relPath).not.toContain('height: 100cqw');
    }
  });

  it('hero no longer masks the top of its content panel', () => {
    const css = readRepoFile('src/styles/pages/hero.css');
    expect(css).not.toContain('hero-top-edge');
    expect(css).not.toContain('hero-wrap');
    expect(readRepoFile('src/components/HomeHero.astro')).not.toContain(
      'hero-top-edge',
    );
  });

  it('profile critical head CSS only hides, it does not re-declare geometry', () => {
    const astro = readRepoFile('src/components/layout/ProfileLayoutHead.astro');
    expect(astro).toContain('.profile-section--loading');
    expect(astro).not.toContain('height: 100cqw');
    expect(astro).not.toContain('margin-top');
  });
});

describe('layout contracts: contact panel typography (constants ↔ contact.css)', () => {
  const css = readRepoFile('src/styles/pages/contact.css');

  it('uses shared narrow breakpoint with --contact-font-scale', () => {
    expect(css).toContain(
      `@media (max-width: ${CONTACT_PANEL_TYPO_NARROW_MAX_WIDTH})`,
    );
  });

  it('panel link labels use page-buttons weight and match intro font scale', () => {
    expect(css).toMatch(
      new RegExp(
        `\\.contact-page \\.contact-extra-link \\.contact-extra-link__text\\s*\\{[^}]*font-weight:\\s*${CONTACT_PANEL_LINK_TEXT_FONT_WEIGHT}`,
      ),
    );
    expect(css).toContain(
      `--contact-links-font-scale: ${CONTACT_PANEL_LINKS_FONT_SCALE}`,
    );
  });
});

describe('layout contracts: contact form status (CONTACT_STATUS_LAYOUT ↔ contact.css)', () => {
  it('.contact-form__actions custom props match CONTACT_STATUS_LAYOUT', () => {
    const css = readRepoFile('src/styles/pages/contact.css');
    expect(css).toContain(
      `--contact-send-max-height: ${CONTACT_STATUS_LAYOUT.sendButtonMaxHeightRem}rem`,
    );
    expect(css).toContain(
      `--contact-status-pad-block: ${CONTACT_STATUS_LAYOUT.statusPadBlockRem}rem`,
    );
    expect(css).toContain(
      `--contact-status-pad-inline: ${CONTACT_STATUS_LAYOUT.statusPadInlineRem}rem`,
    );
  });

  it('.contact-status typography matches CONTACT_STATUS_LAYOUT', () => {
    const css = readRepoFile('src/styles/pages/contact.css');
    expect(css).toContain(
      `font-size: ${CONTACT_STATUS_LAYOUT.statusFontSizeRem}rem`,
    );
    expect(css).toContain(
      `line-height: ${CONTACT_STATUS_LAYOUT.statusLineHeight}`,
    );
    expect(css).toContain('-webkit-line-clamp: 2');
    expect(CONTACT_STATUS_LAYOUT.statusMaxLines).toBe(2);
  });
});

describe('layout contracts: theme colors (tokens.css ↔ colors.ts)', () => {
  const tokens = readRepoFile('src/styles/tokens.css');

  it('tokens.css defines ink and page-bg hex values', () => {
    expect(cssCustomProp(tokens, '--color-ink')).toBe(COLOR_INK_HEX);
    expect(cssCustomProp(tokens, '--color-page-bg')).toBe(COLOR_PAGE_BG_HEX);
  });

  it('global.css imports tokens and does not redefine page-bg hex', () => {
    const global = readRepoFile('src/styles/global.css');
    expect(global).toContain("@import './tokens.css'");
    expect(global).not.toMatch(/--color-page-bg:\s*#/);
  });
});

describe('layout contracts: page reveal fade (CSS ↔ page-reveal.ts)', () => {
  for (const relPath of PAGE_REVEAL_STYLESHEETS) {
    it(`${relPath} declares shared opacity reveal transition`, () => {
      const css = readRepoFile(relPath);
      expect(css).toContain(PAGE_REVEAL_OPACITY_TRANSITION);
    });
  }
});

describe('layout contracts: Writing category picker idle (CSS ↔ TS ↔ Foundations)', () => {
  it('idle MS matches Foundations DEFAULT_REVEAL_TIMEOUT_MS and writing.css', async () => {
    const {
      WRITING_CATEGORY_PICKER_IDLE_MS,
      WRITING_CATEGORY_PICKER_FLASH_MS,
    } = await import('../../src/constants/writing-category-picker');
    const { DEFAULT_REVEAL_TIMEOUT_MS } =
      await import('../../src/scripts/profile-tile-type-fit-constants');
    const writingCss = readRepoFile('src/styles/pages/writing.css');

    expect(WRITING_CATEGORY_PICKER_IDLE_MS).toBe(DEFAULT_REVEAL_TIMEOUT_MS);
    expect(WRITING_CATEGORY_PICKER_IDLE_MS).toBe(7000);
    expect(cssCustomProp(writingCss, '--writing-category-picker-idle-ms')).toBe(
      '7000',
    );
    expect(WRITING_CATEGORY_PICKER_FLASH_MS).toBe(220);
  });

  it('picker script reads idle from CSS custom property with constant fallback', () => {
    const src = readRepoFile('src/scripts/writing-category-picker.ts');
    expect(src).toContain('--writing-category-picker-idle-ms');
    expect(src).toContain('WRITING_CATEGORY_PICKER_IDLE_MS');
    expect(src).toContain('WRITING_CATEGORY_PICKER_FLASH_MS');
  });

  it('writing.css defines open divider and is-flashing invert', () => {
    const writingCss = readRepoFile('src/styles/pages/writing.css');
    expect(writingCss).toMatch(
      /\.writing-category-picker--open[\s\S]*?\.writing-category-picker__option\s*\+\s*\.writing-category-picker__option\s*\{[\s\S]*?box-shadow:\s*inset 1px 0 0 rgba\(var\(--color-ink-rgb\),\s*0\.2\)/,
    );
    expect(writingCss).toMatch(
      /\.writing-category-picker__option\.is-flashing\s*\{[\s\S]*?background-color:\s*var\(--color-ink\)[\s\S]*?color:\s*var\(--color-page-bg\)/,
    );
    expect(writingCss).toContain(
      'width: calc(2 * var(--writing-category-slot-width))',
    );
  });

  it('writing.css enables expand transitions only after --ready', () => {
    const writingCss = readRepoFile('src/styles/pages/writing.css');
    expect(writingCss).toMatch(
      /\.writing-category-picker--ready[\s\S]*?\.writing-category-picker__control\s*\{[\s\S]*?transition:\s*width/,
    );
    expect(writingCss).not.toMatch(
      /\.writing-page \.writing-category-picker__control\s*\{[^}]*transition:\s*width/,
    );
  });
});

describe('layout contracts: route maintenance panel look', () => {
  it('maintenance.css panel-bg knobs match MAINTENANCE_PANEL_BG', async () => {
    const { MAINTENANCE_PANEL_BG } =
      await import('../../src/constants/maintenance-panel');
    const css = readRepoFile('src/styles/pages/maintenance.css');

    expect(cssCustomProp(css, '--panel-bg-pos-x')).toBe(
      MAINTENANCE_PANEL_BG.posX,
    );
    expect(cssCustomProp(css, '--panel-bg-pos-y')).toBe(
      MAINTENANCE_PANEL_BG.posY,
    );
    expect(cssCustomProp(css, '--panel-bg-layer-opacity')).toBe(
      MAINTENANCE_PANEL_BG.layerOpacity,
    );
    expect(cssCustomProp(css, '--panel-bg-saturation')).toBe(
      MAINTENANCE_PANEL_BG.saturation,
    );
    expect(cssCustomProp(css, '--panel-bg-brightness')).toBe(
      MAINTENANCE_PANEL_BG.brightness,
    );
    expect(cssCustomProp(css, '--panel-bg-contrast')).toBe(
      MAINTENANCE_PANEL_BG.contrast,
    );
    expect(cssCustomProp(css, '--panel-bg-zoom')).toBe(
      MAINTENANCE_PANEL_BG.zoom,
    );
    expect(cssCustomProp(css, '--panel-bg-nudge-x')).toBe(
      MAINTENANCE_PANEL_BG.nudgeX,
    );
    expect(cssCustomProp(css, '--panel-bg-nudge-y')).toBe(
      MAINTENANCE_PANEL_BG.nudgeY,
    );
    expect(cssCustomProp(css, '--panel-bg-rotate')).toBe(
      MAINTENANCE_PANEL_BG.rotate,
    );
  });

  it('RouteMaintenanceNotice wires dichrom media from MAINTENANCE_PANEL_BG_STEM', async () => {
    const { MAINTENANCE_PANEL_BG_STEM } =
      await import('../../src/constants/maintenance-panel');
    const astro = readRepoFile('src/components/RouteMaintenanceNotice.astro');
    expect(astro).toContain('MAINTENANCE_PANEL_BG_STEM');
    expect(astro).toContain('page-buttons-panel__media');
    expect(astro).toContain('ResponsiveDichromPicture');
    expect(MAINTENANCE_PANEL_BG_STEM).toContain('/assets/pages/maintenance/');
    expect(MAINTENANCE_PANEL_BG_STEM).toMatch(/_dichrom$/);
  });

  it('maintenance.css uses contact-style zoom/nudge img wiring', () => {
    const css = readRepoFile('src/styles/pages/maintenance.css');
    expect(css).toContain('width: calc(100% * var(--panel-bg-zoom, 1))');
    expect(css).toContain('var(--panel-bg-nudge-x, 0)');
    expect(css).toContain('var(--panel-bg-nudge-y, 0)');
    expect(css).toContain('opacity: var(--panel-bg-layer-opacity, 1)');
    expect(css).toMatch(
      /\.route-maintenance-panel__copy\s*\{[\s\S]*?right:\s*0;[\s\S]*?background-color:\s*var\(--color-page-bg\)/,
    );
  });
});
