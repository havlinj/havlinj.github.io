/**
 * Opt-in layout / zoom diagnostics for real-device debugging (e.g. mobile Safari).
 *
 * Dev:        ?layoutDebug=1
 * Production: set PUBLIC_LAYOUT_DEBUG_TOKEN at build time, then ?layoutDebug=<same token>
 *
 * Never enable by URL alone on prod without the env token — avoids accidental exposure.
 */
const TOKEN = import.meta.env.PUBLIC_LAYOUT_DEBUG_TOKEN ?? '';

function layoutDebugAllowed(param: string | null): boolean {
  if (!param) return false;
  if (import.meta.env.DEV) {
    return param === '1' || (!!TOKEN && param === TOKEN);
  }
  return !!TOKEN && param === TOKEN;
}

function readBaseline(): string {
  try {
    return window.sessionStorage.getItem('zoomFreezeBaselineV2') ?? '(none)';
  } catch {
    return '(sessionStorage blocked)';
  }
}

function readContactPanelVars(): Record<string, string> {
  const panel = document.querySelector('.contact-page .page-buttons-panel');
  if (!(panel instanceof HTMLElement)) return {};
  const cs = getComputedStyle(panel);
  const keys = [
    '--contact-fluid-font',
    '--contact-intro-top-px',
    '--contact-links-top-px',
    '--contact-panel-edge',
    '--zoom-freeze-scale',
  ] as const;
  const out: Record<string, string> = {};
  for (const k of keys) {
    const v = cs.getPropertyValue(k).trim();
    if (v) out[k] = v;
  }
  return out;
}

function formatLines(): string {
  const main = document.querySelector('main.content');
  const vv = window.visualViewport;
  const baseline = readBaseline();
  const contact = readContactPanelVars();
  const contactLines =
    Object.keys(contact).length > 0
      ? '\n— contact panel —\n' +
        Object.entries(contact)
          .map(([k, v]) => `${k}: ${v}`)
          .join('\n')
      : '';

  const freezeScale =
    main instanceof HTMLElement
      ? getComputedStyle(main).getPropertyValue('--zoom-freeze-scale').trim() ||
        '(unset)'
      : '(n/a)';

  return [
    `path: ${window.location.pathname}`,
    `inner: ${window.innerWidth}×${window.innerHeight}`,
    `dpr: ${window.devicePixelRatio}`,
    vv
      ? `vv: ${vv.width.toFixed(0)}×${vv.height.toFixed(0)} scale=${vv.scale}`
      : 'vv: (unsupported)',
    `body.zoom-threshold-exceeded: ${document.body.classList.contains('zoom-threshold-exceeded')}`,
    `main.zoom-freeze-active: ${main?.classList.contains('zoom-freeze-active') ?? false}`,
    `--zoom-freeze-scale: ${freezeScale}`,
    `baseline (zoomFreezeBaselineV2): ${baseline}`,
    contactLines,
  ]
    .filter(Boolean)
    .join('\n');
}

function mount(): void {
  const root = document.createElement('div');
  root.setAttribute('data-layout-debug', '');
  root.setAttribute('role', 'region');
  root.setAttribute('aria-label', 'Layout debug overlay');

  const style = document.createElement('style');
  style.textContent = `
    [data-layout-debug] {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 2147483646;
      max-height: 42vh;
      overflow: auto;
      padding: 10px 12px 12px;
      box-sizing: border-box;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11px;
      line-height: 1.35;
      color: #e8f5f7;
      background: rgba(12, 18, 22, 0.92);
      border-top: 1px solid rgba(224, 247, 250, 0.35);
      -webkit-overflow-scrolling: touch;
    }
    [data-layout-debug] pre {
      margin: 0;
      white-space: pre-wrap;
      word-break: break-word;
    }
    [data-layout-debug] header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 8px;
      font-weight: 600;
      letter-spacing: 0.02em;
      color: #80deea;
    }
    [data-layout-debug] button {
      flex-shrink: 0;
      font: inherit;
      cursor: pointer;
      padding: 4px 10px;
      border-radius: 4px;
      border: 1px solid rgba(224, 247, 250, 0.45);
      background: rgba(224, 247, 250, 0.12);
      color: #e0f7fa;
    }
  `;

  const header = document.createElement('header');
  const title = document.createElement('span');
  title.textContent = 'Layout debug';
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.textContent = 'Close';
  header.append(title, closeBtn);

  const pre = document.createElement('pre');
  pre.setAttribute('aria-live', 'polite');

  root.append(style, header, pre);
  document.body.appendChild(root);

  let timer = window.setInterval(() => {
    pre.textContent = formatLines();
  }, 320);

  const refresh = () => {
    pre.textContent = formatLines();
  };
  window.addEventListener('resize', refresh, { passive: true });
  window.visualViewport?.addEventListener('resize', refresh, { passive: true });
  window.visualViewport?.addEventListener('scroll', refresh, { passive: true });

  closeBtn.addEventListener('click', () => {
    window.clearInterval(timer);
    timer = 0;
    window.removeEventListener('resize', refresh);
    window.visualViewport?.removeEventListener('resize', refresh);
    window.visualViewport?.removeEventListener('scroll', refresh);
    root.remove();
    try {
      const u = new URL(window.location.href);
      u.searchParams.delete('layoutDebug');
      window.history.replaceState({}, '', u.pathname + u.search + u.hash);
    } catch {
      /* ignore */
    }
  });

  pre.textContent = formatLines();
}

function boot(): void {
  try {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('layoutDebug');
    if (!layoutDebugAllowed(raw)) return;
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', mount, { once: true });
    } else {
      mount();
    }
  } catch {
    /* ignore */
  }
}

boot();
