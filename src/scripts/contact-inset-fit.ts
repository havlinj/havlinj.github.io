const CONTACT_INSET_PANEL_PAD_FRAC = 0.1;
const CONTACT_INSET_MAX_RATIO = 1;
const CONTACT_BASELINE_FONT_PX = 16;
const CONTACT_INSET_FIT_SAFETY_X_PX = 2;
const CONTACT_INSET_FIT_SAFETY_Y_PX = 6;
const CONTACT_INSET_MAX_FIT_PASSES = 5;

function startContactInsetFit(): void {
  const panel = document.querySelector('.contact-page .page-buttons-panel');
  const introRect = document.querySelector('.contact-page__inset-rect--intro');
  const linksRect = document.querySelector('.contact-page__inset-rect--links');
  const zone = document.querySelector('.contact-page .page-buttons-zone');
  const mainEl = document.querySelector('main.content');

  if (
    !(panel instanceof HTMLElement) ||
    !(introRect instanceof HTMLElement) ||
    !(linksRect instanceof HTMLElement)
  ) {
    return;
  }
  const panelEl = panel;
  const introRectEl = introRect;
  const linksRectEl = linksRect;

  const padFrac =
    Number.isFinite(CONTACT_INSET_PANEL_PAD_FRAC) && CONTACT_INSET_PANEL_PAD_FRAC > 0
      ? Math.min(0.5, CONTACT_INSET_PANEL_PAD_FRAC)
      : 0.1;
  let raf = 0;

  function getZoomScale(): number {
    const vv = window.visualViewport;
    const raw = vv?.scale;
    return Number.isFinite(raw) && raw && raw > 0 ? raw : 1;
  }

  function applyFontAndPanelMetrics(fontPx: number, panelEdge: number): void {
    panelEl.style.setProperty('--contact-panel-edge', `${panelEdge}px`);
    panelEl.style.setProperty('--contact-fluid-font', `${fontPx.toFixed(3)}px`);

    const insetPadPx = panelEl.clientWidth * padFrac * 0.5;
    panelEl.style.setProperty('--contact-stack-top-px', `${Math.round(insetPadPx)}px`);
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

  function measureNeededContent(panelEdge: number): {
    neededWidth: number;
    neededHeight: number;
    topPad: number;
    rightPad: number;
    rowGap: number;
    introH: number;
  } {
    const topPad = Math.round(panelEl.clientWidth * padFrac * 0.5);
    const rightPad = Math.round(topPad * 0.5);
    const rowGap = parseFloat(getComputedStyle(panelEl).getPropertyValue('--contact-box-gap-px')) || 18;
    const intro = measureRectOuterSize(introRectEl);
    const links = measureRectOuterSize(linksRectEl);
    const neededWidth =
      Math.max(intro.w, links.w) + rightPad + CONTACT_INSET_FIT_SAFETY_X_PX;
    const neededHeight =
      topPad +
      intro.h +
      rowGap +
      links.h +
      topPad +
      CONTACT_INSET_FIT_SAFETY_Y_PX;
    return {
      neededWidth,
      neededHeight,
      topPad,
      rightPad,
      rowGap,
      introH: intro.h,
    };
  }

  function flush(): void {
    const panelEdge = Math.max(1, Math.min(panelEl.clientWidth, panelEl.clientHeight));
    const zoomScale = getZoomScale();
    const baselinePanelEdge = panelEdge * zoomScale;
    const fontToEdgeRatio = CONTACT_BASELINE_FONT_PX / Math.max(1, baselinePanelEdge);
    let desiredFontPx = Math.max(1, panelEdge * fontToEdgeRatio);

    applyFontAndPanelMetrics(desiredFontPx, panelEdge);
    let { neededWidth, neededHeight, topPad, rowGap, introH } =
      measureNeededContent(panelEdge);

    const availW = panelEdge * CONTACT_INSET_MAX_RATIO;
    const availH = panelEdge * CONTACT_INSET_MAX_RATIO;
    let pass = 0;
    while (
      (neededWidth > availW || neededHeight > availH) &&
      pass < CONTACT_INSET_MAX_FIT_PASSES
    ) {
      const scale = Math.min(availW / neededWidth, availH / neededHeight, 1);
      desiredFontPx = Math.max(1, desiredFontPx * scale);
      applyFontAndPanelMetrics(desiredFontPx, panelEdge);
      ({ neededWidth, neededHeight, topPad, rowGap, introH } =
        measureNeededContent(panelEdge));
      pass += 1;
    }

    panelEl.style.setProperty('--contact-intro-top-px', `${topPad}px`);
    panelEl.style.setProperty('--contact-links-top-px', `${topPad + introH + rowGap}px`);
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
    window.visualViewport.addEventListener('resize', schedule, { passive: true });
    window.visualViewport.addEventListener('scroll', schedule, { passive: true });
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

  schedule();
  requestAnimationFrame(() => {
    requestAnimationFrame(schedule);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startContactInsetFit, { once: true });
} else {
  startContactInsetFit();
}
