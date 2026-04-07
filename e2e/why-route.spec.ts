import { test, expect } from '@playwright/test';
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

test.describe('/why page', () => {
  test.beforeEach(async ({ page }) => {
    await gotoWhyWhenReady(page);
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
        p.innerText.split('\n').forEach((raw) => {
          const t = raw.replace(/\s+/g, ' ').trim();
          if (t.length > 0) lines.push(t);
        });
      });
      const max = lines.reduce((m, s) => Math.max(m, s.length), 0);
      const longestLine = lines.reduce(
        (a, b) => (a.length >= b.length ? a : b),
        '',
      );
      return { maxLen: max, longest: longestLine, refPresent: lines.length > 0 };
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

    await page.evaluate(() => {
      const scroll = document.querySelector(
        '.why-page .why-scroll',
      ) as HTMLElement;
      scroll.scrollTop = 0;
      scroll.dispatchEvent(new Event('scroll', { bubbles: true }));
    });
    await waitTwoFrames(page);
    const atTop = await read();
    expect(atTop).not.toBeNull();
    expect(atTop!.maxScroll).toBeGreaterThanOrEqual(
      100,
      '/why needs scroll room for end-cover phase (try a shorter viewport height)',
    );
    expect(atTop!.startOp, 'start-cover visible at scroll 0').toBeGreaterThan(
      0.85,
    );
    expect(
      atTop!.bottomVeilOp,
      'scroll bottom veil off at scroll 0',
    ).toBeLessThan(0.08);
    expect(atTop!.endOp, 'end-cover off at scroll 0').toBeLessThan(0.15);
    expect(atTop!.ctaOp, 'CTA visible at scroll 0').toBeGreaterThan(0.9);

    await page.evaluate(() => {
      const scroll = document.querySelector(
        '.why-page .why-scroll',
      ) as HTMLElement;
      scroll.scrollTop = 100;
      scroll.dispatchEvent(new Event('scroll', { bubbles: true }));
    });
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

    // Scroll to real bottom after layout may have changed (do not use stale atTop.maxScroll).
    await page.evaluate(() => {
      const scroll = document.querySelector(
        '.why-page .why-scroll',
      ) as HTMLElement;
      scroll.scrollTop = Math.max(0, scroll.scrollHeight - scroll.clientHeight);
      scroll.dispatchEvent(new Event('scroll', { bubbles: true }));
    });
    await waitTwoFrames(page);
    await expect
      .poll(
        async () => {
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

      const read = (els: HTMLElement[]) =>
        els.map((p) => {
          const cs = getComputedStyle(p);
          return {
            s: parseFloat(cs.getPropertyValue('--why-line-scale') || '1'),
            i: parseFloat(cs.getPropertyValue('--why-line-inset') || '0'),
          };
        });

      const jumpBottom = () => {
        scroll.scrollTop = Math.max(0, scroll.scrollHeight - scroll.clientHeight);
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
      jumpBottom();
      await waitFrames(6);

      const topTwo = read(ps.slice(0, 2));
      const lastTwo = read(ps.slice(-2));
      const endPhase = parseFloat(
        getComputedStyle(box).getPropertyValue('--why-end-phase') || '0',
      );
      return { topTwo, lastTwo, endPhase };
    });

    expect(state).not.toBeNull();
    expect(state!.endPhase).toBeGreaterThan(0.9);
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

  test('edge veils shrink in end phase versus middle phase', async ({ page }) => {
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

      const read = () => {
        const topH = parseFloat(getComputedStyle(box, '::before').height || '0');
        const bottomH = parseFloat(getComputedStyle(bottomVeil).height || '0');
        const endPhase = parseFloat(
          getComputedStyle(box).getPropertyValue('--why-end-phase') || '0',
        );
        return { topH, bottomH, endPhase };
      };

      scroll.scrollTop = Math.max(
        0,
        (scroll.scrollHeight - scroll.clientHeight) * 0.5,
      );
      scroll.dispatchEvent(new Event('scroll', { bubbles: true }));
      await waitFrames(4);
      const mid = read();

      scroll.scrollTop = Math.max(0, scroll.scrollHeight - scroll.clientHeight);
      scroll.dispatchEvent(new Event('scroll', { bubbles: true }));
      await waitFrames(6);
      const end = read();

      return { mid, end };
    });

    expect(heights).not.toBeNull();
    expect(heights!.mid.endPhase).toBeLessThan(0.5);
    expect(heights!.end.endPhase).toBeGreaterThan(0.9);
    expect(heights!.end.topH).toBeLessThan(heights!.mid.topH - 8);
    expect(heights!.end.bottomH).toBeLessThan(heights!.mid.bottomH - 8);
  });
});
