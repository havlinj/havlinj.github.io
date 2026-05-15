import { test } from '@playwright/test';
import { expectContactStatusTypographyBothMedia } from './helpers/contact-status-layout';

test('contact status padding and line-height (desktop + mobile viewports)', async ({
  page,
}) => {
  await expectContactStatusTypographyBothMedia(page);
});
