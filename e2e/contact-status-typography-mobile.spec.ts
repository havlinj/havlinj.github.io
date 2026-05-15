import { test } from '@playwright/test';
import {
  expectContactStatusTypography,
  showContactStatus,
} from './helpers/contact-status-layout';

test('contact status padding and line-height (project mobile viewport)', async ({
  page,
}) => {
  await page.goto('/contact/form');
  await showContactStatus(page, 'message_length');
  await expectContactStatusTypography(page);
});
