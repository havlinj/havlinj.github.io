import {
  MAINTENANCE_CLASSES,
  MAINTENANCE_LAYOUT,
  MAINTENANCE_SELECTORS,
} from '../constants/maintenance-panel';

function startMaintenancePanelEdgeSync(): void {
  const panel = document.querySelector(MAINTENANCE_SELECTORS.panel);
  const panelMedia = document.querySelector(MAINTENANCE_SELECTORS.panelMedia);

  if (!(panel instanceof HTMLElement)) return;

  const panelEl = panel;
  const panelMediaEl = panelMedia instanceof HTMLElement ? panelMedia : null;
  let raf = 0;
  let cachedEdge = '';
  let revealed = false;

  function forceReveal(): void {
    if (revealed) return;
    revealed = true;
    if (panelMediaEl) {
      panelMediaEl.classList.remove(MAINTENANCE_CLASSES.panelMediaPending);
      panelMediaEl.classList.add(MAINTENANCE_CLASSES.panelMediaVisible);
    }
  }

  function revealAfterStableLayout(): void {
    if (revealed) return;
    forceReveal();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        schedule();
      });
    });
  }

  function flush(): void {
    const edge = Math.max(
      1,
      Math.min(panelEl.clientWidth, panelEl.clientHeight),
    );
    const value = `${edge}px`;
    if (cachedEdge !== value) {
      cachedEdge = value;
      panelEl.style.setProperty('--route-maintenance-panel-edge', value);
    }
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

  window.addEventListener('resize', schedule, { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', schedule, {
      passive: true,
    });
  }
  window.addEventListener('orientationchange', schedule, { passive: true });
  window.addEventListener(
    'pageshow',
    (event) => {
      if (event.persisted) schedule();
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
  }, MAINTENANCE_LAYOUT.revealFallbackMs);

  schedule();
  requestAnimationFrame(() => {
    requestAnimationFrame(schedule);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startMaintenancePanelEdgeSync, {
    once: true,
  });
} else {
  startMaintenancePanelEdgeSync();
}
