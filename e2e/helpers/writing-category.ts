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

  await page.locator('.writing-category-picker__shell').click();
  await expect(page.locator('.writing-category-picker')).toHaveClass(
    /writing-category-picker--open/,
  );
  await option.click();
  await expect(page.locator('.writing-category-picker')).not.toHaveClass(
    /writing-category-picker--open/,
    { timeout: 3000 },
  );
  await expect(option).toHaveAttribute('aria-selected', 'true');
}
