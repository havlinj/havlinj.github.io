import { expect, test } from '@playwright/test';
import {
  fillContactFormWithValidData,
  gotoContactForm,
  mockContactApiDelayedSuccess,
  submitContactForm,
} from './helpers/contact';
import { CONTACT_UI_MESSAGES } from '../src/lib/contact-status';

test('submit shows sending status and pending class until API completes', async ({
  page,
}) => {
  const { release } = await mockContactApiDelayedSuccess(page);
  await gotoContactForm(page);
  await fillContactFormWithValidData(page);
  await submitContactForm(page);

  const status = page.locator('#status');
  await expect(status).toHaveAttribute('data-status-code', 'sending');
  await expect(status).toHaveClass(/contact-status--pending/);
  await expect(status).toHaveText(CONTACT_UI_MESSAGES.sending);

  release();
  await expect(status).toHaveText(CONTACT_UI_MESSAGES.success);
  await expect(status).toHaveAttribute('data-status-code', 'success');
});
