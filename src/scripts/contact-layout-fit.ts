import {
  CONTACT_CLASSES,
  CONTACT_LAYOUT,
  CONTACT_SELECTORS,
} from '../constants/contact-layout';

type NeededContent = {
  neededWidth: number;
  neededHeight: number;
  topPad: number;
  rowGap: number;
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

  const padFrac =
    Number.isFinite(CONTACT_LAYOUT.insetPanelPadFrac) &&
    CONTACT_LAYOUT.insetPanelPadFrac > 0
      ? Math.min(0.5, CONTACT_LAYOUT.insetPanelPadFrac)
      : 0.1;
  let raf = 0;
  let revealed = false;

  function revealAfterStableLayout(): void {
    if (revealed || !fitContentEl) return;
    revealed = true;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        fitContentEl.classList.remove(CONTACT_CLASSES.fitPending);
        fitContentEl.classList.add(CONTACT_CLASSES.fitVisible);
        fitContentEl.removeAttribute('aria-busy');
      });
    });
  }

  function getZoomScale(): number {
    const vv = window.visualViewport;
    const raw = vv?.scale;
    return Number.isFinite(raw) && raw && raw > 0 ? raw : 1;
  }

  function applyFontAndPanelMetrics(fontPx: number, panelEdge: number): void {
    panelEl.style.setProperty('--contact-panel-edge', `${panelEdge}px`);
    panelEl.style.setProperty('--contact-fluid-font', `${fontPx.toFixed(3)}px`);

    const insetPadPx = panelEl.clientWidth * padFrac * 0.5;
    panelEl.style.setProperty(
      '--contact-stack-top-px',
      `${Math.round(insetPadPx)}px`,
    );
    panelEl.style.setProperty(
      '--contact-stack-right-px',
      `${Math.round(insetPadPx * 0.5)}px`,
    );
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
    const topPad = Math.round(panelEl.clientWidth * padFrac * 0.5);
    const rightPad = Math.round(topPad * 0.5);
    const rowGap =
      parseFloat(
        getComputedStyle(panelEl).getPropertyValue('--contact-box-gap-px'),
      ) || CONTACT_LAYOUT.defaultBoxGapPx;
    const intro = measureRectOuterSize(introRectEl);
    const links = measureRectOuterSize(linksRectEl);
    const neededWidth =
      Math.max(intro.w, links.w) + rightPad + CONTACT_LAYOUT.fitSafetyXPx;
    const neededHeight =
      topPad +
      intro.h +
      rowGap +
      links.h +
      topPad +
      CONTACT_LAYOUT.fitSafetyYPx;
    return {
      neededWidth,
      neededHeight,
      topPad,
      rowGap,
      introH: intro.h,
    };
  }

  function computeDesiredFontPx(panelEdge: number): number {
    const zoomScale = getZoomScale();
    const baselinePanelEdge = panelEdge * zoomScale;
    const fontToEdgeRatio =
      CONTACT_LAYOUT.baselineFontPx / Math.max(1, baselinePanelEdge);
    return Math.max(1, panelEdge * fontToEdgeRatio);
  }

  function flush(): void {
    const panelEdge = Math.max(
      1,
      Math.min(panelEl.clientWidth, panelEl.clientHeight),
    );
    let desiredFontPx = computeDesiredFontPx(panelEdge);

    applyFontAndPanelMetrics(desiredFontPx, panelEdge);
    let measured = measureNeededContent();
    let { neededWidth, neededHeight, topPad, rowGap, introH } = measured;

    const availW = panelEdge * CONTACT_LAYOUT.insetMaxRatio;
    const availH = panelEdge * CONTACT_LAYOUT.insetMaxRatio;
    let pass = 0;
    while (
      (neededWidth > availW || neededHeight > availH) &&
      pass < CONTACT_LAYOUT.maxFitPasses
    ) {
      const scale = Math.min(availW / neededWidth, availH / neededHeight, 1);
      desiredFontPx = Math.max(1, desiredFontPx * scale);
      applyFontAndPanelMetrics(desiredFontPx, panelEdge);
      measured = measureNeededContent();
      ({ neededWidth, neededHeight, topPad, rowGap, introH } = measured);
      pass += 1;
    }

    panelEl.style.setProperty('--contact-intro-top-px', `${topPad}px`);
    panelEl.style.setProperty(
      '--contact-links-top-px',
      `${topPad + introH + rowGap}px`,
    );
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
    window.visualViewport.addEventListener('scroll', schedule, {
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
    fonts.ready.then(() => schedule()).catch(() => {});
  }
  window.addEventListener('load', schedule, { passive: true });
  window.setTimeout(
    () => revealAfterStableLayout(),
    CONTACT_LAYOUT.revealFallbackMs,
  );

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
