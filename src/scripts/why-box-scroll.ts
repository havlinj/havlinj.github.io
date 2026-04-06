/* eslint-disable @typescript-eslint/ban-ts-comment -- intentional for this DOM-only entry */
// @ts-nocheck — DOM-heavy client script; early returns narrow types; full HTMLElement typing is noisy.
import {
  WHY_CTA_EDGE_MIN_PX,
  WHY_CTA_EDGE_WIDTH_FRAC,
  WHY_CTA_LEAD_TRACK,
} from '../constants/why-layout';

(function () {
  const scrollEl = document.querySelector('.why-page .why-scroll');
  if (!scrollEl) return;
  const boxEl = scrollEl.closest('.why-box');
  if (!boxEl) return;
  const ctaEl = boxEl.querySelector('.why-scroll-cta');
  const contentEl = scrollEl.querySelector('.why-content');
  if (!contentEl) return;
  const topSpacer = scrollEl.querySelector('.why-spacer--top');
  const bottomSpacer = scrollEl.querySelector('.why-spacer--bottom');
  if (!topSpacer || !bottomSpacer) return;

  const lines = Array.from(scrollEl.querySelectorAll('p'));
  if (lines.length === 0) return;

  const gifEl = scrollEl.querySelector('.why-gif-holder');
  const leadForCta = scrollEl.querySelector('p.why-lead');

  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const smoothstep = (x) => x * x * (3 - 2 * x);

  function lineTextStartLeftPx(lineEl) {
    try {
      const range = document.createRange();
      range.selectNodeContents(lineEl);
      const rects = range.getClientRects();
      if (rects.length > 0) return rects[0].left;
    } catch {
      /* ignore Range errors and use fallback */
    }
    const rr = lineEl.getBoundingClientRect();
    const cs = getComputedStyle(lineEl);
    const padL = Number.parseFloat(cs.paddingLeft) || 0;
    return rr.left + padL;
  }

  /**
   * Intersection of `rect` with padded CTA zone. Returns 1 if no overlap, else 1 − smoothstep(blend).
   * yWeight/xWeight tweak vertical vs horizontal sensitivity (text vs GIF use different pairs).
   */
  function ctaOverlapMultiplier(rect, zone, yWeight, xWeight) {
    const oy =
      Math.min(rect.bottom, zone.bottom) - Math.max(rect.top, zone.top);
    if (oy <= 0) return 1;
    const ox =
      Math.min(rect.right, zone.right) - Math.max(rect.left, zone.left);
    if (ox <= 0) return 1;
    const fracY = oy / Math.max(rect.height, 1);
    const fracX = ox / Math.max(rect.width, 1);
    return 1 - smoothstep(Math.min(1, fracY * yWeight + fracX * xWeight));
  }

  let rafId = 0;
  let settleFrames = 0;

  const requestZoomSettle = (frames = 4) => {
    settleFrames = Math.max(settleFrames, frames);
    schedule();
  };

  const schedule = () => {
    if (rafId) return;
    rafId = requestAnimationFrame(update);
  };

  function update() {
    rafId = 0;
    const maxScroll = Math.max(
      0,
      scrollEl.scrollHeight - scrollEl.clientHeight,
    );
    const boxRect = scrollEl.getBoundingClientRect();
    const contentRect = contentEl.getBoundingClientRect();
    const boxOuterRect = boxEl.getBoundingClientRect();
    const half = boxRect.height / 2;
    const center = boxRect.top + half;
    const firstLine = lines[0];
    const firstRect = firstLine.getBoundingClientRect();
    const firstHeight = firstRect.height || 0;
    const gifHeightRaw = gifEl ? gifEl.getBoundingClientRect().height || 0 : 0;
    const scrollStyle = window.getComputedStyle(scrollEl);
    const padTop = Number.parseFloat(scrollStyle.paddingTop) || 0;
    const padBottom = Number.parseFloat(scrollStyle.paddingBottom) || 0;

    // Bottom start-cover: strong at scrollTop 0, fades as user scrolls (hides peeking last line).
    const startBandPx = Math.max(85, scrollEl.clientHeight * 0.26);
    const startProgress = clamp(scrollEl.scrollTop / startBandPx, 0, 1);
    const startOpacity = 1 - smoothstep(startProgress);
    boxEl.style.setProperty(
      '--why-start-cover-opacity',
      startOpacity.toFixed(3),
    );

    // Scroll-hint arrow: fades out over first ~56px of scroll.
    const ctaFadePx = 56;
    const ctaProgress = clamp(scrollEl.scrollTop / ctaFadePx, 0, 1);
    const ctaO = 1 - smoothstep(ctaProgress);
    boxEl.style.setProperty('--why-cta-opacity', ctaO.toFixed(3));
    if (ctaEl) {
      ctaEl.style.visibility = ctaO < 0.002 ? 'hidden' : 'visible';
    }

    // CTA X: first line start (incl. --why-base-inset) + WHY_CTA_LEAD_TRACK × line width; center via translateX(-50%).
    if (ctaEl && leadForCta) {
      try {
        const range = document.createRange();
        range.selectNodeContents(leadForCta);
        const fr = range.getClientRects();
        if (fr.length > 0) {
          const r0 = fr[0];
          let anchor =
            r0.left - boxOuterRect.left + WHY_CTA_LEAD_TRACK * r0.width;
          const edge = Math.max(
            WHY_CTA_EDGE_MIN_PX,
            boxOuterRect.width * WHY_CTA_EDGE_WIDTH_FRAC,
          );
          anchor = clamp(anchor, edge, boxOuterRect.width - edge);
          boxEl.style.setProperty('--why-cta-left', `${anchor.toFixed(2)}px`);
        }
      } catch {
        /* ignore Range errors */
      }
    }

    // Keep a minimum gap between lead bottom and CTA top (strong zoom / short box otherwise stacks them).
    if (ctaEl) {
      if (ctaO < 0.002) {
        ctaEl.style.transform = 'translateX(-50%)';
      } else {
        ctaEl.style.transform = 'translateX(-50%)';
        const ctaBase = ctaEl.getBoundingClientRect();
        const minGapPx = Math.max(40, firstHeight * 0.6);
        const gap = ctaBase.top - firstRect.bottom;
        let pushDown = Math.max(0, minGapPx - gap);
        const maxPush = Math.max(0, boxOuterRect.bottom - ctaBase.bottom - 16);
        pushDown = Math.min(pushDown, maxPush);
        ctaEl.style.transform =
          pushDown > 0
            ? `translateX(-50%) translateY(${pushDown}px)`
            : 'translateX(-50%)';
      }
    }

    // Expanded CTA bounds while arrow is visible — lines/GIF fade where they overlap (not .why-lead).
    let ctaZone = null;
    if (ctaEl && ctaO > 0.04 && ctaEl.style.visibility !== 'hidden') {
      const cr = ctaEl.getBoundingClientRect();
      if (cr.width > 4 && cr.height > 4) {
        const padH = Math.max(24, cr.width * 0.35);
        const padTop = 16;
        const padBottom = 28;
        ctaZone = {
          left: cr.left - padH,
          right: cr.right + padH,
          top: cr.top - padTop,
          bottom: cr.bottom + padBottom,
        };
      }
    }

    // Top end-cover: fades in near maxScroll so earlier lines don’t linger above the closing lines.
    const coverBandPx = Math.max(70, scrollEl.clientHeight * 0.22);
    const coverProgress = maxScroll
      ? clamp(
          (scrollEl.scrollTop - (maxScroll - coverBandPx)) / coverBandPx,
          0,
          1,
        )
      : 0;
    boxEl.style.setProperty(
      '--why-end-cover-opacity',
      smoothstep(coverProgress).toFixed(3),
    );

    // First two <p> (lead + wide block): gated by introBlend; same blend drives --why-top-edge-opacity (::before).
    const introLineCount = 2;
    const introRampPx = Math.max(100, scrollEl.clientHeight * 0.22);
    const introBlend = smoothstep(
      clamp(scrollEl.scrollTop / introRampPx, 0, 1),
    );
    boxEl.style.setProperty('--why-top-edge-opacity', introBlend.toFixed(3));

    // Keep GIF footprint proportional to the panel on compact screens:
    // the visual system (lead near center) should dominate over GIF height.
    let gifFootprintPx = gifHeightRaw;
    if (gifHeightRaw > 0) {
      // Narrow/zoom-like viewports should allocate relatively less vertical budget to GIF.
      const narrowness = clamp((520 - boxRect.width) / 220, 0, 1);
      const maxBoxFrac = 0.34 - 0.1 * narrowness; // ~34% desktop -> ~24% compact
      const maxByBox = boxRect.height * maxBoxFrac;
      // Keep some visible GIF presence, but do not force a large minimum near the lead row.
      const minByLead = Math.max(firstHeight * 0.55, 24);
      gifFootprintPx = clamp(Math.min(gifHeightRaw, maxByBox), minByLead, gifHeightRaw);
      const gifBaseScale = clamp(gifFootprintPx / gifHeightRaw, 0.5, 1);
      gifEl?.style.setProperty('--why-gif-base-scale', gifBaseScale.toFixed(3));
    }

    // Lead line top on scroll-center; spacers + intro padding absorb the normalized GIF footprint.
    const leadDownPx = firstHeight * 0.18;
    const topSpacerPx = Math.max(0, half - padTop - gifFootprintPx + leadDownPx);
    // Extra bottom scroll room only — keeps last line from sticking too early; start phase unchanged.
    const endScrollExtraPx = half * 0.32;
    const bottomSpacerPx = Math.max(
      0,
      half - padBottom - gifFootprintPx + endScrollExtraPx,
    );
    topSpacer.style.height = `${topSpacerPx.toFixed(2)}px`;
    bottomSpacer.style.height = `${bottomSpacerPx.toFixed(2)}px`;

    // CSS vars for .why-gif-holder top calc and .why-block--intro padding-top.
    contentEl.style.setProperty(
      '--why-scroll-pad-top',
      `${padTop.toFixed(2)}px`,
    );
    contentEl.style.setProperty(
      '--why-intro-gif-pad',
      `${gifFootprintPx.toFixed(2)}px`,
    );
    contentEl.style.setProperty('--why-gif-nudge-y', '0px');

    // Distance from center (normalized) → scale/inset; wide bands = smoother thresholds.
    const centerBand = 0.4;
    const transitionBand = 0.45;

    lines.forEach((line, lineIndex) => {
      const r = line.getBoundingClientRect();
      const mid = (r.top + r.bottom) / 2;
      const normalized = Math.abs(mid - center) / half;

      const edgeProgress = clamp(
        (normalized - centerBand) / transitionBand,
        0,
        1,
      );
      const eased = smoothstep(edgeProgress);
      const gate = lineIndex < introLineCount ? introBlend : 1;
      const blendedEased = eased * gate;

      const isLead = line.classList.contains('why-lead');
      // Lead stays visually heavier than body lines.
      const scaleDrop = isLead ? 0.3 : 0.5;
      const maxInset = isLead ? 2.4 : 4;
      const scale = 1 - scaleDrop * blendedEased;
      const inset = maxInset * blendedEased;

      line.style.setProperty('--why-line-scale', scale.toFixed(2));
      line.style.setProperty('--why-line-inset', `${inset.toFixed(2)}rem`);

      let lineOp = 1;
      if (ctaZone && !isLead) {
        lineOp = ctaOverlapMultiplier(
          line.getBoundingClientRect(),
          ctaZone,
          0.92,
          0.12,
        );
      }
      line.style.setProperty('--why-line-opacity', lineOp.toFixed(3));
    });

    // Re-read line geometry after transforms were written this frame.
    // This avoids 1-frame stale alignment and keeps GIF X attached to the truly centered line.
    let activeLineInset = 0;
    let activeLineDist = Number.POSITIVE_INFINITY;
    let activeLineLeftPx = Number.NaN;
    lines.forEach((line) => {
      const rr = line.getBoundingClientRect();
      const dist = Math.abs((rr.top + rr.bottom) / 2 - center);
      if (dist < activeLineDist) {
        activeLineDist = dist;
        activeLineLeftPx = lineTextStartLeftPx(line) - contentRect.left;
        const insetRaw = line.style.getPropertyValue('--why-line-inset').trim();
        const insetRem = Number.parseFloat(insetRaw);
        activeLineInset = Number.isFinite(insetRem) ? insetRem : 0;
      }
    });

    // GIF: same center-distance easing as text; lift via --why-gif-y doesn’t affect spacer math.
    if (gifEl) {
      const r = gifEl.getBoundingClientRect();
      const mid = (r.top + r.bottom) / 2;
      const normalized = Math.abs(mid - center) / half;

      const edgeProgress = clamp(
        (normalized - centerBand) / transitionBand,
        0,
        1,
      );
      const eased = smoothstep(edgeProgress);
      const gifEased = eased * introBlend;

      const liftPx = firstHeight * 0.75; // optical: GIF sits slightly above lead
      gifEl.style.setProperty('--why-gif-y', `${(-liftPx).toFixed(1)}px`);

      const scaleDrop = 0.35;
      const maxInset = 3.2;
      const scale = 1 - scaleDrop * gifEased;
      const inset = activeLineInset;

      gifEl.style.setProperty('--why-line-scale', scale.toFixed(2));
      gifEl.style.setProperty('--why-line-inset', `${inset.toFixed(2)}rem`);
      if (Number.isFinite(activeLineLeftPx)) {
        gifEl.style.setProperty(
          '--why-gif-align-x',
          `${activeLineLeftPx.toFixed(2)}px`,
        );
      }

      const opacityDrop = 0.75;
      let opacity = clamp(1 - opacityDrop * gifEased, 0, 1);
      if (ctaZone) {
        opacity *= ctaOverlapMultiplier(
          gifEl.getBoundingClientRect(),
          ctaZone,
          0.9,
          0.1,
        );
      }
      gifEl.style.setProperty('--why-gif-opacity', opacity.toFixed(3));
    }
    if (settleFrames > 0) {
      settleFrames -= 1;
      schedule();
    }
  }

  function afterTwoFrames(fn) {
    requestAnimationFrame(() => requestAnimationFrame(fn));
  }

  function revealAfterStableLayout() {
    update();
    update(); // second pass after spacer/GIF vars settle layout
    contentEl.classList.remove('why-content--pending-layout');
    contentEl.classList.add('why-content--ready');
  }

  function init() {
    const fontsReady = document.fonts?.ready ?? Promise.resolve(); // avoid first-frame metric jump
    fontsReady.finally(() => afterTwoFrames(revealAfterStableLayout));
  }

  scrollEl.addEventListener('scroll', schedule, { passive: true });
  scrollEl.addEventListener(
    'wheel',
    (event) => {
      if (event.ctrlKey) requestZoomSettle(5);
    },
    { passive: true },
  );
  window.addEventListener('resize', () => requestZoomSettle(4));
  window.visualViewport?.addEventListener('resize', () => requestZoomSettle(4));
  init();
})();
