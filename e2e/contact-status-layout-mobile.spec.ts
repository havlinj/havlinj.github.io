import { test } from '@playwright/test';
import { gotoContactForm } from './helpers/contact';
import {
  allContactErrorCodes,
  expectStatusFitsSendSlot,
  showContactStatus,
} from './helpers/contact-status-layout';

for (const code of allContactErrorCodes()) {
  test(`error status "${code}" fits beside Send (mobile)`, async ({ page }) => {
    await gotoContactForm(page);
    await showContactStatus(page, code);
    await expectStatusFitsSendSlot(page);
  });
}
