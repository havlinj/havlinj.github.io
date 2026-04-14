import { test, expect } from '@playwright/test';
import { RGB_INK, RGB_PAGE_BG } from '../src/constants/colors';
import { LAYOUT_TOLERANCE, MIN_GAP, MAX_GAP } from './constants';
import {
  expectNavLinkActive,
  fillContactFormWithValidData,
  gotoProfileWhenReady,
  installTurnstileResetCounter,
  mustBox,
  readTurnstileResetCount,
} from './helpers';

// ---------------------------------------------------------------------------
// Profile page (/profile, /why)
// ---------------------------------------------------------------------------

test.describe('Profile page (/profile, /why)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/profile');
  });

  test('shows navbar with active Profile (no Home in header)', async ({
    page,
  }) => {
    await expect(page.locator('.site-header')).toBeVisible();
    await expect(
      page.locator('.site-header__inner').getByRole('link', { name: 'Home' }),
    ).toHaveCount(0);
    await expectNavLinkActive(page, 'Profile');
  });

  test('has portrait, Why, What I do, Foundations links', async ({ page }) => {
    await expect(page.getByRole('img', { name: 'Jan Havlín' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Why' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'What I do' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Foundations' })).toBeVisible();
  });

  test('profile article uses 2x2 clickable-tile layout', async ({ page }) => {
    await expect(page.locator('article.has-buttons-panel')).toBeVisible();
    await expect(page.locator('.profile-section')).toBeVisible();
    await expect(page.getByRole('img', { name: 'Jan Havlín' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Why' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'What I do' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Foundations' })).toBeVisible();
  });

  test('profile section loses loading class after portrait handling', async ({
    page,
  }) => {
    await gotoProfileWhenReady(page);
  });

  test('profile section - last screenshot matches', async ({ page }) => {
    await gotoProfileWhenReady(page);
    // Keep historical snapshot stable: Settings footer link is unrelated to profile tile visual.
    await page.addStyleTag({
      content: '.site-footer__settings { display: none !important; }',
    });
    // Stabilize autoplay media in profile tiles for deterministic snapshots.
    await page.evaluate(() => {
      document.querySelectorAll('video').forEach((node) => {
        if (node instanceof HTMLVideoElement) {
          node.pause();
          node.currentTime = 0;
        }
      });
    });
    await expect(page).toHaveScreenshot('profile-section.png');
  });

  test('What I do page has heading and profile-active navbar', async ({
    page,
  }) => {
    await page.goto('/what-i-do');
    await expect(
      page.getByRole('heading', { name: 'What I do', level: 1 }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Profile' })).toHaveClass(
      /site-nav__link--active/,
    );
  });

  test('site-header: Profile, Writing, Contact spread across', async ({
    page,
  }) => {
    const inner = page.locator('.site-header__inner');
    await expect(inner).toBeVisible();
    const profile = inner.getByRole('link', { name: 'Profile' });
    const writing = inner.getByRole('link', { name: 'Writing' });
    const contact = inner.getByRole('link', { name: 'Contact' });
    const box = await mustBox(inner);
    const pBox = await mustBox(profile);
    const wBox = await mustBox(writing);
    const cBox = await mustBox(contact);
    expect(pBox.x).toBeLessThanOrEqual(box.x + LAYOUT_TOLERANCE);
    expect(pBox.x).toBeLessThanOrEqual(wBox.x + LAYOUT_TOLERANCE);
    expect(wBox.x).toBeLessThanOrEqual(cBox.x + LAYOUT_TOLERANCE);
    expect(cBox.x + cBox.width).toBeGreaterThanOrEqual(
      box.x + box.width - LAYOUT_TOLERANCE,
    );
  });

  test('navbar: Profile, Writing, Contact only; Home link in footer', async ({
    page,
  }) => {
    await expect(page.locator('.site-header a[href="/"]')).toHaveCount(0);
    await expect(page.locator('.site-header a[href="/profile"]')).toBeVisible();
    await expect(page.locator('.site-header a[href="/writing"]')).toBeVisible();
    await expect(page.locator('.site-header a[href="/contact"]')).toBeVisible();
    const footerHome = page.locator('footer.site-footer a.site-footer__home');
    await expect(footerHome).toHaveAttribute('href', '/');
    await expect(footerHome).toHaveText('Home');
  });

  test('profile tiles are positioned as Why TL, Portrait TR, What I do BL, Foundations BR', async ({
    page,
  }) => {
    await gotoProfileWhenReady(page);
    const profileSection = page.locator('.profile-section');
    await expect(profileSection).toBeVisible();
    const why = profileSection.getByRole('link', { name: 'Why' });
    const whatIDo = profileSection.getByRole('link', { name: 'What I do' });
    const foundations = profileSection.getByRole('link', {
      name: 'Foundations',
    });
    const portrait = profileSection.getByRole('img', { name: 'Jan Havlín' });
    await expect(why).toBeVisible();
    await expect(whatIDo).toBeVisible();
    await expect(foundations).toBeVisible();
    await expect(portrait).toBeVisible();
    const whyBox = await mustBox(why);
    const proBox = await mustBox(whatIDo);
    const perBox = await mustBox(foundations);
    const portraitBox = await mustBox(portrait);

    expect(whyBox.x).toBeLessThan(portraitBox.x);
    expect(proBox.x).toBeLessThan(perBox.x);
    expect(whyBox.y).toBeLessThan(proBox.y);
    expect(portraitBox.y).toBeLessThan(perBox.y);
  });

  test('Why (/why) has active Profile in navbar', async ({ page }) => {
    await page.goto('/why');
    await expect(page.locator('.site-header')).toBeVisible();
    await expectNavLinkActive(page, 'Profile');
  });
});

// ---------------------------------------------------------------------------
// Writing page (/writing)
// ---------------------------------------------------------------------------

test.describe('Writing page (/writing)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/writing');
    await expect(
      page.locator('.writing-groups.writing-groups--visible'),
    ).toBeVisible({ timeout: 10000 });
  });

  test('shows navbar with active Writing and article list', async ({
    page,
  }) => {
    await expect(page.locator('.site-header')).toBeVisible();
    await expectNavLinkActive(page, 'Writing');
    await expect(
      page.getByRole('heading', { name: 'Writing', level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: /System Thinking, Applied/ }),
    ).toBeVisible();
  });

  test('gaps between navbar, title, content', async ({ page }) => {
    const nav = page.locator('.site-header');
    const title = page.getByRole('heading', { name: 'Writing', level: 1 });
    const list = page.locator('.writing-groups .post-list').first();
    await expect(nav).toBeVisible();
    await expect(title).toBeVisible();
    await expect(list).toBeVisible();
    const nBox = await mustBox(nav);
    const tBox = await mustBox(title);
    const lBox = await mustBox(list);
    const gapNavToTitle = tBox.y - (nBox.y + nBox.height);
    const gapTitleToContent = lBox.y - (tBox.y + tBox.height);
    expect(gapNavToTitle).toBeGreaterThanOrEqual(MIN_GAP);
    expect(gapNavToTitle).toBeLessThanOrEqual(MAX_GAP);
    expect(gapTitleToContent).toBeGreaterThanOrEqual(MIN_GAP);
    expect(gapTitleToContent).toBeLessThanOrEqual(MAX_GAP);
  });

  test('writing page has panel zone and article list with page buttons', async ({
    page,
  }) => {
    await expect(page.locator('article.writing-page')).toBeVisible();
    await expect(page.locator('.page-buttons-zone')).toBeVisible();
    await expect(page.locator('.page-buttons-panel')).toBeVisible();
    const featuredList = page.getByRole('list', {
      name: 'Featured articles',
    });
    const articlesList = page.getByRole('list', {
      name: 'Articles',
      exact: true,
    });
    await expect(featuredList).toBeVisible();
    await expect(articlesList).toBeVisible();
    await expect(featuredList.locator('a.page-button')).toHaveCount(2);
    await expect(articlesList.locator('a.page-button')).toHaveCount(1);
    await expect(
      page.getByRole('link', { name: /System Thinking, Applied/ }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: /Example Article/ }),
    ).toBeVisible();
  });

  test('each writing list link targets /blog/ slug', async ({ page }) => {
    const links = page.locator('.post-list a.page-button');
    const n = await links.count();
    expect(n).toBeGreaterThanOrEqual(1);
    for (let i = 0; i < n; i++) {
      await expect(links.nth(i)).toHaveAttribute('href', /^\/blog\//);
    }
  });

  test('each writing row shows a date on the same line as the title', async ({
    page,
  }) => {
    const links = page.locator('.writing-groups .post-list a.page-button');
    const n = await links.count();
    expect(n).toBeGreaterThanOrEqual(1);
    for (let i = 0; i < n; i++) {
      const link = links.nth(i);
      const dateEl = link.locator('time.page-button__date');
      await expect(dateEl).toHaveCount(1);
      await expect(dateEl).toHaveAttribute(
        'datetime',
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
      );
      await expect(dateEl).toHaveText(/\S/);
    }
  });

  test('writing rows keep crisp label rendering (padding, no subpixel translate)', async ({
    page,
  }) => {
    const links = page.locator('.writing-groups .post-list a.page-button');
    const n = await links.count();
    expect(n).toBeGreaterThanOrEqual(1);
    for (let i = 0; i < n; i++) {
      const link = links.nth(i);
      const inner = link.locator('.page-button__inner');
      const title = link.locator('.page-button__text');
      const dateEl = link.locator('.page-button__date');
      await expect(inner).toHaveCSS('padding-top', '2px');
      await expect(inner).toHaveCSS('padding-bottom', '2px');
      await expect(title).toHaveCSS('transform', 'none');
      await expect(dateEl).toHaveCSS('transform', 'none');
      await expect(title).toHaveCSS('-webkit-font-smoothing', 'antialiased');
      await expect(dateEl).toHaveCSS('-webkit-font-smoothing', 'antialiased');
    }
  });

  test('writing buttons invert colors on hover', async ({ page }) => {
    const button = page
      .getByRole('link', { name: /System Thinking, Applied/ })
      .first();
    const text = button.locator('.page-button__text');
    const bg = button.locator('.page-button__bg');

    await expect(button).toBeVisible();
    /* Writing index title uses near-black ink with slight transparency */
    await expect(text).toHaveCSS(
      'color',
      /rgba\(17,\s*17,\s*17,\s*0\.(?:8[0-9]*|9[0-9]*)\)|rgb\(17,\s*17,\s*17\)/,
    );
    await expect(bg).toHaveCSS('background-color', RGB_PAGE_BG);

    await button.hover();

    await expect(text).toHaveCSS('color', RGB_PAGE_BG);
    await expect(bg).toHaveCSS('background-color', RGB_INK);
  });

  test('writing background rotates across visits using localStorage index', async ({
    page,
  }) => {
    await page.evaluate(() => {
      window.localStorage.removeItem('writing-bg-index');
    });
    await page.reload();

    const firstBg = await page.evaluate(() => {
      const article = document.querySelector('article.writing-page');
      if (!article) return '';
      return getComputedStyle(article).getPropertyValue('--panel-bg').trim();
    });
    const firstIndex = await page.evaluate(() =>
      window.localStorage.getItem('writing-bg-index'),
    );

    await page.goto('/writing');
    const secondBg = await page.evaluate(() => {
      const article = document.querySelector('article.writing-page');
      if (!article) return '';
      return getComputedStyle(article).getPropertyValue('--panel-bg').trim();
    });
    const secondIndex = await page.evaluate(() =>
      window.localStorage.getItem('writing-bg-index'),
    );

    expect(firstBg).toMatch(/url\(.+\)/);
    expect(secondBg).toMatch(/url\(.+\)/);
    // When pool has at least 2 images, background should advance.
    expect(secondBg).not.toBe(firstBg);
    expect(firstIndex).not.toBeNull();
    expect(secondIndex).not.toBeNull();
    expect(firstIndex).not.toBe(secondIndex);
  });
});

// ---------------------------------------------------------------------------
// Credits page (/credits)
// ---------------------------------------------------------------------------

test.describe('Credits page (/credits)', () => {
  test('shows heading, footer link, and navbar', async ({ page }) => {
    await page.goto('/credits');
    await expect(
      page.getByRole('heading', { name: 'Credits', level: 1 }),
    ).toBeVisible();
    await expect(page.locator('.site-header')).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Credits' }).first(),
    ).toBeVisible();
  });

  test('renders photos/videos sections and updated attributions', async ({
    page,
  }) => {
    await page.goto('/credits');
    await expect(
      page.getByRole('heading', { name: 'Photos', level: 3 }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Videos', level: 3 }),
    ).toBeVisible();
    await expect(page.getByText('AltumCode')).toBeVisible();
    await expect(page.getByText('Tommy')).toBeVisible();
    await expect(page.getByText('Evgeniy Sholokh')).toBeVisible();
    await expect(page.getByText('Joschka Silzle')).toBeVisible();
    await expect(page.getByText('Raddy')).toBeVisible();
    await expect(page.getByText('Nicola Narracci')).toBeVisible();
  });

  test('footer credits link navigates to /credits', async ({ page }) => {
    await page.goto('/writing');
    const footerCredits = page.locator(
      'footer.site-footer a.site-footer__credits',
    );
    await expect(footerCredits).toBeVisible();
    await footerCredits.click();
    await expect(page).toHaveURL(/\/credits$/);
  });
});

// ---------------------------------------------------------------------------
// Contact page (/contact)
// ---------------------------------------------------------------------------

test.describe('Contact page (/contact)', () => {
  test.beforeEach(async ({ page }) => {
    // Turnstile loads from Cloudflare; waiting on it makes `goto` slow and flaky under load.
    await page.route('**/challenges.cloudflare.com/**', (route) =>
      route.abort(),
    );
  });

  test('shows navbar with active Contact', async ({ page }) => {
    await page.goto('/contact');
    await expect(page.locator('.site-header')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Contact' })).toHaveClass(
      /site-nav__link--active/,
    );
  });

  test('shows Contact as page heading', async ({ page }) => {
    await page.goto('/contact');
    await expect(
      page.getByRole('heading', { name: 'Contact', level: 1 }),
    ).toBeVisible();
  });

  test('shows intro text and contact form fields', async ({ page }) => {
    await page.goto('/contact');

    await expect(
      page.getByText(
        'Feel free to reach out about engineering, architecture, or opportunities.',
      ),
    ).toBeVisible();

    await expect(page.getByLabel('Name')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Message')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send' })).toBeVisible();

    // Turnstile placeholder should be present in the DOM (widget can stay hidden in headless).
    await expect(page.locator('.cf-turnstile')).toHaveCount(1);
  });

  test('shows first intro line and contact form id', async ({ page }) => {
    await page.goto('/contact');
    await expect(page.getByText('Glad you stopped by.')).toBeVisible();
    await expect(page.locator('#contact-form')).toBeVisible();
    await expect(page.locator('#contact-form')).toHaveAttribute(
      'novalidate',
      '',
    );
    await expect(page.locator('#contact-form')).toHaveAttribute(
      'autocomplete',
      'off',
    );
  });

  test('send status is rendered inline next to Send button', async ({ page }) => {
    await page.goto('/contact');
    const actions = page.locator('#contact-form .contact-form__actions');
    const send = actions.getByRole('button', { name: 'Send' });
    const status = actions.locator('#status');
    await expect(actions).toBeVisible();
    await expect(send).toBeVisible();
    await expect(status).toBeAttached();
    await expect(status).toHaveAttribute('role', 'status');
    await expect(status).toHaveAttribute('aria-live', 'polite');
    await expect(status).toHaveText('');
  });

  test('honeypot company field is hidden from a11y tree', async ({ page }) => {
    await page.goto('/contact');
    const company = page.locator('#contact-form input[name="company"]');
    const hiddenWrapper = page.locator('#contact-form .hidden');
    await expect(company).toBeAttached();

    // We expect the honeypot to be visually "hidden" via the `.hidden` class
    // (offscreen position + 1x1 sizing). `input` itself can still report a
    // larger box due to its own intrinsic layout, so we validate the wrapper.
    await expect(company).toHaveAttribute('tabindex', '-1');
    await expect(company).toHaveAttribute('autocomplete', 'off');
    await expect(company).toHaveAttribute('inputmode', 'none');
    await expect(hiddenWrapper).toBeVisible(); // attached; wrapper exists in DOM

    const wrapperBox = await hiddenWrapper.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    });
    expect(wrapperBox.width).toBeLessThanOrEqual(2);
    expect(wrapperBox.height).toBeLessThanOrEqual(2);
    expect(wrapperBox.x).toBeLessThanOrEqual(-9990);
  });

  test('status region is present and empty before submit', async ({ page }) => {
    await page.goto('/contact');
    const status = page.locator('#status');
    await expect(status).toBeAttached();
    await expect(status).toHaveText('');
  });

  test('contact field autocomplete policy is set as intended', async ({
    page,
  }) => {
    await page.goto('/contact');
    await expect(page.getByLabel('Name')).toHaveAttribute('autocomplete', 'name');
    await expect(page.getByLabel('Email')).toHaveAttribute(
      'autocomplete',
      'email',
    );
    await expect(page.getByLabel('Message')).toHaveAttribute(
      'autocomplete',
      'off',
    );
  });

  test('after load: org links and intro text below Send', async ({ page }) => {
    await page.goto('/contact');
    await expect(
      page.getByText('You can also find me on:', { exact: true }),
    ).toBeVisible();
    const extra = page.locator('.contact-extra-links');
    await expect(extra).toBeVisible();
    const github = extra.getByRole('link', { name: /GitHub/i });
    const linkedin = extra.getByRole('link', { name: /LinkedIn/i });
    await expect(github).toBeVisible();
    await expect(linkedin).toBeVisible();
    await expect(github.locator('img[alt="GitHub"]')).toBeVisible();
    await expect(linkedin.locator('img[alt="LinkedIn"]')).toBeVisible();
    await expect(github.locator('img')).toHaveAttribute(
      'src',
      '/assets/pages/contact/github.svg',
    );
    await expect(linkedin.locator('img')).toHaveAttribute(
      'src',
      '/assets/pages/contact/InBug-Black.png',
    );
    await expect(github).toHaveAttribute('href', 'https://github.com/havlinj');
    await expect(linkedin).toHaveAttribute(
      'href',
      'https://www.linkedin.com/in/jan-havlin',
    );
    await expect(github).toHaveAttribute('target', '_blank');
    await expect(linkedin).toHaveAttribute('target', '_blank');
    await expect(github).toHaveAttribute('rel', /noopener/);
    await expect(linkedin).toHaveAttribute('rel', /noopener/);
  });

  test('submits to /api/contact, sends form payload, and shows success', async ({
    page,
  }) => {
    let payload = '';
    await page.route('**/api/contact', async (route) => {
      payload = route.request().postData() || '';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.goto('/contact');
    await fillContactFormWithValidData(page);

    await page.getByRole('button', { name: 'Send' }).click();
    await expect(page.locator('#status')).toHaveText(
      'Thanks! Your message has been sent.',
    );

    expect(payload).toContain('name="name"');
    expect(payload).toContain('Jan Test');
    expect(payload).toContain('name="email"');
    expect(payload).toContain('jan@example.com');
    expect(payload).toContain('name="message"');
    expect(payload).toContain('test message long enough');
    expect(payload).toContain('name="company"');

    await expect(page.getByLabel('Name')).toHaveValue('');
    await expect(page.getByLabel('Email')).toHaveValue('');
    await expect(page.getByLabel('Message')).toHaveValue('');
  });

  test('after success, contact fields are replaced with new empty nodes', async ({
    page,
  }) => {
    await page.route('**/api/contact', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.goto('/contact');
    await fillContactFormWithValidData(page);

    const nameBefore = await page
      .locator('#contact-form input[name="name"]')
      .elementHandle();
    const emailBefore = await page
      .locator('#contact-form input[name="email"]')
      .elementHandle();
    const messageBefore = await page
      .locator('#contact-form textarea[name="message"]')
      .elementHandle();

    expect(nameBefore).toBeTruthy();
    expect(emailBefore).toBeTruthy();
    expect(messageBefore).toBeTruthy();

    await page.getByRole('button', { name: 'Send' }).click();
    await expect(page.locator('#status')).toHaveText(
      'Thanks! Your message has been sent.',
    );

    const replaced = await page.evaluate(
      ([nameEl, emailEl, msgEl]) => {
        const nameNow = document.querySelector(
          '#contact-form input[name="name"]',
        );
        const emailNow = document.querySelector(
          '#contact-form input[name="email"]',
        );
        const msgNow = document.querySelector(
          '#contact-form textarea[name="message"]',
        );
        return (
          nameNow !== nameEl &&
          emailNow !== emailEl &&
          msgNow !== msgEl &&
          nameNow instanceof HTMLInputElement &&
          emailNow instanceof HTMLInputElement &&
          msgNow instanceof HTMLTextAreaElement &&
          nameNow.value === '' &&
          emailNow.value === '' &&
          msgNow.value === ''
        );
      },
      [nameBefore, emailBefore, messageBefore],
    );

    expect(replaced).toBe(true);
  });

  test('shows API error and resets turnstile only when requested', async ({
    page,
  }) => {
    await page.route('**/api/contact', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: false,
          error: 'Validation failed.',
          resetTurnstile: true,
        }),
      });
    });

    await page.goto('/contact');
    await installTurnstileResetCounter(page);
    await fillContactFormWithValidData(page);
    await page.getByRole('button', { name: 'Send' }).click();

    await expect(page.locator('#status')).toHaveText('Validation failed.');
    const resets = await readTurnstileResetCount(page);
    expect(resets).toBe(1);
  });

  test('shows network error and resets turnstile', async ({ page }) => {
    await page.route('**/api/contact', async (route) => {
      await route.abort();
    });

    await page.goto('/contact');
    await installTurnstileResetCounter(page);
    await fillContactFormWithValidData(page);
    await page.getByRole('button', { name: 'Send' }).click();

    await expect(page.locator('#status')).toHaveText(
      'Network error. Please try again.',
    );
    const resets = await readTurnstileResetCount(page);
    expect(resets).toBe(1);
  });

  test('prevents double submit while request is pending', async ({ page }) => {
    let requests = 0;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    await page.route('**/api/contact', async (route) => {
      requests += 1;
      await gate;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.goto('/contact');
    await fillContactFormWithValidData(page);

    const send = page.getByRole('button', { name: 'Send' });
    await page.evaluate(() => {
      const form = document.querySelector('#contact-form') as HTMLFormElement;
      form.dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true }),
      );
      form.dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true }),
      );
    });
    await expect(send).toBeDisabled();
    await page.waitForTimeout(120);
    expect(requests).toBe(1);

    release();
    await expect(page.locator('#status')).toHaveText(
      'Thanks! Your message has been sent.',
    );
    await expect(send).toBeEnabled();
  });
});
