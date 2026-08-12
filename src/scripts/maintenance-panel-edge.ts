import { MAINTENANCE_SELECTORS } from '../constants/maintenance-panel';

function startMaintenancePanelEdgeSync(): void {
  const panel = document.querySelector(MAINTENANCE_SELECTORS.panel);
  if (!(panel instanceof HTMLElement)) return;

  const panelEl = panel;
  let raf = 0;
  let cachedEdge = '';

  function flush(): void {
    const edge = Math.max(
      1,
      Math.min(panelEl.clientWidth, panelEl.clientHeight),
    );
    const value = `${edge}px`;
    if (cachedEdge === value) return;
    cachedEdge = value;
    panelEl.style.setProperty('--route-maintenance-panel-edge', value);
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
