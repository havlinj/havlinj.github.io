import { test, expect, type Page } from '@playwright/test';
import { RGB_INK, RGB_PAGE_BG } from '../src/constants/colors';
import { WRITING_CATEGORY_PICKER_FLASH_MS } from '../src/constants/writing-category-picker';
import {
  expectWritingCategoryPickerClosed,
  installWritingCategoryPickerWidthProbe,
  openWritingCategoryPicker,
  readWritingCategoryPickerLayout,
  readWritingCategoryPickerWidthLog,
  selectWritingCategory,
  setWritingCategoryPickerIdleMs,
  waitForWritingCategoryPickerExpanded,
  waitForWritingCategoryPickerSlotReady,
  waitTwoFrames,
} from './helpers';

const PX = 2;
const ALIGN_PX = 5;

async function gotoWritingReady(page: Page): Promise<void> {
  await page.goto('/writing', { waitUntil: 'domcontentloaded' });
  await expect(
    page.locator('.writing-groups.writing-groups--visible'),
  ).toBeVisible({ timeout: 10_000 });
  await waitTwoFrames(page);
  await waitForWritingCategoryPickerSlotReady(page);
}

function option(page: Page, category: 'technical' | 'conceptual') {
  return page.locator(
    `.writing-category-picker__option[data-category="${category}"]`,
  );
}

test.describe('Writing category picker', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await gotoWritingReady(page);
  });

  test('defaults to Rigor with Coming up… and Freestyle section hidden', async ({
    page,
  }) => {
    const picker = page.locator('.writing-category-picker');
    await expect(picker).toBeVisible();
    await expect(picker).toHaveClass(/writing-category-picker--ready/);
    await expect(picker).toHaveAttribute('aria-label', 'Article category');
    await expect(picker).toHaveAttribute('aria-expanded', 'false');
    await expect(picker).not.toHaveClass(/writing-category-picker--open/);

    const slotUnit = await picker.evaluate((el) =>
      getComputedStyle(el)
        .getPropertyValue('--writing-category-slot-width')
        .trim(),
    );
    expect(slotUnit).toMatch(/px$/);

    await expect(page.locator('.writing-category-picker__caption')).toHaveText(
      'Category',
    );
    await expect(
      page.locator('.writing-category-picker__caption'),
    ).not.toHaveText(/Category:/);

    await expect(option(page, 'technical')).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(option(page, 'technical')).toHaveClass(/is-selected/);
    await expect(option(page, 'technical')).toHaveText('Rigor');
    await expect(option(page, 'conceptual')).toHaveAttribute(
      'aria-selected',
      'false',
    );
    await expect(option(page, 'conceptual')).toHaveText('Freestyle');

    const rigor = page.locator(
      '.writing-section[data-writing-category="technical"]',
    );
    const freestyle = page.locator(
      '.writing-section[data-writing-category="conceptual"]',
    );
    await expect(rigor).toBeVisible();
    await expect(freestyle).toBeHidden();

    await expect(
      page.getByRole('list', { name: 'Rigor articles' }),
    ).toBeVisible();
    await expect(page.locator('.page-button--placeholder')).toHaveText(
      /Coming up/,
    );
    await expect(
      page.getByRole('list', { name: 'Freestyle articles' }),
    ).toBeHidden();
  });

  test('bar aligns with article buttons; Category shares title column', async ({
    page,
  }) => {
    const layout = await readWritingCategoryPickerLayout(page);
    /* Picker uses margin-left; rows use the same inset on the button box. */
    expect(Math.abs(layout.pickerLeft - layout.rowLeft)).toBeLessThanOrEqual(
      PX,
    );
    expect(layout.pickerRight).toBeLessThanOrEqual(layout.panelRight + PX);
    expect(layout.pickerLeft).toBeGreaterThan(layout.panelLeft + 20);

    expect(layout.placeholderLeft, 'Rigor placeholder present').not.toBeNull();
    expect(
      Math.abs(layout.captionLeft - (layout.placeholderLeft as number)),
    ).toBeLessThanOrEqual(ALIGN_PX);

    await selectWritingCategory(page, 'conceptual');
    const freestyleLayout = await readWritingCategoryPickerLayout(page);
    expect(freestyleLayout.titleLeft, 'Freestyle title present').not.toBeNull();
    expect(
      Math.abs(
        freestyleLayout.captionLeft - (freestyleLayout.titleLeft as number),
      ),
    ).toBeLessThanOrEqual(ALIGN_PX);
  });

  test('slot width matches longest measure label; open control is ~2×', async ({
    page,
  }) => {
    const before = await page.evaluate(() => {
      const picker = document.querySelector('.writing-category-picker');
      const control = document.querySelector(
        '.writing-category-picker__control',
      );
      const measure = document.querySelector(
        '.writing-category-picker__measure',
      );
      if (
        !(picker instanceof HTMLElement) ||
        !(control instanceof HTMLElement) ||
        !(measure instanceof HTMLElement)
      ) {
        throw new Error('missing picker measure nodes');
      }
      const measureMax = Math.max(
        ...Array.from(measure.children).map((child) =>
          child instanceof HTMLElement
            ? child.getBoundingClientRect().width
            : 0,
        ),
      );
      const slotRaw = getComputedStyle(picker)
        .getPropertyValue('--writing-category-slot-width')
        .trim();
      return {
        slotPx: Number.parseFloat(slotRaw),
        measureMax,
        controlWidth: control.getBoundingClientRect().width,
        measureHidden:
          getComputedStyle(measure).visibility === 'hidden' &&
          measure.getAttribute('aria-hidden') === 'true',
      };
    });

    expect(before.measureHidden).toBe(true);
    expect(before.slotPx).toBeGreaterThan(0);
    expect(before.slotPx).toBeGreaterThanOrEqual(Math.floor(before.measureMax));
    /* Control width tracks the slot token (subpixel / border box slack). */
    expect(before.controlWidth).toBeGreaterThan(before.measureMax * 0.9);
    expect(
      Math.abs(before.controlWidth - before.slotPx) /
        Math.max(before.slotPx, 1),
    ).toBeLessThan(0.2);

    await openWritingCategoryPicker(page);
    await waitForWritingCategoryPickerExpanded(page);

    const after = await readWritingCategoryPickerLayout(page);
    expect(after.controlWidth).toBeGreaterThan(before.controlWidth * 1.6);
    expect(after.controlWidth / (2 * after.slotWidthPx)).toBeGreaterThan(0.92);
    expect(after.controlWidth / (2 * after.slotWidthPx)).toBeLessThan(1.08);
  });

  test('open shows both options and an inset divider on Freestyle', async ({
    page,
  }) => {
    await openWritingCategoryPicker(page);
    await expect(option(page, 'technical')).toBeVisible();
    await expect(option(page, 'conceptual')).toBeVisible();

    const divider = await option(page, 'conceptual').evaluate(
      (el) => getComputedStyle(el).boxShadow,
    );
    expect(divider).toMatch(/inset/i);
    expect(divider).toMatch(/rgba?\(\s*17,\s*17,\s*17/i);

    await page.keyboard.press('Escape');
    await expectWritingCategoryPickerClosed(page);
  });

  test('Escape and outside click collapse without changing selection', async ({
    page,
  }) => {
    await openWritingCategoryPicker(page);
    await page.keyboard.press('Escape');
    await expectWritingCategoryPickerClosed(page);
    await expect(option(page, 'technical')).toHaveAttribute(
      'aria-selected',
      'true',
    );

    await openWritingCategoryPicker(page);
    await page.getByRole('heading', { name: 'Writing', level: 1 }).click();
    await expectWritingCategoryPickerClosed(page);
    await expect(option(page, 'technical')).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  test('clicking the already-selected option while open only collapses', async ({
    page,
  }) => {
    await openWritingCategoryPicker(page);
    await option(page, 'technical').click();
    await expectWritingCategoryPickerClosed(page);
    await expect(option(page, 'technical')).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(
      page.locator('.writing-section[data-writing-category="technical"]'),
    ).toBeVisible();
  });

  test('choosing Freestyle flashes ink invert then selects and collapses', async ({
    page,
  }) => {
    /* Disable option color transitions so the flash samples solid ink/page-bg. */
    await page.addStyleTag({
      content: `
        .writing-page .writing-category-picker__option {
          transition: none !important;
        }
      `,
    });

    await openWritingCategoryPicker(page);

    const freestyle = option(page, 'conceptual');
    const flashStylesPromise = freestyle.evaluate((el) => {
      return new Promise<{
        sawFlash: boolean;
        backgroundColor: string;
        color: string;
      }>((resolve) => {
        const started = performance.now();
        const tick = () => {
          if (el.classList.contains('is-flashing')) {
            const cs = getComputedStyle(el);
            resolve({
              sawFlash: true,
              backgroundColor: cs.backgroundColor,
              color: cs.color,
            });
            return;
          }
          if (performance.now() - started > 500) {
            resolve({
              sawFlash: false,
              backgroundColor: '',
              color: '',
            });
            return;
          }
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    });

    await freestyle.click();
    const flash = await flashStylesPromise;
    expect(flash.sawFlash).toBe(true);
    expect(flash.backgroundColor).toBe(RGB_INK);
    expect(flash.color).toBe(RGB_PAGE_BG);

    await expectWritingCategoryPickerClosed(page);
    await expect(freestyle).not.toHaveClass(/is-flashing/);
    await expect(freestyle).toHaveAttribute('aria-selected', 'true');
    await expect(option(page, 'technical')).toHaveAttribute(
      'aria-selected',
      'false',
    );

    await expect(
      page.locator('.writing-section[data-writing-category="conceptual"]'),
    ).toBeVisible();
    await expect(
      page.locator('.writing-section[data-writing-category="technical"]'),
    ).toBeHidden();
    await expect(
      page.getByRole('list', { name: 'Featured conceptual articles' }),
    ).toBeVisible();
    await expect(
      page.getByRole('list', { name: 'Freestyle articles', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: /System Thinking, Applied/ }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: /Professionalism/ }),
    ).toBeVisible();
  });

  test('collapsed Freestyle shows selected label inside the shell frame', async ({
    page,
  }) => {
    await selectWritingCategory(page, 'conceptual');
    await expectWritingCategoryPickerClosed(page);
    await page.waitForTimeout(360);

    const layout = await readWritingCategoryPickerLayout(page);
    expect(layout.selectedCategory).toBe('conceptual');
    expect(layout.isOpen).toBe(false);
    /* Track slides so the selected option lines up with the visible shell
       (1px ink border + subpixel / font settle slack). */
    expect(
      Math.abs(layout.selectedOptionLeft - layout.shellLeft),
    ).toBeLessThanOrEqual(PX + 4);
  });

  test('idle timeout auto-collapses after override ms', async ({ page }) => {
    await setWritingCategoryPickerIdleMs(page, 350);
    await openWritingCategoryPicker(page);
    await expect(page.locator('.writing-category-picker')).toHaveClass(
      /writing-category-picker--open/,
    );

    await expect
      .poll(
        async () =>
          page
            .locator('.writing-category-picker')
            .evaluate((el) =>
              el.classList.contains('writing-category-picker--open'),
            ),
        { timeout: 2000 },
      )
      .toBe(false);

    await expectWritingCategoryPickerClosed(page);
    await expect(option(page, 'technical')).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  test('idle timer does not fire before the configured window', async ({
    page,
  }) => {
    await setWritingCategoryPickerIdleMs(page, 1200);
    await openWritingCategoryPicker(page);
    await page.waitForTimeout(400);
    await expect(page.locator('.writing-category-picker')).toHaveClass(
      /writing-category-picker--open/,
    );
    await page.keyboard.press('Escape');
    await expectWritingCategoryPickerClosed(page);
  });

  test('prefers-reduced-motion skips flash delay and still selects', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await gotoWritingReady(page);

    await openWritingCategoryPicker(page);
    const started = Date.now();
    await option(page, 'conceptual').click();
    await expectWritingCategoryPickerClosed(page);
    const elapsed = Date.now() - started;

    expect(elapsed).toBeLessThan(WRITING_CATEGORY_PICKER_FLASH_MS + 80);
    await expect(option(page, 'conceptual')).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(option(page, 'conceptual')).not.toHaveClass(/is-flashing/);

    await page.emulateMedia({ reducedMotion: 'no-preference' });
  });

  test('switching back to Rigor restores placeholder and hides Freestyle lists', async ({
    page,
  }) => {
    await selectWritingCategory(page, 'conceptual');
    await selectWritingCategory(page, 'technical');

    await expect(
      page.getByRole('list', { name: 'Rigor articles' }),
    ).toBeVisible();
    await expect(page.locator('.page-button--placeholder')).toBeVisible();
    await expect(
      page.getByRole('list', { name: 'Featured conceptual articles' }),
    ).toBeHidden();
    await expect(
      page.getByRole('link', { name: /Professionalism/ }),
    ).toBeHidden();
  });

  test('picker keeps a gap above Freestyle content when that category is shown', async ({
    page,
  }) => {
    await selectWritingCategory(page, 'conceptual');
    const spacing = await page.evaluate(() => {
      const picker = document.querySelector('.writing-category-picker');
      const section = document.querySelector(
        '.writing-section[data-writing-category="conceptual"]',
      );
      const buttons = document.querySelector(
        '.writing-section[data-writing-category="conceptual"] .page-buttons',
      );
      if (
        !(picker instanceof HTMLElement) ||
        !(section instanceof HTMLElement) ||
        !(buttons instanceof HTMLElement)
      ) {
        throw new Error('missing picker/section/buttons');
      }
      const pickerBottom = picker.getBoundingClientRect().bottom;
      const sectionTop = section.getBoundingClientRect().top;
      const marginBottom = Number.parseFloat(
        getComputedStyle(picker).marginBottom,
      );
      const rowGap = Number.parseFloat(getComputedStyle(buttons).gap);
      return {
        gap: sectionTop - pickerBottom,
        marginBottom,
        rowGap,
      };
    });

    expect(spacing.rowGap).toBeGreaterThan(4);
    expect(spacing.marginBottom).toBeGreaterThan(spacing.rowGap * 0.65);
    expect(spacing.marginBottom).toBeLessThan(spacing.rowGap * 0.95);
    expect(spacing.gap).toBeGreaterThan(spacing.rowGap * 0.6);
  });

  test('listbox semantics: track is listbox; options are buttons with role=option', async ({
    page,
  }) => {
    const track = page.locator('.writing-category-picker__track');
    await expect(track).toHaveAttribute('role', 'listbox');
    await expect(option(page, 'technical')).toHaveAttribute('type', 'button');
    await expect(option(page, 'technical')).toHaveAttribute('role', 'option');
    await expect(option(page, 'conceptual')).toHaveAttribute('role', 'option');
    await expect(page.locator('.writing-category-picker__option')).toHaveCount(
      2,
    );
  });

  test('caption uses heading tracking and weight 500', async ({ page }) => {
    const caption = page.locator('.writing-category-picker__caption');
    await expect(caption).toHaveCSS('font-weight', '500');
    const tracking = await caption.evaluate((el) => {
      const cs = getComputedStyle(el);
      const size = Number.parseFloat(cs.fontSize);
      const track = Number.parseFloat(cs.letterSpacing);
      return size > 0 && Number.isFinite(track) ? track / size : NaN;
    });
    expect(tracking).toBeGreaterThan(0.04);
    expect(tracking).toBeLessThan(0.06);
  });

  test('open option hover applies a light ink wash (not when flashing)', async ({
    page,
  }) => {
    await page.addStyleTag({
      content: `
        .writing-page .writing-category-picker__option {
          transition: none !important;
        }
      `,
    });
    await openWritingCategoryPicker(page);
    const freestyle = option(page, 'conceptual');
    await freestyle.hover();
    await expect(freestyle).toHaveCSS(
      'background-color',
      /rgba\(\s*17,\s*17,\s*17,\s*0\.0[5-9]|rgba\(\s*17,\s*17,\s*17,\s*0\.1/,
    );
  });

  test('window resize keeps slot width synced to measured labels', async ({
    page,
  }) => {
    const before = await readWritingCategoryPickerLayout(page);
    await page.setViewportSize({ width: 900, height: 800 });
    await waitTwoFrames(page);
    await waitForWritingCategoryPickerSlotReady(page);
    const after = await readWritingCategoryPickerLayout(page);
    expect(after.slotWidthPx).toBeGreaterThan(20);
    expect(
      Math.abs(after.controlWidth - after.slotWidthPx) /
        Math.max(after.slotWidthPx, 1),
    ).toBeLessThan(0.2);
    expect(before.selectedCategory).toBe('technical');
    expect(after.selectedCategory).toBe('technical');
  });

  test('shell uses ink border and page-bg fill', async ({ page }) => {
    const shell = page.locator('.writing-category-picker__shell');
    await expect(shell).toHaveCSS('border-top-color', RGB_INK);
    await expect(shell).toHaveCSS('background-color', RGB_PAGE_BG);
    await expect(shell).toHaveCSS('border-top-left-radius', '0px');
  });

  test('selectWritingCategory is a no-op when category already selected', async ({
    page,
  }) => {
    await expect(option(page, 'technical')).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await selectWritingCategory(page, 'technical');
    await expectWritingCategoryPickerClosed(page);
    await expect(option(page, 'technical')).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });
});

test.describe('Writing category picker — narrow viewport', () => {
  test('still expands and switches categories on mobile width', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoWritingReady(page);

    const closed = await readWritingCategoryPickerLayout(page);
    expect(closed.selectedCategory).toBe('technical');
    expect(closed.isOpen).toBe(false);

    await openWritingCategoryPicker(page);
    await waitForWritingCategoryPickerExpanded(page);
    const open = await readWritingCategoryPickerLayout(page);
    expect(open.isOpen).toBe(true);
    expect(open.controlWidth / (2 * open.slotWidthPx)).toBeGreaterThan(0.92);
    expect(open.controlWidth).toBeGreaterThan(closed.controlWidth * 1.5);

    await selectWritingCategory(page, 'conceptual');
    await expect(
      page.getByRole('link', { name: /System Thinking, Applied/ }),
    ).toBeVisible();
  });
});

test.describe('Writing category picker — first paint width', () => {
  test('control width does not shrink once the list is visible', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await installWritingCategoryPickerWidthProbe(page);
    await page.goto('/writing', { waitUntil: 'domcontentloaded' });
    await expect(
      page.locator('.writing-groups.writing-groups--visible'),
    ).toBeVisible({ timeout: 10_000 });
    /* Cover the old expand-ms window where a late measure used to animate shrink. */
    await page.waitForTimeout(450);

    const log = await readWritingCategoryPickerWidthLog(page);
    expect(log.length, 'probe should record frames').toBeGreaterThan(10);

    const visible = log.filter(
      (sample) => sample.groupsVisible && sample.groupsOpacity > 0.05,
    );
    expect(visible.length, 'need samples after reveal').toBeGreaterThan(8);

    for (const sample of visible) {
      expect(
        sample.pickerReady,
        'list must not appear before the measured slot is ready',
      ).toBe(true);
    }

    const widths = visible.map((sample) => sample.controlWidth);
    const minWidth = Math.min(...widths);
    const maxWidth = Math.max(...widths);
    expect(
      maxWidth - minWidth,
      `visible widths drifted: min=${minWidth} max=${maxWidth}`,
    ).toBeLessThanOrEqual(1.5);

    for (let i = 1; i < visible.length; i++) {
      expect(
        visible[i]!.controlWidth,
        `shrink at sample ${i}: ${visible[i - 1]!.controlWidth} → ${visible[i]!.controlWidth}`,
      ).toBeGreaterThanOrEqual(visible[i - 1]!.controlWidth - 1);
    }
  });
});
