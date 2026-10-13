import {
  MAINTENANCE_CLASSES,
  MAINTENANCE_LAYOUT,
  MAINTENANCE_SELECTORS,
  RECONSTRUCTION_CLASSES,
  RECONSTRUCTION_PANEL_EDGE_VAR,
  RECONSTRUCTION_SELECTORS,
} from '../constants/maintenance-panel';

type PanelEdgeTarget = {
  panel: string;
  panelMedia: string;
  pendingClass: string;
  visibleClass: string;
  edgeVar: string;
};

const PANEL_EDGE_TARGETS: readonly PanelEdgeTarget[] = [
  {
    panel: MAINTENANCE_SELECTORS.panel,
    panelMedia: MAINTENANCE_SELECTORS.panelMedia,
    pendingClass: MAINTENANCE_CLASSES.panelMediaPending,
    visibleClass: MAINTENANCE_CLASSES.panelMediaVisible,
    edgeVar: '--route-maintenance-panel-edge',
  },
  {
    panel: RECONSTRUCTION_SELECTORS.panel,
    panelMedia: RECONSTRUCTION_SELECTORS.panelMedia,
    pendingClass: RECONSTRUCTION_CLASSES.panelMediaPending,
    visibleClass: RECONSTRUCTION_CLASSES.panelMediaVisible,
    edgeVar: RECONSTRUCTION_PANEL_EDGE_VAR,
  },
];

function startPanelEdgeSync(target: PanelEdgeTarget): void {
  const panel = document.querySelector(target.panel);
  const panelMedia = document.querySelector(target.panelMedia);

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
      panelMediaEl.classList.remove(target.pendingClass);
      panelMediaEl.classList.add(target.visibleClass);
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
      panelEl.style.setProperty(target.edgeVar, value);
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

function startMaintenancePanelEdgeSync(): void {
  for (const target of PANEL_EDGE_TARGETS) {
    startPanelEdgeSync(target);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startMaintenancePanelEdgeSync, {
    once: true,
  });
} else {
  startMaintenancePanelEdgeSync();
}
