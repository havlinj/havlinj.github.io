import { test, expect, type Page } from '@playwright/test';
import {
  LAYOUT_TOLERANCE,
  WHY_CTA_EDGE_MIN_PX,
  WHY_CTA_EDGE_WIDTH_FRAC,
  WHY_CTA_LEAD_TRACK,
  WHY_GIF_TOP_INSET,
  WHY_SCROLL_CTA_CONTAINER_CQW,
} from './constants';
import { RGB_INK } from '../src/constants/colors';
import { WHY_FIT_REFERENCE_LINE } from '../src/constants/why-fit-reference';
import { gotoWhyWhenReady, waitTwoFrames } from './helpers';

async function setWhyScrollTop(page: Page, top: number): Promise<void> {
  await page.evaluate((value) => {
    const scroll = document.querySelector(
      '.why-page .why-scroll',
    ) as HTMLElement;
    scroll.scrollTop = value;
    scroll.dispatchEvent(new Event('scroll', { bubbles: true }));
  }, top);
}

async function setWhyScrollBottom(page: Page): Promise<void> {
  await page.evaluate(() => {
    const scroll = document.querySelector(
      '.why-page .why-scroll',
    ) as HTMLElement;
    scroll.scrollTop = Math.max(0, scroll.scrollHeight - scroll.clientHeight);
    scroll.dispatchEvent(new Event('scroll', { bubbles: true }));
  });
}

test.describe('/why page @serial', () => {
  test.beforeEach(async ({ page }) => {
    await gotoWhyWhenReady(page);
  });

  test('reveals Why content and emits no runtime page errors on init', async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });

    await page.goto('/why', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    await expect(
      page.locator('.why-page .why-content.why-content--ready'),
    ).toBeVisible();
    await expect(page.locator('.why-page .why-content--pending-layout')).toHaveCount(
      0,
    );
    await expect(page.locator('.why-page .why-content')).toHaveCSS('opacity', '1');
    await expect(page.locator('.why-page .why-gif')).toBeVisible();

    const scroll = page.locator('.why-page .why-scroll');
    await expect(scroll).toBeVisible();
    await scroll.evaluate((el) => {
      const box = el as HTMLElement;
      const max = Math.max(0, box.scrollHeight - box.clientHeight);
      box.scrollTop = Math.min(max, 240);
      box.dispatchEvent(new Event('scroll', { bubbles: true }));
    });
    await waitTwoFrames(page);
    await scroll.evaluate((el) => {
      const box = el as HTMLElement;
      box.scrollTop = 0;
      box.dispatchEvent(new Event('scroll', { bubbles: true }));
    });
    await waitTwoFrames(page);
    await expect(page.locator('.why-page .why-content')).toHaveCSS('opacity', '1');
    await expect(page.locator('.why-page .why-gif')).toBeVisible();

    await page.waitForTimeout(200);
    expect(pageErrors, `Runtime errors: ${pageErrors.join(' | ')}`).toEqual([]);
  });

  test('WHY_FIT_REFERENCE_LINE matches longest line among /why copy', async ({
    page,
  }) => {
    await gotoWhyWhenReady(page);
    const { maxLen, longest, refPresent } = await page.evaluate(() => {
      const scroll = document.querySelector('.why-page .why-scroll');
      if (!scroll) {
        return { maxLen: 0, longest: '', refPresent: false };
      }
      const lines: string[] = [];
      scroll.querySelectorAll('.why-content p').forEach((p) => {
        const text = (p as HTMLElement).innerText;
        text.split('\n').forEach((raw: string) => {
          const t = raw.replace(/\s+/g, ' ').trim();
          if (t.length > 0) lines.push(t);
        });
      });
      const max = lines.reduce((m, s) => Math.max(m, s.length), 0);
      const longestLine = lines.reduce(
        (a, b) => (a.length >= b.length ? a : b),
        '',
      );
      return {
        maxLen: max,
        longest: longestLine,
        refPresent: lines.length > 0,
      };
    });
    expect(refPresent).toBe(true);
    expect(WHY_FIT_REFERENCE_LINE.length).toBe(maxLen);
    expect(longest).toBe(WHY_FIT_REFERENCE_LINE);
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
    await expect(box).toHaveCSS('background-color', RGB_INK);
    await expect(frame).toHaveCSS('background-color', RGB_INK);
  });

  test('.why-box is a size container (arrow cqw)', async ({ page }) => {
    const box = page.locator('.why-page .why-box');
    await expect(box).toHaveCSS('container-type', 'size');
  });

  test('scroll CTA arrow uses container width (cqw) in inline SVG style', async ({
    page,
  }) => {
    const svg = page.locator('.why-page .why-scroll-cta svg.animated-arrow');
    await expect(svg).toBeVisible();
    const styleAttr = await svg.getAttribute('style');
    expect(styleAttr).toBeTruthy();
    expect(styleAttr).toMatch(/cqw/i);
    expect(styleAttr).toMatch(/aspect-ratio/i);
    expect(styleAttr).toMatch(
      new RegExp(`${WHY_SCROLL_CTA_CONTAINER_CQW}\\.\\d+cqw`, 'i'),
    );
  });

  test('scroll CTA arrow maps texture image into segment fills', async ({
    page,
  }) => {
    const data = await page.evaluate(() => {
      const svg = document.querySelector(
        '.why-page .why-scroll-cta svg.animated-arrow',
      );
      if (!(svg instanceof SVGElement)) return null;

      const patternImage = svg.querySelector('defs pattern image');
      const imageHref =
        patternImage?.getAttribute('href') ||
        patternImage?.getAttribute('xlink:href') ||
        '';

      const segs = [...svg.querySelectorAll('polygon.seg')];
      const texturedCount = segs.filter((seg) =>
        /fill:\s*url\(#animated-arrow-texture-/i.test(
          seg.getAttribute('style') || '',
        ),
      ).length;

      return {
        imageHref,
        segCount: segs.length,
        texturedCount,
      };
    });

    expect(data).not.toBeNull();
    expect(data!.imageHref).toBe(
      '/assets/pages/profile/why/dichrom_background.png',
    );
    expect(data!.segCount).toBeGreaterThanOrEqual(6);
    expect(data!.texturedCount).toBe(data!.segCount);
  });

  test('--why-cta-left tracks lead first line (inset + WHY_CTA_LEAD_TRACK × line width)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 900, height: 520 });
    await gotoWhyWhenReady(page);

    const check = await page.evaluate(
      ([leadTrack, edgeMinPx, edgeWidthFrac]) => {
        const box = document.querySelector('.why-page .why-box');
        const lead = document.querySelector('.why-page p.why-lead');
        if (!box || !lead)
          return { ok: false as const, reason: 'missing nodes' };

        const leftVar = getComputedStyle(box)
          .getPropertyValue('--why-cta-left')
          .trim();
        if (!/^\d+(\.\d+)?px$/.test(leftVar)) {
          return {
            ok: false as const,
            reason: `bad --why-cta-left: "${leftVar}"`,
          };
        }
        const setPx = parseFloat(leftVar);

        const range = document.createRange();
        range.selectNodeContents(lead);
        const fr = range.getClientRects();
        if (!fr.length) {
          return { ok: false as const, reason: 'lead has no client rects' };
        }
        const r0 = fr[0];
        const br = box.getBoundingClientRect();
        const edge = Math.max(edgeMinPx, br.width * edgeWidthFrac);
        let expected = r0.left - br.left + leadTrack * r0.width;
        expected = Math.min(Math.max(expected, edge), br.width - edge);

        return {
          ok: true as const,
          setPx,
          expected,
          delta: Math.abs(setPx - expected),
        };
      },
      [
        WHY_CTA_LEAD_TRACK,
        WHY_CTA_EDGE_MIN_PX,
        WHY_CTA_EDGE_WIDTH_FRAC,
      ] as const,
    );

    expect(check.ok, !check.ok ? check.reason : '').toBe(true);
    if (check.ok) {
      expect(
        check.delta,
        `setPx=${check.setPx} expected≈${check.expected}`,
      ).toBeLessThanOrEqual(LAYOUT_TOLERANCE);
    }
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
    expect(metrics!.gifTopInset).toBe(WHY_GIF_TOP_INSET);
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

  test('scroll phases: start-cover at top, CTA fades after hint band, end-cover near bottom', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.setViewportSize({ width: 880, height: 520 });
    await gotoWhyWhenReady(page);

    const read = () =>
      page.evaluate(() => {
        const box = document.querySelector('.why-page .why-box');
        const scroll = document.querySelector(
          '.why-page .why-scroll',
        ) as HTMLElement | null;
        const cta = document.querySelector(
          '.why-page .why-scroll-cta',
        ) as HTMLElement | null;
        if (!box || !scroll || !cta) return null;
        const cs = getComputedStyle(box);
        const maxScroll = Math.max(
          0,
          scroll.scrollHeight - scroll.clientHeight,
        );
        return {
          startOp: parseFloat(
            cs.getPropertyValue('--why-start-cover-opacity').trim() || '1',
          ),
          introBottomVeilOp: parseFloat(
            cs.getPropertyValue('--why-intro-bottom-veil-opacity').trim() ||
              '0',
          ),
          bottomVeilOp: parseFloat(
            cs.getPropertyValue('--why-bottom-veil-opacity').trim() || '0',
          ),
          endOp: parseFloat(
            cs.getPropertyValue('--why-end-cover-opacity').trim() || '0',
          ),
          ctaOp: parseFloat(
            cs.getPropertyValue('--why-cta-opacity').trim() || '1',
          ),
          ctaVisibility: getComputedStyle(cta).visibility,
          maxScroll,
        };
      });

    await setWhyScrollTop(page, 0);
    await waitTwoFrames(page);
    const atTop = await read();
    expect(atTop).not.toBeNull();
    // Needs enough scroll room for the end-cover phase.
    expect(atTop!.maxScroll).toBeGreaterThanOrEqual(100);
    expect(atTop!.startOp, 'start-cover visible at scroll 0').toBeGreaterThan(
      0.85,
    );
    expect(
      atTop!.introBottomVeilOp,
      'intro-only narrow bottom veil is strong at scroll 0',
    ).toBeGreaterThan(0.92);
    expect(atTop!.introBottomVeilOp).toBeLessThanOrEqual(1);
    expect(
      atTop!.bottomVeilOp,
      'post-intro bottom veil should be off at strict start',
    ).toBeLessThan(0.12);
    expect(atTop!.endOp, 'end-cover off at scroll 0').toBeLessThan(0.15);
    expect(atTop!.ctaOp, 'CTA visible at scroll 0').toBeGreaterThan(0.9);

    await setWhyScrollTop(page, 100);
    await waitTwoFrames(page);
    await expect
      .poll(
        async () => {
          const v = await read();
          return v?.ctaOp ?? 2;
        },
        {
          timeout: 4000,
          message: 'CTA opacity should drop after scroll past ~56px hint band',
        },
      )
      .toBeLessThan(0.08);
    const afterHint = await read();
    expect(afterHint).not.toBeNull();
    expect(afterHint!.ctaVisibility).toBe('hidden');
    expect(
      afterHint!.bottomVeilOp,
      'bottom veil ramps in after intro band',
    ).toBeGreaterThan(0.35);

    // Scroll to real bottom after layout may have changed and re-apply a few times
    // because end-lock logic can adjust scrollHeight during settle frames.
    await page.evaluate(async () => {
      const scroll = document.querySelector(
        '.why-page .why-scroll',
      ) as HTMLElement;
      const waitFrames = () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        );
      for (let i = 0; i < 4; i += 1) {
        scroll.scrollTop = Math.max(
          0,
          scroll.scrollHeight - scroll.clientHeight,
        );
        scroll.dispatchEvent(new Event('scroll', { bubbles: true }));
        await waitFrames();
      }
    });
    await waitTwoFrames(page);
    await expect
      .poll(
        async () => {
          await setWhyScrollBottom(page);
          const v = await read();
          return v?.endOp ?? 0;
        },
        {
          timeout: 4000,
          message: 'end-cover should ramp in the last scroll band',
        },
      )
      .toBeGreaterThan(0.75);
  });

  test('prefers-reduced-motion hides scroll CTA regardless of scroll', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 900, height: 520 });
    await gotoWhyWhenReady(page);

    const cta = page.locator('.why-page .why-scroll-cta');
    await expect(cta).toHaveCSS('opacity', '0');
    await expect(cta).toHaveCSS('visibility', 'hidden');

    await page.evaluate(() => {
      const scroll = document.querySelector(
        '.why-page .why-scroll',
      ) as HTMLElement;
      scroll.scrollTop = 0;
    });
    await waitTwoFrames(page);
    await expect(cta).toHaveCSS('opacity', '0');
  });

  test('paragraphs overlapping scroll CTA fade (line opacity)', async ({
    page,
  }) => {
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

  test('lead stacks above bottom start cover (DOM + paint order)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 900, height: 420 });
    await gotoWhyWhenReady(page);

    const result = await page.evaluate(() => {
      const scroll = document.querySelector('.why-page .why-scroll');
      const cover = document.querySelector(
        '.why-page .why-scroll > .why-start-cover',
      );
      const lead = document.querySelector('.why-page p.why-lead');
      const box = document.querySelector('.why-page .why-box');
      if (!scroll || !cover || !lead || !box) {
        return { ok: false as const, reason: 'missing nodes' };
      }

      if (cover.parentElement !== scroll) {
        return {
          ok: false as const,
          reason: 'cover not direct child of .why-scroll',
        };
      }

      const leadCs = getComputedStyle(lead);
      if (leadCs.position !== 'relative' || leadCs.zIndex !== '6') {
        return {
          ok: false as const,
          reason: `lead layer: position=${leadCs.position} z=${leadCs.zIndex}`,
        };
      }

      const afterZ = getComputedStyle(box, '::after').zIndex;
      if (afterZ !== '0') {
        return { ok: false as const, reason: `box::after z-index=${afterZ}` };
      }

      const intro = document.querySelector('.why-page .why-block--intro');
      if (intro && getComputedStyle(intro).zIndex !== 'auto') {
        return {
          ok: false as const,
          reason: `intro should not create z trap, got z=${getComputedStyle(intro).zIndex}`,
        };
      }

      const r = lead.getBoundingClientRect();
      const cx = Math.min(
        Math.max(Math.floor(r.left + r.width / 2), 0),
        window.innerWidth - 1,
      );
      const cy = Math.min(
        Math.max(Math.floor(r.top + r.height / 2), 0),
        window.innerHeight - 1,
      );

      const isDevHit = (el: Element) => {
        const t = el.tagName;
        if (t.startsWith('ASTRO-DEV')) return true;
        if (t === 'VITE-ERROR-OVERLAY') return true;
        return el.closest('astro-dev-toolbar') !== null;
      };

      const stack = document.elementsFromPoint(cx, cy);
      const hit = stack.find(
        (n): n is Element => n instanceof Element && !isDevHit(n),
      );
      if (!hit) {
        return {
          ok: false as const,
          reason: 'elementsFromPoint: only dev overlay at lead center',
        };
      }
      if (hit === cover || cover.contains(hit)) {
        return { ok: false as const, reason: 'cover topmost at lead center' };
      }
      const hitEl = hit instanceof Element ? hit : null;
      const overLead =
        hit === lead ||
        lead.contains(hit) ||
        (hitEl !== null && hitEl.contains(lead));
      if (!overLead) {
        return {
          ok: false as const,
          reason: `unexpected topmost: ${hit.tagName}.${hit.className}`,
        };
      }

      return { ok: true as const };
    });

    expect(result.ok, 'reason' in result ? result.reason : '').toBe(true);
  });

  test('revolver edge gating stays stable under fast top/bottom jumps', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 920, height: 520 });
    await gotoWhyWhenReady(page);

    const state = await page.evaluate(async () => {
      const scroll = document.querySelector(
        '.why-page .why-scroll',
      ) as HTMLElement | null;
      const box = document.querySelector('.why-page .why-box');
      if (!scroll || !box) return null;
      const ps = [...scroll.querySelectorAll('p')] as HTMLElement[];
      if (ps.length < 4) return null;

      const waitFrames = (n = 2) =>
        new Promise<void>((resolve) => {
          const run = (left: number) => {
            if (left <= 0) return resolve();
            requestAnimationFrame(() => run(left - 1));
          };
          run(n);
        });
      const settleToBottom = async (rounds = 8, frames = 2) => {
        for (let i = 0; i < rounds; i += 1) {
          jumpBottom();
          await waitFrames(frames);
        }
      };

      const read = (els: HTMLElement[]) =>
        els.map((p) => {
          const cs = getComputedStyle(p);
          return {
            s: parseFloat(cs.getPropertyValue('--why-line-scale') || '1'),
            i: parseFloat(cs.getPropertyValue('--why-line-inset') || '0'),
          };
        });

      const jumpBottom = () => {
        scroll.scrollTop = Math.max(
          0,
          scroll.scrollHeight - scroll.clientHeight,
        );
        scroll.dispatchEvent(new Event('scroll', { bubbles: true }));
      };
      const jumpTop = () => {
        scroll.scrollTop = 0;
        scroll.dispatchEvent(new Event('scroll', { bubbles: true }));
      };
      const jumpMid = () => {
        scroll.scrollTop = Math.max(
          0,
          (scroll.scrollHeight - scroll.clientHeight) * 0.52,
        );
        scroll.dispatchEvent(new Event('scroll', { bubbles: true }));
      };

      // Simulate aggressive user bursts: top -> mid -> bottom -> top -> bottom.
      jumpTop();
      await waitFrames(1);
      jumpMid();
      await waitFrames(1);
      jumpBottom();
      await waitFrames(1);
      jumpTop();
      await waitFrames(1);
      await settleToBottom(10, 2);

      const topTwo = read(ps.slice(0, 2));
      const lastTwo = read(ps.slice(-2));
      return { topTwo, lastTwo };
    });

    expect(state).not.toBeNull();
    for (const p of state!.lastTwo) {
      expect(p.s).toBeGreaterThan(0.98);
      expect(Math.abs(p.i)).toBeLessThan(0.08);
    }
    // After settling from fast jumps, opening lines should also remain clean when revisited.
    for (const p of state!.topTwo) {
      expect(p.s).toBeGreaterThan(0.98);
      expect(Math.abs(p.i)).toBeLessThan(0.08);
    }
  });

  async function whyWheelScrollDeltaPx(
    page: Page,
    rawDeltaY: number,
  ): Promise<number> {
    const scroll = page.locator('.why-page .why-scroll');
    const box = await scroll.boundingBox();
    expect(box).toBeTruthy();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.evaluate(() => {
      const el = document.querySelector('.why-page .why-scroll') as HTMLElement;
      el.scrollTop = 0;
    });
    await waitTwoFrames(page);
    await waitTwoFrames(page);
    await page.mouse.wheel(0, rawDeltaY);
    await waitTwoFrames(page);
    await waitTwoFrames(page);
    return page.evaluate(
      () =>
        (document.querySelector('.why-page .why-scroll') as HTMLElement)
          .scrollTop,
    );
  }

  test('mouse wheel uses damped scroll when motion is allowed', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.setViewportSize({ width: 920, height: 520 });
    await gotoWhyWhenReady(page);

    const rawDelta = 240;
    const moved = await whyWheelScrollDeltaPx(page, rawDelta);

    // Playwright/Chromium maps wheel deltas; handler applies WHEEL_SCROLL_FACTOR (~0.78).
    // Assert meaningful scroll but strictly less than the nominal delta (damping).
    expect(moved, 'wheel should scroll down').toBeGreaterThan(28);
    expect(
      moved,
      'damped wheel moves less than nominal deltaY (custom handler)',
    ).toBeLessThan(rawDelta * 0.92);
  });

  test('prefers-reduced-motion: wheel bypasses damped handler (reload for media)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 920, height: 520 });
    const rawDelta = 240;

    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await gotoWhyWhenReady(page);
    const damped = await whyWheelScrollDeltaPx(page, rawDelta);

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.reload();
    await gotoWhyWhenReady(page);
    const nativeRm = await whyWheelScrollDeltaPx(page, rawDelta);

    expect(damped, 'damped path should move').toBeGreaterThan(28);
    expect(
      nativeRm,
      'reduce: no preventDefault → browser scroll exceeds damped distance',
    ).toBeGreaterThan(damped + 6);
  });

  test('near top: first two paragraphs stay flat while a later line can revolve', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.setViewportSize({ width: 920, height: 520 });
    await gotoWhyWhenReady(page);

    const found = await page.evaluate(async () => {
      const scrollEl = document.querySelector(
        '.why-page .why-scroll',
      ) as HTMLElement | null;
      if (!scrollEl) return { ok: false as const, reason: 'no scroll' };
      const ps = [...scrollEl.querySelectorAll('p')] as HTMLElement[];
      if (ps.length < 3) {
        return { ok: false as const, reason: 'need ≥3 paragraphs' };
      }

      const waitFrames = (n: number) =>
        new Promise<void>((resolve) => {
          const step = (left: number) => {
            if (left <= 0) return resolve();
            requestAnimationFrame(() => step(left - 1));
          };
          step(n);
        });

      // Mirrors why-box-scroll.ts INTRO_RAMP_* and isStrictStartLock (× 0.35).
      const introRampPx = Math.max(100, scrollEl.clientHeight * 0.22);
      const maxTop = Math.min(
        Math.floor(introRampPx * 0.34),
        Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight - 4),
      );

      const read = (p: HTMLElement) => {
        const cs = getComputedStyle(p);
        return {
          s: parseFloat(cs.getPropertyValue('--why-line-scale') || '1'),
          i: parseFloat(cs.getPropertyValue('--why-line-inset') || '0'),
        };
      };

      for (let top = 6; top <= maxTop; top += 3) {
        scrollEl.scrollTop = top;
        scrollEl.dispatchEvent(new Event('scroll', { bubbles: true }));
        await waitFrames(5);

        const a = read(ps[0]!);
        const b = read(ps[1]!);
        const c = read(ps[2]!);
        const introFlat =
          a.s > 0.97 &&
          b.s > 0.97 &&
          Math.abs(a.i) < 0.12 &&
          Math.abs(b.i) < 0.12;
        const bodyRevolved = c.s < 0.985 || Math.abs(c.i) > 0.04;
        if (introFlat && bodyRevolved) {
          return { ok: true as const, scrollTop: top };
        }
      }

      return {
        ok: false as const,
        reason:
          'no scrollTop in strict-start band showed intro flat + body revolver',
      };
    });

    expect(found.ok, 'ok' in found && !found.ok ? found.reason : '').toBe(true);
  });

  test('start state keeps first two paragraphs identical and fully untransformed', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 920, height: 520 });
    await gotoWhyWhenReady(page);

    const start = await page.evaluate(async () => {
      const scroll = document.querySelector(
        '.why-page .why-scroll',
      ) as HTMLElement | null;
      if (!scroll) return null;
      const ps = [...scroll.querySelectorAll('p')] as HTMLElement[];
      if (ps.length < 2) return null;
      scroll.scrollTop = 0;
      scroll.dispatchEvent(new Event('scroll', { bubbles: true }));
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
      );
      const a = getComputedStyle(ps[0]);
      const b = getComputedStyle(ps[1]);
      return {
        s0: parseFloat(a.getPropertyValue('--why-line-scale') || '1'),
        s1: parseFloat(b.getPropertyValue('--why-line-scale') || '1'),
        i0: parseFloat(a.getPropertyValue('--why-line-inset') || '0'),
        i1: parseFloat(b.getPropertyValue('--why-line-inset') || '0'),
      };
    });

    expect(start).not.toBeNull();
    expect(start!.s0).toBeGreaterThan(0.98);
    expect(start!.s1).toBeGreaterThan(0.98);
    expect(Math.abs(start!.i0)).toBeLessThan(0.08);
    expect(Math.abs(start!.i1)).toBeLessThan(0.08);
    expect(Math.abs(start!.s0 - start!.s1)).toBeLessThan(0.02);
    expect(Math.abs(start!.i0 - start!.i1)).toBeLessThan(0.08);
  });

  test('edge veils: top extends at scroll end, bottom shrinks versus middle', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 920, height: 520 });
    await gotoWhyWhenReady(page);

    const heights = await page.evaluate(async () => {
      const scroll = document.querySelector(
        '.why-page .why-scroll',
      ) as HTMLElement | null;
      const box = document.querySelector('.why-page .why-box');
      const bottomVeil = document.querySelector(
        '.why-page .why-box-bottom-veil',
      ) as HTMLElement | null;
      if (!scroll || !box || !bottomVeil) return null;

      const waitFrames = (n = 2) =>
        new Promise<void>((resolve) => {
          const run = (left: number) => {
            if (left <= 0) return resolve();
            requestAnimationFrame(() => run(left - 1));
          };
          run(n);
        });
      const settleToBottom = async (rounds = 8, frames = 2) => {
        for (let i = 0; i < rounds; i += 1) {
          scroll.scrollTop = Math.max(
            0,
            scroll.scrollHeight - scroll.clientHeight,
          );
          scroll.dispatchEvent(new Event('scroll', { bubbles: true }));
          await waitFrames(frames);
        }
      };

      const read = () => {
        const topH = parseFloat(
          getComputedStyle(box, '::before').height || '0',
        );
        const bottomH = parseFloat(getComputedStyle(bottomVeil).height || '0');
        return { topH, bottomH };
      };

      scroll.scrollTop = Math.max(
        0,
        (scroll.scrollHeight - scroll.clientHeight) * 0.5,
      );
      scroll.dispatchEvent(new Event('scroll', { bubbles: true }));
      await waitFrames(4);
      const mid = read();

      await settleToBottom(10, 2);
      const end = read();

      return { mid, end };
    });

    expect(heights).not.toBeNull();
    /* ::before height is JS-driven near maxScroll (grows toward close copy); mid-scroll is shorter. */
    expect(heights!.end.topH).toBeGreaterThan(heights!.mid.topH + 8);
    expect(heights!.end.bottomH).toBeLessThan(heights!.mid.bottomH - 8);
  });
});
