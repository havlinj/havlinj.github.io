import { test, expect } from '@playwright/test';
import { gotoWhyWhenReady } from './helpers';

test.describe('/why page', () => {
  test.beforeEach(async ({ page }) => {
    await gotoWhyWhenReady(page);
  });

  test('shows Why title, lead copy, and GIF asset', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: 'Why', level: 1 }),
    ).toBeVisible();
    await expect(page.locator('.why-page p.why-lead')).toHaveText(
      "I'm a software engineer.",
    );
    const gif = page.locator('.why-page .why-gif');
    await expect(gif).toBeVisible();
    await expect(gif).toHaveAttribute(
      'src',
      /\/assets\/pages\/profile\/why\/.+\.gif/,
    );
  });

  test('GIF frame and box use panel background #111', async ({ page }) => {
    const box = page.locator('.why-page .why-box');
    const frame = page.locator('.why-page .why-gif-frame');
    await expect(box).toHaveCSS('background-color', 'rgb(17, 17, 17)');
    await expect(frame).toHaveCSS('background-color', 'rgb(17, 17, 17)');
  });

  test('GIF holder is out of flow; JS sets scroll pad and intro GIF band', async ({
    page,
  }) => {
    const holder = page.locator('.why-page .why-gif-holder');
    await expect(holder).toHaveCSS('position', 'absolute');

    const metrics = await page.evaluate(() => {
      const content = document.querySelector('.why-page .why-content');
      const intro = document.querySelector('.why-page .why-block--intro');
      const wrapper = document.querySelector('.why-page .why-wrapper');
      if (!content || !intro || !wrapper) return null;
      const cs = getComputedStyle(content);
      const introPad = getComputedStyle(intro).paddingTop;
      return {
        scrollPad: cs.getPropertyValue('--why-scroll-pad-top').trim(),
        introGifPad: cs.getPropertyValue('--why-intro-gif-pad').trim(),
        introPaddingTop: introPad,
        gifTopInset: getComputedStyle(wrapper)
          .getPropertyValue('--why-gif-top-inset')
          .trim(),
      };
    });

    expect(metrics).not.toBeNull();
    expect(metrics!.scrollPad).toMatch(/^\d+(\.\d+)?px$/);
    expect(parseFloat(metrics!.scrollPad)).toBeGreaterThan(0);
    expect(metrics!.introGifPad).toMatch(/^\d+(\.\d+)?px$/);
    expect(parseFloat(metrics!.introGifPad)).toBeGreaterThan(0);
    expect(metrics!.gifTopInset).toBe('2.3rem');
    expect(parseFloat(metrics!.introPaddingTop)).toBeCloseTo(
      parseFloat(metrics!.introGifPad),
      0,
    );
  });

  test('GIF corner overlays use box-bg gradient (not an empty stack)', async ({
    page,
  }) => {
    const afterBg = await page.evaluate(() => {
      const frame = document.querySelector('.why-page .why-gif-frame');
      if (!frame) return '';
      return getComputedStyle(frame, '::after').backgroundImage;
    });
    expect(afterBg).toMatch(/linear-gradient/i);
  });

  test('paragraphs overlapping scroll CTA fade (line opacity)', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.setViewportSize({ width: 960, height: 460 });
    await gotoWhyWhenReady(page);

    const overlap = await page.evaluate(async () => {
      const scrollEl = document.querySelector(
        '.why-page .why-scroll',
      ) as HTMLElement | null;
      const box = document.querySelector('.why-page .why-box');
      if (!scrollEl || !box) return null;

      const waitFrames = () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        });

      const scrollTops = [0, 8, 16, 24, 32];

      for (const top of scrollTops) {
        scrollEl.scrollTop = top;
        await waitFrames();

        const ctaOp = parseFloat(
          getComputedStyle(box).getPropertyValue('--why-cta-opacity').trim() ||
            '1',
        );
        if (ctaOp <= 0.08) continue;

        const ps = [...scrollEl.querySelectorAll('p')];
        let minOp = 1;
        for (const p of ps) {
          const o = parseFloat(getComputedStyle(p).opacity);
          if (o < minOp) minOp = o;
        }
        if (minOp < 0.96) {
          return { ok: true as const, scrollTop: top, ctaOp, minOp };
        }
      }

      return {
        ok: false as const,
        reason: 'no paragraph opacity drop while CTA visible',
      };
    });

    expect(overlap).not.toBeNull();
    expect(overlap!.ok).toBe(true);
  });
});
