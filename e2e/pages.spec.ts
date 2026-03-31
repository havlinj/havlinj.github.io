import { test, expect } from '@playwright/test';
import { LAYOUT_TOLERANCE, MIN_GAP, MAX_GAP } from './constants';
import { expectNavLinkActive, gotoProfileWhenReady, mustBox } from './helpers';

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
      page.getByRole('link', { name: 'Reflection on Building Systems' }),
    ).toBeVisible();
  });

  test('gaps between navbar, title, content', async ({ page }) => {
    const nav = page.locator('.site-header');
    const title = page.getByRole('heading', { name: 'Writing', level: 1 });
    const list = page.locator('.post-list');
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
    const list = page.getByRole('list', { name: 'Articles' });
    await expect(list).toBeVisible();
    const buttons = list.locator('a.page-button');
    await expect(buttons).toHaveCount(2);
    await expect(
      page.getByRole('link', { name: 'Reflection on Building Systems' }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Example Article' }),
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

  test('writing buttons invert colors on hover', async ({ page }) => {
    const button = page
      .getByRole('link', { name: 'Reflection on Building Systems' })
      .first();
    const text = button.locator('.page-button__text');
    const bg = button.locator('.page-button__bg');

    await expect(button).toBeVisible();
    await expect(text).toHaveCSS('color', 'rgb(17, 17, 17)');
    await expect(bg).toHaveCSS('background-color', 'rgb(224, 247, 250)');

    await button.hover();

    await expect(text).toHaveCSS('color', 'rgb(224, 247, 250)');
    await expect(bg).toHaveCSS('background-color', 'rgb(17, 17, 17)');
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

  test('renders photos section and core attributions', async ({ page }) => {
    await page.goto('/credits');
    await expect(
      page.getByRole('heading', { name: 'Photos', level: 3 }),
    ).toBeVisible();
    await expect(page.getByText('AltumCode')).toBeVisible();
    await expect(page.getByText('Dillon Shook')).toBeVisible();
    await expect(page.getByText('Tai Bui')).toBeVisible();
    await expect(page.getByText('Joschka Silzle')).toBeVisible();
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

    // Turnstile placeholder should be present in the DOM
    await expect(page.locator('.cf-turnstile')).toBeVisible();
  });

  test('shows first intro line and contact form id', async ({ page }) => {
    await page.goto('/contact');
    await expect(page.getByText('Glad you stopped by.')).toBeVisible();
    await expect(page.locator('#contact-form')).toBeVisible();
    await expect(page.locator('#contact-form')).toHaveAttribute(
      'novalidate',
      '',
    );
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
    await expect(status).toBeVisible();
    await expect(status).toHaveText('');
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
  });
});
