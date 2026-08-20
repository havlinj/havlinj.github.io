import {
  ZOOM_GUARD_MAX_SAFE_ZOOM,
  ZOOM_GUARD_EXIT_HYSTERESIS,
  ZOOM_GUARD_OVERFLOW_HEAL_THRESHOLD,
  ZOOM_GUARD_WARM_CANCEL_RATIO,
  computeOverflowHealScale,
  computeTargetFreezeScale,
  computeZoomRatio,
  shouldCancelWarmStart,
  shouldKeepFreeze,
  shouldResetZoomFreezeBaseline,
} from '../utils/zoom-guard-math';
import {
  type ZoomFreezeBaselineV2,
  hasValidZoomFreezeBaseline,
  parseZoomFreezeBaselineJson,
  parseZoomGuardStateJson,
} from '../utils/zoom-guard-storage';
import { documentHasContentPanel } from '../constants/content-panel';

const MAX_SAFE_ZOOM = ZOOM_GUARD_MAX_SAFE_ZOOM;
const ZOOM_EXIT_HYSTERESIS = ZOOM_GUARD_EXIT_HYSTERESIS;
const FREEZE_SCALE_UPDATE_EPSILON = 0.01;

const BASELINE_KEY = 'zoomFreezeBaselineV2';
const GUARD_STATE_KEY = 'zoomFreezeGuardStateV2';

let installed = false;

export function initZoomGuard(): void {
  if (installed) return;
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const body = document.body;
  if (!body) return;

  const hasContentPanel = documentHasContentPanel(document);
  if (!hasContentPanel) return;

  installed = true;

  const currentDpr = window.devicePixelRatio || 1;
  const currentVvScale =
    window.visualViewport && window.visualViewport.scale
      ? window.visualViewport.scale
      : 1;
  const currentInnerWidth = window.innerWidth || 0;

  let storedBaselineRaw: string | null = null;
  try {
    storedBaselineRaw = window.sessionStorage.getItem(BASELINE_KEY);
  } catch {
    storedBaselineRaw = null;
  }

  type Baseline = ZoomFreezeBaselineV2;
  let storedBaseline: Baseline | null =
    parseZoomFreezeBaselineJson(storedBaselineRaw);

  let persistedGuardActiveWarm = false;
  let persistedFreezeScaleWarm = 1;
  try {
    const raw = window.sessionStorage.getItem(GUARD_STATE_KEY) ?? null;
    const payload = parseZoomGuardStateJson(raw);
    if (payload) {
      if (typeof payload.active === 'boolean') {
        persistedGuardActiveWarm = payload.active;
      }
      if (typeof payload.freezeScale === 'number') {
        persistedFreezeScaleWarm = payload.freezeScale;
      }
    }
  } catch {
    /* ignore */
  }

  function currentVisualViewportScale(): number {
    const vv = window.visualViewport;
    return vv && vv.scale ? vv.scale : 0;
  }

  function baselineResetInput(baseline: Baseline) {
    return {
      baselineDpr: baseline.dpr,
      baselineVvScale: baseline.vvScale,
      baselineInnerWidth: baseline.innerWidth,
      currentDpr: window.devicePixelRatio || 1,
      currentVvScale:
        window.visualViewport && window.visualViewport.scale
          ? window.visualViewport.scale
          : 1,
      currentInnerWidth: window.innerWidth || 0,
    };
  }

  function shouldResetBaseline(baseline: Baseline): boolean {
    if (!hasValidZoomFreezeBaseline(baseline)) return true;
    return shouldResetZoomFreezeBaseline(baselineResetInput(baseline));
  }

  function zoomRatioForBaseline(bd: number, bv: number, biw: number): number {
    return computeZoomRatio({
      baselineDpr: bd,
      baselineVvScale: bv,
      baselineInnerWidth: biw,
      currentDpr: window.devicePixelRatio || 1,
      currentVvScale: currentVisualViewportScale(),
      currentInnerWidth: window.innerWidth || biw || 1,
    });
  }

  function persistBaseline(baseline: Baseline): void {
    try {
      window.sessionStorage.setItem(
        BASELINE_KEY,
        JSON.stringify({
          dpr: baseline.dpr,
          vvScale: baseline.vvScale,
          innerWidth: baseline.innerWidth,
        }),
      );
    } catch {
      /* ignore */
    }
  }

  function clearPersistedGuardState(): void {
    try {
      window.sessionStorage.removeItem(GUARD_STATE_KEY);
    } catch {
      /* ignore */
    }
  }

  function captureCurrentBaseline(): Baseline {
    return {
      dpr: window.devicePixelRatio || 1,
      vvScale:
        window.visualViewport && window.visualViewport.scale
          ? window.visualViewport.scale
          : 1,
      innerWidth: window.innerWidth || 0,
    };
  }

  /*
   * Always reset when viewport class changed (desktop→narrow, etc.).
   * Warm freeze must not skip that — otherwise squeeze looks like zoom forever.
   */
  if (
    !hasValidZoomFreezeBaseline(storedBaseline) ||
    shouldResetBaseline(storedBaseline)
  ) {
    storedBaseline = {
      dpr: currentDpr,
      vvScale: currentVvScale,
      innerWidth: currentInnerWidth,
    };
    persistBaseline(storedBaseline);
  }

  const sb = storedBaseline as Baseline;
  let baselineDpr = sb.dpr;
  let baselineVvScale = sb.vvScale;
  let baselineInnerWidth = sb.innerWidth;

  const provisionalRatio = zoomRatioForBaseline(
    baselineDpr,
    baselineVvScale,
    baselineInnerWidth,
  );
  if (
    persistedGuardActiveWarm &&
    provisionalRatio <= MAX_SAFE_ZOOM - ZOOM_EXIT_HYSTERESIS
  ) {
    persistedGuardActiveWarm = false;
    persistedFreezeScaleWarm = 1;
    storedBaseline = captureCurrentBaseline();
    persistBaseline(storedBaseline);
    clearPersistedGuardState();
    baselineDpr = storedBaseline.dpr;
    baselineVvScale = storedBaseline.vvScale;
    baselineInnerWidth = storedBaseline.innerWidth;
  }

  const mainContent = document.querySelector('main.content');
  let freezeActive = persistedGuardActiveWarm;
  let freezeScale = persistedFreezeScaleWarm;

  body.classList.toggle('zoom-threshold-exceeded', freezeActive);
  if (mainContent instanceof HTMLElement) {
    mainContent.style.setProperty('--zoom-freeze-scale', String(freezeScale));
    mainContent.classList.toggle('zoom-freeze-active', freezeActive);
  }

  let lastPersistedActive = freezeActive;
  let lastPersistedFreezeScale = freezeScale;
  let healLockFrames = 0;

  function persistGuardState(
    nextActive: boolean,
    nextFreezeScale: number,
  ): void {
    if (
      nextActive === lastPersistedActive &&
      Math.abs(nextFreezeScale - lastPersistedFreezeScale) <
        FREEZE_SCALE_UPDATE_EPSILON
    ) {
      return;
    }
    lastPersistedActive = nextActive;
    lastPersistedFreezeScale = nextFreezeScale;
    try {
      window.sessionStorage.setItem(
        GUARD_STATE_KEY,
        JSON.stringify({
          active: nextActive,
          freezeScale: nextFreezeScale,
          ts: Date.now(),
        }),
      );
    } catch {
      /* ignore */
    }
  }

  function applyFreezeToDom(nextActive: boolean, nextScale: number): void {
    body.classList.toggle('zoom-threshold-exceeded', nextActive);
    if (mainContent instanceof HTMLElement) {
      mainContent.style.setProperty('--zoom-freeze-scale', String(nextScale));
      mainContent.classList.toggle('zoom-freeze-active', nextActive);
    }
  }

  function resetBaselineFromCurrentViewport(): void {
    const next = captureCurrentBaseline();
    baselineDpr = next.dpr;
    baselineVvScale = next.vvScale;
    baselineInnerWidth = next.innerWidth;
    persistBaseline(next);
    freezeActive = false;
    freezeScale = 1;
    healLockFrames = 0;
    clearPersistedGuardState();
    lastPersistedActive = false;
    lastPersistedFreezeScale = 1;
    applyFreezeToDom(false, 1);
  }

  function getZoomRatio(): number {
    return zoomRatioForBaseline(
      baselineDpr,
      baselineVvScale,
      baselineInnerWidth,
    );
  }

  function updateZoomGuard(): void {
    const liveBaseline: Baseline = {
      dpr: baselineDpr,
      vvScale: baselineVvScale,
      innerWidth: baselineInnerWidth,
    };
    if (shouldResetBaseline(liveBaseline)) {
      resetBaselineFromCurrentViewport();
    }

    const ratio = getZoomRatio();
    const exceeded = shouldKeepFreeze({
      ratio,
      freezeActive,
      healLockFrames,
      maxSafe: MAX_SAFE_ZOOM,
      hysteresis: ZOOM_EXIT_HYSTERESIS,
    });
    const skipRatioDrivenScale = healLockFrames > 0;
    if (exceeded) {
      if (!skipRatioDrivenScale) {
        const targetFreezeScale = computeTargetFreezeScale(
          ratio,
          MAX_SAFE_ZOOM,
        );
        if (
          !freezeActive ||
          Math.abs(targetFreezeScale - freezeScale) >=
            FREEZE_SCALE_UPDATE_EPSILON
        ) {
          freezeScale = Math.round(targetFreezeScale * 1000) / 1000;
        }
      }
    } else {
      freezeScale = 1;
    }
    freezeActive = exceeded;

    let didOverflowHeal = false;
    if (
      !freezeActive &&
      mainContent instanceof HTMLElement &&
      healLockFrames <= 0
    ) {
      const iw = window.innerWidth || 1;
      const docSw = document.documentElement.scrollWidth || iw;
      const heal = computeOverflowHealScale(
        iw,
        docSw,
        ZOOM_GUARD_OVERFLOW_HEAL_THRESHOLD,
      );
      if (heal !== null) {
        freezeActive = true;
        freezeScale = Math.round(heal * 1000) / 1000;
        healLockFrames = 7;
        didOverflowHeal = true;
      }
    }

    if (healLockFrames > 0 && !didOverflowHeal) healLockFrames -= 1;

    persistGuardState(freezeActive, freezeScale);
    applyFreezeToDom(freezeActive, freezeScale);
  }

  function runZoomGuardBurst(): void {
    updateZoomGuard();
    try {
      queueMicrotask(function () {
        updateZoomGuard();
      });
    } catch {
      updateZoomGuard();
    }
    window.requestAnimationFrame(function () {
      updateZoomGuard();
      window.requestAnimationFrame(function () {
        updateZoomGuard();
      });
    });
  }

  const ratioAfterReconcile = zoomRatioForBaseline(
    baselineDpr,
    baselineVvScale,
    baselineInnerWidth,
  );
  const warmStartDelayMs =
    freezeActive && ratioAfterReconcile > MAX_SAFE_ZOOM - ZOOM_EXIT_HYSTERESIS
      ? 180
      : 0;
  let warmStartUntil = Date.now() + warmStartDelayMs;
  if (warmStartDelayMs === 0) {
    updateZoomGuard();
  }

  window.addEventListener('resize', runZoomGuardBurst, { passive: true });
  window.addEventListener('orientationchange', runZoomGuardBurst, {
    passive: true,
  });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', runZoomGuardBurst, {
      passive: true,
    });
    window.visualViewport.addEventListener(
      'scroll',
      function () {
        updateZoomGuard();
      },
      { passive: true },
    );
  }
  window.addEventListener(
    'wheel',
    function (e: WheelEvent) {
      if (e && e.ctrlKey) runZoomGuardBurst();
    },
    { passive: true },
  );

  function loopZoomGuard(): void {
    const ratioNow = getZoomRatio();
    const cancelWarm = shouldCancelWarmStart(
      ratioNow,
      MAX_SAFE_ZOOM,
      ZOOM_GUARD_WARM_CANCEL_RATIO,
    );
    if (Date.now() >= warmStartUntil || cancelWarm) {
      if (cancelWarm) warmStartUntil = 0;
      updateZoomGuard();
    }
    window.requestAnimationFrame(loopZoomGuard);
  }
  window.requestAnimationFrame(loopZoomGuard);
}
