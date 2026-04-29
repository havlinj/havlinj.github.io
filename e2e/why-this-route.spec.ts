import { test, expect, type Page } from '@playwright/test';
import {
  LAYOUT_TOLERANCE,
  WHY_CTA_ARROW_FLOOR_OPACITY,
  WHY_CTA_ARROW_PEAK_OPACITY,
  WHY_CTA_BOX_WIDTH_FRAC,
  WHY_CTA_VEIL_CLEARANCE_BELOW_LEAD_PX,
  WHY_CTA_VEIL_MIN_GAP_ABOVE_ARROW_PX,
  WHY_FIT_FAIL_LOCK_VIEWPORT_WIDTH,
  WHY_GIF_TOP_INSET,
  WHY_SCROLL_CTA_CONTAINER_CQW,
} from './constants';
import { RGB_INK } from '../src/constants/colors';
import { WHY_FIT_REFERENCE_LINE } from '../src/constants/why-fit-reference';
import {
  WHY_CLIP_POSTER_DESKTOP,
  WHY_CLIP_POSTER_MOBILE,
  WHY_CLIP_VIDEO_DESKTOP,
  WHY_CLIP_VIDEO_MOBILE,
  WHY_CLIP_VIEWPORT_MOBILE_MQ,
} from '../src/constants/why-layout';
import {
  awaitWhyLayoutReady,
  gotoWhyWhenReady,
  waitTwoFrames,
} from './helpers';

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

async function whyClipVideoPathname(page: Page): Promise<string> {
  return page
    .locator('.why-page video.why-clip')
    .evaluate((el: HTMLVideoElement) => {
      const raw = el.currentSrc || el.src;
      if (!raw) return '';
      try {
        return new URL(raw, window.location.href).pathname;
      } catch {
        return '';
      }
    });
}

async function whyClipPosterImgPathname(page: Page): Promise<string> {
  return page
    .locator('.why-page picture.why-clip-poster img')
    .evaluate((el: HTMLImageElement) => {
      const raw = el.currentSrc || el.src;
      if (!raw) return '';
      try {
        return new URL(raw, window.location.href).pathname;
      } catch {
        return '';
      }
    });
}

test.describe('/why-this page @serial', () => {
  test.beforeEach(async ({ page }) => {
    await gotoWhyWhenReady(page);
  });

  test('reveals Why this content and emits no runtime page errors on init', async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });

    // beforeEach already navigated here; avoid an immediate second /why-this load in dev —
    // Vite can race on dynamic dep chunks (e.g. audit-*.js) and surface a spurious pageerror.

    await expect(
      page.locator('.why-page .why-content.why-content--ready'),
    ).toBeVisible();
    await expect(
      page.locator('.why-page .why-content--pending-layout'),
    ).toHaveCount(0);
    await expect(page.locator('.why-page .why-content')).toHaveCSS(
      'opacity',
      '1',
    );
    await expect(page.locator('.why-page .why-clip')).toBeVisible();

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
    await expect(page.locator('.why-page .why-content')).toHaveCSS(
      'opacity',
      '1',
    );
    await expect(page.locator('.why-page .why-clip')).toBeVisible();

    await page.waitForTimeout(200);
    expect(pageErrors, `Runtime errors: ${pageErrors.join(' | ')}`).toEqual([]);
  });

  test('WHY_FIT_REFERENCE_LINE matches longest line among /why-this copy', async ({
    page,
  }) => {
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

  test('shows Why this title, lead copy, and loop video asset', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: 'Why this', level: 1 }),
    ).toBeVisible();
    await expect(page.locator('.why-page p.why-lead')).toHaveText(
      "I'm a software engineer.",
    );
    const clip = page.locator('.why-page video.why-clip');
    await expect(clip).toBeVisible();
    await expect(clip).toHaveJSProperty('loop', true);
    await expect
      .poll(() => whyClipVideoPathname(page))
      .toBe(WHY_CLIP_VIDEO_DESKTOP);
    const poster = page.locator('.why-page picture.why-clip-poster');
    await expect(poster).toBeVisible();
    await expect(poster.locator('img')).toHaveAttribute(
      'src',
      WHY_CLIP_POSTER_DESKTOP,
    );
  });

  test('Why clip poster markup matches layout constants', async ({ page }) => {
    const picture = page.locator('.why-page picture.why-clip-poster');
    await expect(picture).toBeVisible();
    const mobileSource = picture.locator('source').first();
    await expect(mobileSource).toHaveAttribute(
      'media',
      WHY_CLIP_VIEWPORT_MOBILE_MQ,
    );
    await expect(mobileSource).toHaveAttribute(
      'srcset',
      WHY_CLIP_POSTER_MOBILE,
    );
    await expect(picture.locator('img')).toHaveAttribute(
      'src',
      WHY_CLIP_POSTER_DESKTOP,
    );
  });

  test('Why clip video and poster image track viewport width', async ({
    page,
  }) => {
    await expect
      .poll(() => whyClipVideoPathname(page))
      .toBe(WHY_CLIP_VIDEO_DESKTOP);
    await expect
      .poll(() => whyClipPosterImgPathname(page))
      .toBe(WHY_CLIP_POSTER_DESKTOP);

    await page.setViewportSize({ width: 390, height: 844 });

    await expect
      .poll(() => whyClipVideoPathname(page))
      .toBe(WHY_CLIP_VIDEO_MOBILE);
    await expect
      .poll(() => whyClipPosterImgPathname(page))
      .toBe(WHY_CLIP_POSTER_MOBILE);

    await page.setViewportSize({ width: 1280, height: 720 });

    await expect
      .poll(() => whyClipVideoPathname(page))
      .toBe(WHY_CLIP_VIDEO_DESKTOP);
    await expect
      .poll(() => whyClipPosterImgPathname(page))
      .toBe(WHY_CLIP_POSTER_DESKTOP);
  });

  test('Clip frame and box use panel background #111', async ({ page }) => {
    const box = page.locator('.why-page .why-box');
    const frame = page.locator('.why-page .why-clip-frame');
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

  test('scroll CTA arrow is solid fill with blink animation', async ({
    page,
  }) => {
    const data = await page.evaluate(() => {
      const root = document.querySelector(
        '.why-page .why-scroll-cta .animated-arrow-root',
      );
      const svg = document.querySelector(
        '.why-page .why-scroll-cta svg.animated-arrow',
      );
      const solid = svg?.querySelector('path.animated-arrow__solid');
      if (!(root instanceof HTMLElement) || !(svg instanceof SVGElement)) {
        return null;
      }
      if (!(solid instanceof SVGPathElement)) return null;

      const cs = getComputedStyle(solid);
      const peakVar = root.style
        .getPropertyValue('--arrow-blink-peak-opacity')
        .trim();
      const floorVar = root.style
        .getPropertyValue('--arrow-blink-floor-opacity')
        .trim();
      return {
        rootHasSolidVariant: root.classList.contains(
          'animated-arrow-root--solid-blink',
        ),
        patternCount: svg.querySelectorAll('defs pattern').length,
        segCount: svg.querySelectorAll('polygon.seg').length,
        animationName: cs.animationName,
        fill: cs.fill,
        peakVar,
        floorVar,
      };
    });

    expect(data).not.toBeNull();
    expect(data!.rootHasSolidVariant).toBe(true);
    expect(data!.patternCount).toBe(0);
    expect(data!.segCount).toBe(0);
    expect(data!.animationName.split(',').map((s) => s.trim())).toContain(
      'animated-arrow-blink',
    );
    expect(data!.fill).toMatch(/rgb\(\s*224\s*,\s*247\s*,\s*250\s*\)/i);
    expect(parseFloat(data!.peakVar)).toBeCloseTo(
      WHY_CTA_ARROW_PEAK_OPACITY,
      5,
    );
    expect(parseFloat(data!.floorVar)).toBeCloseTo(
      WHY_CTA_ARROW_FLOOR_OPACITY,
      5,
    );
  });

  test('scroll CTA horizontal anchor matches WHY_CTA_BOX_WIDTH_FRAC of .why-box', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 900, height: 520 });
    await gotoWhyWhenReady(page);

    const data = await page.evaluate((frac) => {
      const box = document.querySelector('.why-page .why-box');
      const arrow = document.querySelector(
        '.why-page .why-scroll-cta svg.animated-arrow',
      ) as SVGSVGElement | null;
      if (!box || !arrow) return null;
      const boxR = box.getBoundingClientRect();
      const arrowR = arrow.getBoundingClientRect();
      const expectedMid = boxR.left + frac * boxR.width;
      const arrowMid = arrowR.left + arrowR.width / 2;
      const varPct = getComputedStyle(box)
        .getPropertyValue('--why-cta-horizontal')
        .trim();
      return {
        delta: Math.abs(arrowMid - expectedMid),
        varPct,
      };
    }, WHY_CTA_BOX_WIDTH_FRAC);

    expect(data).not.toBeNull();
    expect(data!.varPct).toBe(`${WHY_CTA_BOX_WIDTH_FRAC * 100}%`);
    expect(data!.delta).toBeLessThanOrEqual(LAYOUT_TOLERANCE);
  });

  test('Clip holder is out of flow; JS sets scroll pad and intro clip band', async ({
    page,
  }) => {
    const holder = page.locator('.why-page .why-clip-holder');
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

  test('Clip corner overlays use box-bg gradient (not an empty stack)', async ({
    page,
  }) => {
    const afterBg = await page.evaluate(() => {
      const frame = document.querySelector('.why-page .why-clip-frame');
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

  test('paragraphs keep full opacity while CTA is visible near start', async ({
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
          return {
            ok: false as const,
            reason: `paragraph dimmed while CTA visible (top=${top}, cta=${ctaOp}, minOp=${minOp})`,
          };
        }
      }

      return {
        ok: true as const,
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
      expect(Number.isFinite(p.s)).toBe(true);
      expect(Number.isFinite(p.i)).toBe(true);
    }
    // After settling from fast jumps, opening lines should also remain clean when revisited.
    for (const p of state!.topTwo) {
      expect(Number.isFinite(p.s)).toBe(true);
      expect(Number.isFinite(p.i)).toBe(true);
      expect(p.s).toBeGreaterThan(0.7);
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

    // Handler may ease movement across several frames; keep a small lower bound.
    expect(moved, 'wheel should scroll down').toBeGreaterThan(4);
    expect(
      moved,
      'damped wheel moves less than nominal deltaY (custom handler)',
    ).toBeLessThan(rawDelta * 0.92);
  });

  test('intro bottom veil stays hard for initial wheel steps', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.setViewportSize({ width: 920, height: 520 });
    await gotoWhyWhenReady(page);

    const scroll = page.locator('.why-page .why-scroll');
    const box = page.locator('.why-page .why-box');
    const rect = await scroll.boundingBox();
    expect(rect).toBeTruthy();
    await page.mouse.move(
      rect!.x + rect!.width / 2,
      rect!.y + rect!.height / 2,
    );

    const readVeil = async () =>
      box.evaluate((el) => {
        const cs = getComputedStyle(el);
        return {
          hard: parseFloat(
            cs.getPropertyValue('--why-intro-bottom-veil-hard').trim() || '0',
          ),
          introOpacity: parseFloat(
            cs.getPropertyValue('--why-intro-bottom-veil-opacity').trim() ||
              '0',
          ),
        };
      });

    await setWhyScrollTop(page, 0);
    await waitTwoFrames(page);

    const wheelStep = 120;
    await page.mouse.wheel(0, wheelStep);
    await waitTwoFrames(page);
    const afterFirst = await readVeil();

    await page.mouse.wheel(0, wheelStep);
    await waitTwoFrames(page);
    const afterSecond = await readVeil();

    await page.mouse.wheel(0, wheelStep);
    await waitTwoFrames(page);
    const afterThird = await readVeil();

    expect(afterFirst.hard, '1st step should keep hard veil near max').toBe(1);
    expect(
      afterSecond.hard,
      `2nd step should still keep hard veil, got ${afterSecond.hard}`,
    ).toBeGreaterThanOrEqual(0.95);
    expect(
      afterSecond.introOpacity,
      `2nd step intro opacity should still be near full, got ${afterSecond.introOpacity}`,
    ).toBeGreaterThanOrEqual(0.95);
    expect(
      afterThird.hard,
      `3rd step should keep hard veil non-increasing, got ${afterThird.hard}`,
    ).toBeLessThanOrEqual(afterSecond.hard + 0.02);
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
    await page.reload({ waitUntil: 'domcontentloaded' });
    await awaitWhyLayoutReady(page);
    const nativeRm = await whyWheelScrollDeltaPx(page, rawDelta);

    expect(damped, 'damped path should move').toBeGreaterThan(4);
    expect(
      nativeRm,
      'reduce: no preventDefault → browser scroll exceeds damped distance',
    ).toBeGreaterThan(damped + 1);
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

  test('wide intro line remains fully opaque and untransformed near scroll start', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 920, height: 520 });
    await gotoWhyWhenReady(page);

    const checks = await page.evaluate(async () => {
      const scroll = document.querySelector(
        '.why-page .why-scroll',
      ) as HTMLElement | null;
      const wide = document.querySelector(
        '.why-page p.why-p--wide',
      ) as HTMLElement | null;
      if (!scroll || !wide) return null;

      const waitFrames = (n = 3) =>
        new Promise<void>((resolve) => {
          const run = (left: number) => {
            if (left <= 0) return resolve();
            requestAnimationFrame(() => run(left - 1));
          };
          run(n);
        });

      const sampleAt = async (top: number) => {
        scroll.scrollTop = top;
        scroll.dispatchEvent(new Event('scroll', { bubbles: true }));
        await waitFrames();
        const cs = getComputedStyle(wide);
        return {
          top,
          op: parseFloat(
            cs.getPropertyValue('--why-line-opacity') || cs.opacity,
          ),
          s: parseFloat(cs.getPropertyValue('--why-line-scale') || '1'),
          i: parseFloat(cs.getPropertyValue('--why-line-inset') || '0'),
        };
      };

      return [await sampleAt(0), await sampleAt(24), await sampleAt(64)];
    });

    expect(checks).not.toBeNull();
    for (const c of checks!) {
      expect(c.op, `wide intro opacity at scrollTop=${c.top}`).toBeGreaterThan(
        0.99,
      );
      expect(c.s, `wide intro scale at scrollTop=${c.top}`).toBeCloseTo(1, 2);
      expect(
        Math.abs(c.i),
        `wide intro inset at scrollTop=${c.top}`,
      ).toBeLessThan(0.02);
    }
  });

  test('step-3 veil behavior is stable (either active windowed or disabled)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 920, height: 520 });
    await gotoWhyWhenReady(page);

    const readStep3Op = async (top: number) =>
      page.evaluate(async (scrollTop) => {
        const scroll = document.querySelector(
          '.why-page .why-scroll',
        ) as HTMLElement | null;
        const box = document.querySelector('.why-page .why-box');
        if (!scroll || !box) return null;
        const waitFrames = (n = 3) =>
          new Promise<void>((resolve) => {
            const run = (left: number) => {
              if (left <= 0) return resolve();
              requestAnimationFrame(() => run(left - 1));
            };
            run(n);
          });
        scroll.scrollTop = scrollTop;
        scroll.dispatchEvent(new Event('scroll', { bubbles: true }));
        await waitFrames();
        const cs = getComputedStyle(box);
        return parseFloat(
          cs.getPropertyValue('--why-step3-veil-opacity') || '0',
        );
      }, top);

    const before = await readStep3Op(90);
    const peak = await readStep3Op(150);
    const after = await readStep3Op(250);

    expect(before).not.toBeNull();
    expect(peak).not.toBeNull();
    expect(after).not.toBeNull();
    expect(before!, 'step-3 veil should be low before its window').toBeLessThan(
      0.2,
    );
    if (peak! <= 0.05) {
      // Step-3 veil is currently disabled/tuned out: keep it effectively off.
      expect(before!).toBeLessThanOrEqual(0.05);
      expect(after!).toBeLessThanOrEqual(0.05);
    } else {
      expect(peak!, 'step-3 veil should peak in its window').toBeGreaterThan(
        0.2,
      );
      expect(after!, 'step-3 veil should fade after its window').toBeLessThan(
        0.2,
      );
    }
  });

  test('CTA vertical anchor keeps fixed 3/5 fraction from lead toward box bottom', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 900, height: 520 });
    await gotoWhyWhenReady(page);

    const readDelta = async () =>
      page.evaluate(() => {
        const box = document.querySelector('.why-page .why-box');
        const lead = document.querySelector('.why-page p.why-lead');
        if (!box || !lead) return null;
        const boxRect = box.getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(lead);
        const rects = range.getClientRects();
        if (!rects.length) return null;
        const leadBottom = rects[rects.length - 1]!.bottom;
        const setTop = parseFloat(
          getComputedStyle(box).getPropertyValue('--why-cta-top') || '0',
        );
        const expected =
          leadBottom -
          boxRect.top +
          0.6 * Math.max(0, boxRect.bottom - leadBottom);
        return Math.abs(setTop - expected);
      });

    const wideDelta = await readDelta();
    expect(wideDelta).not.toBeNull();
    expect(
      wideDelta!,
      'CTA top should match 3/5 anchor at wide viewport',
    ).toBeLessThanOrEqual(LAYOUT_TOLERANCE);

    await page.setViewportSize({ width: 760, height: 520 });
    await gotoWhyWhenReady(page);
    const narrowDelta = await readDelta();
    expect(narrowDelta).not.toBeNull();
    expect(
      narrowDelta!,
      'CTA top should keep 3/5 anchor at narrow viewport (no progressive pull)',
    ).toBeLessThanOrEqual(LAYOUT_TOLERANCE);
  });

  test('CTA veil top: below lead/wide+clearance and above arrow+min gap when feasible', async ({
    page,
  }) => {
    const tol = LAYOUT_TOLERANCE;

    const readVeilLayout = () =>
      page.evaluate(
        ([clearancePx, minGapPx]) => {
          const box = document.querySelector('.why-page .why-box');
          const lead = document.querySelector('.why-page p.why-lead');
          const wide = document.querySelector('.why-page p.why-p--wide');
          const cta = document.querySelector('.why-page .why-scroll-cta');
          if (!box || !cta) return null;
          const boxRect = box.getBoundingClientRect();
          const leadBot =
            lead instanceof HTMLElement
              ? lead.getBoundingClientRect().bottom
              : Number.NEGATIVE_INFINITY;
          const wideBot =
            wide instanceof HTMLElement
              ? wide.getBoundingClientRect().bottom
              : Number.NEGATIVE_INFINITY;
          const guardBottom = Math.max(leadBot, wideBot);
          if (!Number.isFinite(guardBottom)) return null;
          const guardBottomLocal = guardBottom - boxRect.top;
          const ctaTopLocal = cta.getBoundingClientRect().top - boxRect.top;
          const cs = getComputedStyle(box);
          const veilTopStr = cs.getPropertyValue('--why-cta-veil-top').trim();
          const veilOp = parseFloat(
            cs.getPropertyValue('--why-cta-veil-opacity').trim() || '0',
          );
          const veilTopPx = Number.parseFloat(veilTopStr);
          if (!Number.isFinite(veilTopPx)) return null;
          const textFloor = guardBottomLocal + clearancePx;
          const arrowCeiling = ctaTopLocal - minGapPx;
          const infeasible = textFloor > arrowCeiling;
          return {
            veilTopPx,
            veilOp,
            guardBottomLocal,
            ctaTopLocal,
            textFloor,
            arrowCeiling,
            infeasible,
          };
        },
        [
          WHY_CTA_VEIL_CLEARANCE_BELOW_LEAD_PX,
          WHY_CTA_VEIL_MIN_GAP_ABOVE_ARROW_PX,
        ] as const,
      );

    for (const [width, height] of [
      [900, 520],
      [760, 520],
      [400, 560],
    ] as const) {
      await page.setViewportSize({ width, height });
      await gotoWhyWhenReady(page);
      await waitTwoFrames(page);
      await waitTwoFrames(page);

      const m = await readVeilLayout();
      expect(m, `layout snapshot at ${width}×${height}`).not.toBeNull();
      if (m!.veilOp <= 0.05) continue;

      expect(
        m!.veilTopPx,
        `veil top ≥ text floor (viewport ${width}×${height})`,
      ).toBeGreaterThanOrEqual(m!.textFloor - tol);

      if (!m!.infeasible) {
        expect(
          m!.veilTopPx,
          `veil top ≤ arrow ceiling (viewport ${width}×${height})`,
        ).toBeLessThanOrEqual(m!.arrowCeiling + tol);
      }
    }
  });

  test('CTA arrow scales inversely as Why box narrows', async ({ page }) => {
    const readArrowWidth = async () =>
      page.evaluate(() => {
        const box = document.querySelector('.why-page .why-box');
        const arrow = document.querySelector(
          '.why-page .why-scroll-cta svg.animated-arrow',
        ) as SVGElement | null;
        if (!box || !arrow) return null;
        return {
          boxW: box.getBoundingClientRect().width,
          arrowW: arrow.getBoundingClientRect().width,
        };
      });

    await page.setViewportSize({ width: 980, height: 520 });
    await gotoWhyWhenReady(page);
    const wide = await readArrowWidth();
    expect(wide).not.toBeNull();

    await page.setViewportSize({ width: 740, height: 520 });
    await gotoWhyWhenReady(page);
    const narrow = await readArrowWidth();
    expect(narrow).not.toBeNull();

    // Box width can be clamped by runtime min-width lock; at minimum, arrow must not shrink.
    expect(narrow!.arrowW).toBeGreaterThanOrEqual(wide!.arrowW - 0.5);
    if (narrow!.boxW < wide!.boxW - 1) {
      expect(
        narrow!.arrowW,
        `arrow width should increase as box narrows (wide=${wide!.arrowW}, narrow=${narrow!.arrowW})`,
      ).toBeGreaterThan(wide!.arrowW + 1);
    }
  });

  test('lead left optical correction remains applied', async ({ page }) => {
    await page.setViewportSize({ width: 920, height: 520 });
    await gotoWhyWhenReady(page);

    const leadStyle = await page.evaluate(() => {
      const lead = document.querySelector(
        '.why-page .why-scroll p.why-lead',
      ) as HTMLElement | null;
      if (!lead) return null;
      const cs = getComputedStyle(lead);
      return {
        marginLeft: cs.marginLeft,
        textIndent: cs.textIndent,
      };
    });

    expect(leadStyle).not.toBeNull();
    expect(leadStyle!.marginLeft).toBe('-1px');
    expect(leadStyle!.textIndent).toBe('0px');
  });

  test('Why runtime min-width lock engages at extreme narrow width (fit-fail guard)', async ({
    page,
  }) => {
    await page.setViewportSize({
      width: WHY_FIT_FAIL_LOCK_VIEWPORT_WIDTH,
      height: 520,
    });
    await gotoWhyWhenReady(page);

    await page.evaluate(async () => {
      const scroll = document.querySelector(
        '.why-page .why-scroll',
      ) as HTMLElement | null;
      if (!scroll) return;
      const waitFrames = (n = 3) =>
        new Promise<void>((resolve) => {
          const run = (left: number) => {
            if (left <= 0) return resolve();
            requestAnimationFrame(() => run(left - 1));
          };
          run(n);
        });
      for (let i = 0; i < 36; i += 1) {
        scroll.scrollTop = i % 2 === 0 ? 0 : 3;
        scroll.dispatchEvent(new Event('scroll', { bubbles: true }));
        await waitFrames();
      }
      window.dispatchEvent(new Event('resize'));
      window.visualViewport?.dispatchEvent(new Event('resize'));
    });

    await expect
      .poll(
        async () =>
          page.evaluate(() => {
            const main = document.querySelector(
              'main.content',
            ) as HTMLElement | null;
            return main?.style.minWidth?.trim() ?? '';
          }),
        {
          message:
            'Why script should set main.content inline minWidth after sustained fit failure (zoom / narrow guard)',
          timeout: 12_000,
        },
      )
      .toMatch(/^\d+(\.\d+)?px$/);

    const { lockPx, scrollW } = await page.evaluate(() => {
      const main = document.querySelector('main.content') as HTMLElement | null;
      const scroll = document.querySelector(
        '.why-page .why-scroll',
      ) as HTMLElement | null;
      const lock = main?.style.minWidth?.trim() ?? '';
      const lockPx = Number.parseFloat(lock) || 0;
      const scrollW = scroll?.getBoundingClientRect().width ?? 0;
      return { lockPx, scrollW };
    });
    expect(lockPx).toBeGreaterThan(0);
    expect(scrollW).toBeGreaterThan(0);
    /* Lock is ceil(.why-scroll width) + FIT_FAIL_LOCK_PADDING_PX in why-box-scroll.ts */
    expect(lockPx).toBeGreaterThanOrEqual(scrollW - 2);
    expect(lockPx).toBeLessThanOrEqual(scrollW + 24);
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
