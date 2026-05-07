import {
  CONTACT_CLASSES,
  CONTACT_LAYOUT,
  CONTACT_SELECTORS,
} from '../constants/contact-layout';

type NeededContent = {
  neededWidth: number;
  neededHeight: number;
  topPad: number;
  introH: number;
};

function startContactInsetFit(): void {
  const panel = document.querySelector(CONTACT_SELECTORS.panel);
  const fitContent = document.querySelector(CONTACT_SELECTORS.fitContent);
  const introRect = document.querySelector(CONTACT_SELECTORS.introRect);
  const linksRect = document.querySelector(CONTACT_SELECTORS.linksRect);
  const zone = document.querySelector(CONTACT_SELECTORS.zone);
  const mainEl = document.querySelector(CONTACT_SELECTORS.mainContent);

  if (
    !(panel instanceof HTMLElement) ||
    !(introRect instanceof HTMLElement) ||
    !(linksRect instanceof HTMLElement)
  ) {
    return;
  }
  const panelEl = panel;
  const fitContentEl = fitContent instanceof HTMLElement ? fitContent : null;
  const introRectEl = introRect;
  const linksRectEl = linksRect;
  const cssVarCache = new Map<string, string>();

  const padFrac =
    Number.isFinite(CONTACT_LAYOUT.insetPanelPadFrac) &&
    CONTACT_LAYOUT.insetPanelPadFrac > 0
      ? Math.min(0.5, CONTACT_LAYOUT.insetPanelPadFrac)
      : 0.1;
  let raf = 0;
  let revealed = false;

  function setPanelVar(name: string, value: string): void {
    if (cssVarCache.get(name) === value) return;
    cssVarCache.set(name, value);
    panelEl.style.setProperty(name, value);
  }

  function forceReveal(): void {
    if (revealed || !fitContentEl) return;
    revealed = true;
    fitContentEl.classList.remove(CONTACT_CLASSES.fitPending);
    fitContentEl.classList.add(CONTACT_CLASSES.fitVisible);
    fitContentEl.removeAttribute('aria-busy');
  }

  function revealAfterStableLayout(): void {
    if (revealed || !fitContentEl) return;
    // Reveal right after first measured layout pass; keep refinement async.
    forceReveal();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        schedule();
      });
    });
  }

  function applyFontAndPanelMetrics(fontPx: number, panelEdge: number): void {
    setPanelVar('--contact-panel-edge', `${panelEdge}px`);
    setPanelVar('--contact-fluid-font', `${fontPx.toFixed(3)}px`);

    const insetPadPx = panelEl.clientWidth * padFrac * 0.5;
    setPanelVar('--contact-stack-top-px', `${Math.round(insetPadPx)}px`);
  }

  function readPanelTopPadPx(): number {
    const paddingTopPx = parseFloat(getComputedStyle(panelEl).paddingTop);
    return Number.isFinite(paddingTopPx) ? paddingTopPx : 0;
  }

  function readPanelLeftPadPx(): number {
    const paddingLeftPx = parseFloat(getComputedStyle(panelEl).paddingLeft);
    return Number.isFinite(paddingLeftPx) ? paddingLeftPx : 0;
  }

  function measureRectOuterSize(rectEl: HTMLElement): { w: number; h: number } {
    const cs = getComputedStyle(rectEl);
    const ml = parseFloat(cs.marginLeft) || 0;
    const mr = parseFloat(cs.marginRight) || 0;
    const mt = parseFloat(cs.marginTop) || 0;
    const mb = parseFloat(cs.marginBottom) || 0;
    return {
      w: Math.ceil(rectEl.scrollWidth + ml + mr),
      h: Math.ceil(rectEl.scrollHeight + mt + mb),
    };
  }

  function measureNeededContent(): NeededContent {
    const topPad = Math.round(readPanelTopPadPx());
    const leftPad = Math.round(readPanelLeftPadPx());
    const intro = measureRectOuterSize(introRectEl);
    const links = measureRectOuterSize(linksRectEl);
    const neededWidth =
      Math.max(intro.w, links.w) + leftPad + CONTACT_LAYOUT.fitSafetyXPx;
    const neededHeight =
      topPad +
      intro.h +
      intro.h +
      links.h +
      topPad +
      CONTACT_LAYOUT.fitSafetyYPx;
    return {
      neededWidth,
      neededHeight,
      topPad,
      introH: intro.h,
    };
  }

  function computeDesiredFontPx(panelEdge: number): number {
    const baselineEdge = Math.max(1, CONTACT_LAYOUT.smallPanelEdgePx);
    const fontToEdgeRatio = CONTACT_LAYOUT.baselineFontPx / baselineEdge;
    const baseFontPx = panelEdge * fontToEdgeRatio;
    const smallPanelScale =
      panelEdge <= CONTACT_LAYOUT.smallPanelEdgePx
        ? CONTACT_LAYOUT.smallPanelFontScale
        : 1;
    const scaledFontPx = baseFontPx * smallPanelScale;
    return Math.min(
      CONTACT_LAYOUT.maxFontPx,
      Math.max(CONTACT_LAYOUT.minFontPx, scaledFontPx),
    );
  }

  function flush(): void {
    const panelEdge = Math.max(
      1,
      Math.min(panelEl.clientWidth, panelEl.clientHeight),
    );
    // CSS-first: keep current computed size as baseline and let JS only nudge it.
    const cssFontPx = parseFloat(getComputedStyle(panelEl).fontSize);
    let desiredFontPx = Number.isFinite(cssFontPx)
      ? cssFontPx
      : computeDesiredFontPx(panelEdge);
    desiredFontPx = Math.min(
      CONTACT_LAYOUT.maxFontPx,
      Math.max(CONTACT_LAYOUT.minFontPx, desiredFontPx),
    );

    applyFontAndPanelMetrics(desiredFontPx, panelEdge);
    let measured = measureNeededContent();
    let { neededWidth, neededHeight, topPad, introH } = measured;

    const availW = panelEdge * CONTACT_LAYOUT.insetMaxRatio;
    const availH = panelEdge * CONTACT_LAYOUT.insetMaxRatio;
    let pass = 0;
    while (
      (neededWidth > availW || neededHeight > availH) &&
      pass < CONTACT_LAYOUT.maxFitPasses
    ) {
      const scale = Math.min(availW / neededWidth, availH / neededHeight, 1);
      desiredFontPx = Math.max(CONTACT_LAYOUT.minFontPx, desiredFontPx * scale);
      applyFontAndPanelMetrics(desiredFontPx, panelEdge);
      measured = measureNeededContent();
      ({ neededWidth, neededHeight, topPad, introH } = measured);
      pass += 1;
    }

    setPanelVar('--contact-intro-top-px', `${topPad}px`);
    setPanelVar('--contact-links-top-px', `${topPad + introH + introH}px`);

    revealAfterStableLayout();
  }

  function schedule(): void {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      flush();
    });
  }

  const ro = new ResizeObserver(() => schedule());
  ro.observe(panelEl);
  if (zone instanceof HTMLElement) ro.observe(zone);
  if (mainEl instanceof HTMLElement) ro.observe(mainEl);

  window.addEventListener('resize', schedule, { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', schedule, {
      passive: true,
    });
  }
  window.addEventListener('orientationchange', schedule, { passive: true });
  window.addEventListener(
    'pageshow',
    (e) => {
      if (e.persisted) schedule();
    },
    { passive: true },
  );

  const fonts = document.fonts;
  if (fonts && typeof fonts.ready !== 'undefined') {
    fonts.ready
      .then(() => {
        schedule();
        requestAnimationFrame(() => {
          requestAnimationFrame(schedule);
        });
      })
      .catch(() => {
        schedule();
      });
  }
  window.addEventListener('load', schedule, { passive: true });
  window.setTimeout(() => {
    // Hard fallback: never leave the content hidden if layout stabilization stalls.
    forceReveal();
  }, CONTACT_LAYOUT.revealFallbackMs);

  schedule();
  requestAnimationFrame(() => {
    requestAnimationFrame(schedule);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startContactInsetFit, {
    once: true,
  });
} else {
  startContactInsetFit();
}
