import { expect, type Page } from '@playwright/test';

/** Expand the Writing category control and choose Rigor / Freestyle. */
export async function selectWritingCategory(
  page: Page,
  category: 'technical' | 'conceptual',
): Promise<void> {
  const option = page.locator(
    `.writing-category-picker__option[data-category="${category}"]`,
  );
  const alreadySelected = await option.getAttribute('aria-selected');
  if (alreadySelected === 'true') return;

  await openWritingCategoryPicker(page);
  await option.click();
  await expectWritingCategoryPickerClosed(page);
  await expect(option).toHaveAttribute('aria-selected', 'true');
}

export async function openWritingCategoryPicker(page: Page): Promise<void> {
  const picker = page.locator('.writing-category-picker');
  if (
    await picker.evaluate((el) =>
      el.classList.contains('writing-category-picker--open'),
    )
  ) {
    return;
  }
  await page.locator('.writing-category-picker__shell').click();
  await expect(picker).toHaveClass(/writing-category-picker--open/);
  await expect(picker).toHaveAttribute('aria-expanded', 'true');
}

export async function expectWritingCategoryPickerClosed(
  page: Page,
): Promise<void> {
  const picker = page.locator('.writing-category-picker');
  await expect(picker).not.toHaveClass(/writing-category-picker--open/, {
    timeout: 3000,
  });
  await expect(picker).toHaveAttribute('aria-expanded', 'false');
}

/** Override idle auto-collapse (ms), same pattern as Foundations reveal e2e. */
export async function setWritingCategoryPickerIdleMs(
  page: Page,
  idleMs: number,
): Promise<void> {
  await page.locator('.writing-category-picker').evaluate((el, ms) => {
    if (!(el instanceof HTMLElement)) {
      throw new Error('missing .writing-category-picker');
    }
    el.style.setProperty('--writing-category-picker-idle-ms', `${ms}`);
  }, idleMs);
}

export type WritingCategoryPickerLayout = {
  pickerLeft: number;
  pickerRight: number;
  panelLeft: number;
  panelRight: number;
  /** Left edge of the first visible row button (aligned with picker bar). */
  rowLeft: number;
  captionLeft: number;
  titleLeft: number | null;
  placeholderLeft: number | null;
  controlWidth: number;
  shellWidth: number;
  shellLeft: number;
  selectedOptionLeft: number;
  slotWidthPx: number;
  isOpen: boolean;
  selectedCategory: string | null;
};

export async function readWritingCategoryPickerLayout(
  page: Page,
): Promise<WritingCategoryPickerLayout> {
  return page.evaluate(() => {
    const picker = document.querySelector('.writing-category-picker');
    const panel = document.querySelector('.writing-page .page-buttons-panel');
    const row = document.querySelector(
      '.writing-page .writing-section:not([hidden]) .page-button',
    );
    const caption = document.querySelector('.writing-category-picker__caption');
    const control = document.querySelector('.writing-category-picker__control');
    const shell = document.querySelector('.writing-category-picker__shell');
    const title = document.querySelector(
      '.writing-page .writing-section:not([hidden]) a.page-button .page-button__text',
    );
    const placeholder = document.querySelector(
      '.writing-page .writing-section:not([hidden]) .page-button__text--placeholder',
    );
    const selected = document.querySelector(
      '.writing-category-picker__option[aria-selected="true"]',
    );

    if (
      !(picker instanceof HTMLElement) ||
      !(panel instanceof HTMLElement) ||
      !(row instanceof HTMLElement) ||
      !(caption instanceof HTMLElement) ||
      !(control instanceof HTMLElement) ||
      !(shell instanceof HTMLElement) ||
      !(selected instanceof HTMLElement)
    ) {
      throw new Error('readWritingCategoryPickerLayout: missing nodes');
    }

    const pickerRect = picker.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const rowRect = row.getBoundingClientRect();
    const captionRect = caption.getBoundingClientRect();
    const controlRect = control.getBoundingClientRect();
    const shellRect = shell.getBoundingClientRect();
    const selectedRect = selected.getBoundingClientRect();
    const titleRect =
      title instanceof HTMLElement ? title.getBoundingClientRect() : null;
    const placeholderRect =
      placeholder instanceof HTMLElement
        ? placeholder.getBoundingClientRect()
        : null;

    const slotRaw = getComputedStyle(picker)
      .getPropertyValue('--writing-category-slot-width')
      .trim();
    const slotWidthPx = Number.parseFloat(slotRaw);

    return {
      pickerLeft: pickerRect.left,
      pickerRight: pickerRect.right,
      panelLeft: panelRect.left,
      panelRight: panelRect.right,
      rowLeft: rowRect.left,
      captionLeft: captionRect.left,
      titleLeft: titleRect?.left ?? null,
      placeholderLeft: placeholderRect?.left ?? null,
      controlWidth: controlRect.width,
      shellWidth: shellRect.width,
      shellLeft: shellRect.left,
      selectedOptionLeft: selectedRect.left,
      slotWidthPx,
      isOpen: picker.classList.contains('writing-category-picker--open'),
      selectedCategory: selected.dataset.category ?? null,
    };
  });
}

/** Wait until JS has measured labels into a pixel `--writing-category-slot-width`. */
export async function waitForWritingCategoryPickerSlotReady(
  page: Page,
): Promise<void> {
  await expect
    .poll(
      async () =>
        page.evaluate(() => {
          const picker = document.querySelector('.writing-category-picker');
          const control = document.querySelector(
            '.writing-category-picker__control',
          );
          if (
            !(picker instanceof HTMLElement) ||
            !(control instanceof HTMLElement)
          ) {
            return 0;
          }
          const slotRaw = getComputedStyle(picker)
            .getPropertyValue('--writing-category-slot-width')
            .trim();
          if (!slotRaw.endsWith('px')) return 0;
          const slotPx = Number.parseFloat(slotRaw);
          if (!(slotPx > 0)) return 0;
          const controlWidth = control.getBoundingClientRect().width;
          const ratio = Math.abs(controlWidth - slotPx) / Math.max(slotPx, 1);
          return ratio < 0.2 ? slotPx : 0;
        }),
      { timeout: 5000 },
    )
    .toBeGreaterThan(20);
}

/** Wait until open control width settles near 2× the measured slot. */
export async function waitForWritingCategoryPickerExpanded(
  page: Page,
): Promise<void> {
  await expect
    .poll(
      async () => {
        const layout = await readWritingCategoryPickerLayout(page);
        if (!layout.isOpen || !(layout.slotWidthPx > 0)) return 0;
        return layout.controlWidth / (2 * layout.slotWidthPx);
      },
      { timeout: 2000 },
    )
    .toBeGreaterThan(0.92);
}

export type WritingCategoryPickerWidthSample = {
  t: number;
  controlWidth: number;
  groupsVisible: boolean;
  pickerReady: boolean;
  groupsOpacity: number;
};

/**
 * Start sampling the category-control width from the first DOM paint.
 * Call before `page.goto('/writing')`.
 */
export async function installWritingCategoryPickerWidthProbe(
  page: Page,
): Promise<void> {
  await page.addInitScript(() => {
    type Sample = {
      t: number;
      controlWidth: number;
      groupsVisible: boolean;
      pickerReady: boolean;
      groupsOpacity: number;
    };

    const win = window as Window & {
      __writingPickerWidthLog?: Sample[];
    };
    win.__writingPickerWidthLog = [];

    const sample = () => {
      const control = document.querySelector(
        '.writing-category-picker__control',
      );
      const groups = document.querySelector('.writing-page .writing-groups');
      const picker = document.querySelector('.writing-category-picker');
      if (!(control instanceof HTMLElement)) return;

      const groupsOpacity =
        groups instanceof HTMLElement
          ? Number.parseFloat(getComputedStyle(groups).opacity)
          : 0;

      win.__writingPickerWidthLog!.push({
        t: performance.now(),
        controlWidth: control.getBoundingClientRect().width,
        groupsVisible:
          groups instanceof HTMLElement &&
          groups.classList.contains('writing-groups--visible'),
        pickerReady:
          picker instanceof HTMLElement &&
          picker.classList.contains('writing-category-picker--ready'),
        groupsOpacity: Number.isFinite(groupsOpacity) ? groupsOpacity : 0,
      });
    };

    const start = () => {
      const observer = new MutationObserver(sample);
      observer.observe(document.documentElement, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ['class', 'style'],
      });
      const tick = () => {
        sample();
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', start, { once: true });
    } else {
      start();
    }
  });
}

export async function readWritingCategoryPickerWidthLog(
  page: Page,
): Promise<WritingCategoryPickerWidthSample[]> {
  return page.evaluate(() => {
    const win = window as Window & {
      __writingPickerWidthLog?: Array<{
        t: number;
        controlWidth: number;
        groupsVisible: boolean;
        pickerReady: boolean;
        groupsOpacity: number;
      }>;
    };
    return [...(win.__writingPickerWidthLog ?? [])];
  });
}
