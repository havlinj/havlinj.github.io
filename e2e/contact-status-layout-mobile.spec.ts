import { test } from '@playwright/test';
import {
  allContactErrorCodes,
  expectStatusFitsSendSlot,
  showContactStatus,
} from './helpers/contact-status-layout';

for (const code of allContactErrorCodes()) {
  test(`error status "${code}" fits beside Send (mobile)`, async ({ page }) => {
    await page.goto('/contact/form');
    await showContactStatus(page, code);
    await expectStatusFitsSendSlot(page);
  });
}
