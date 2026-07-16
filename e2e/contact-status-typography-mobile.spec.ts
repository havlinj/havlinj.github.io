import { test } from '@playwright/test';
import { gotoContactForm } from './helpers/contact';
import {
  expectContactStatusTypography,
  showContactStatus,
} from './helpers/contact-status-layout';

test('contact status padding and line-height (project mobile viewport)', async ({
  page,
}) => {
  await gotoContactForm(page);
  await showContactStatus(page, 'message_length');
  await expectContactStatusTypography(page);
});
