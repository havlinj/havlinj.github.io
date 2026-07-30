import {
  CONTACT_CLASSES,
  CONTACT_LAYOUT,
  CONTACT_SELECTORS,
} from '../constants/contact-layout';
import {
  applyContactFitPasses,
  clampContactInsetPanelPadFrac,
  computeLinksTopPxForCenterFromBottom,
  outerRectSizeWithMarginsCeil,
  resolveContactFluidFontPx,
} from '../utils/contact-layout-math';

type NeededContent = {
  neededWidth: number;
  neededHeight: number;
};

function startContactInsetFit(): void {
  const panel = document.querySelector(CONTACT_SELECTORS.panel);
  const fitContent = document.querySelector(CONTACT_SELECTORS.fitContent);
  const linksRect = document.querySelector(CONTACT_SELECTORS.linksRect);
  const zone = document.querySelector(CONTACT_SELECTORS.zone);
  const mainEl = document.querySelector(CONTACT_SELECTORS.mainContent);

  if (!(panel instanceof HTMLElement) || !(linksRect instanceof HTMLElement)) {
    return;
  }
  const panelEl = panel;
  const fitContentEl = fitContent instanceof HTMLElement ? fitContent : null;
  const linksRectEl = linksRect;
  const cssVarCache = new Map<string, string>();

  const padFrac = clampContactInsetPanelPadFrac(
    CONTACT_LAYOUT.insetPanelPadFrac,
  );
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
    setPanelVar(
      '--contact-link-tail-min-px',
      `${Math.round(
        Math.max(
          CONTACT_LAYOUT.linkTailMinPx,
          panelEdge * CONTACT_LAYOUT.linkTailMinPanelRatio,
        ),
      )}px`,
    );

    const insetPadPx = panelEl.clientWidth * padFrac * 0.5;
    setPanelVar('--contact-stack-top-px', `${Math.round(insetPadPx)}px`);
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
    return outerRectSizeWithMarginsCeil(
      rectEl.scrollWidth,
      rectEl.scrollHeight,
      ml,
      mr,
      mt,
      mb,
    );
  }

  function measureNeededContent(): NeededContent {
    const leftPad = Math.round(readPanelLeftPadPx());
    const links = measureRectOuterSize(linksRectEl);
    return {
      neededWidth: links.w + leftPad + CONTACT_LAYOUT.fitSafetyXPx,
      neededHeight: links.h + CONTACT_LAYOUT.fitSafetyYPx,
    };
  }

  function flush(): void {
    const panelEdge = Math.max(
      1,
      Math.min(panelEl.clientWidth, panelEl.clientHeight),
    );
    const cssFontPx = parseFloat(getComputedStyle(panelEl).fontSize);
    let desiredFontPx = resolveContactFluidFontPx(panelEdge, cssFontPx);

    applyFontAndPanelMetrics(desiredFontPx, panelEdge);
    let { neededWidth, neededHeight } = measureNeededContent();

    ({ desiredFontPx, neededWidth, neededHeight } = applyContactFitPasses({
      panelEdge,
      desiredFontPx,
      neededWidth,
      neededHeight,
      measureAtFont: (fontPx) => {
        applyFontAndPanelMetrics(fontPx, panelEdge);
        return measureNeededContent();
      },
    }));
    applyFontAndPanelMetrics(desiredFontPx, panelEdge);

    const links = measureRectOuterSize(linksRectEl);
    const panelH = Math.max(1, panelEl.clientHeight);
    const linksTopPx = computeLinksTopPxForCenterFromBottom(panelH, links.h);
    setPanelVar('--contact-links-top-px', `${linksTopPx}px`);
    setPanelVar('--contact-links-y-transform', 'none');

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
