import {
  ZOOM_GUARD_MAX_SAFE_ZOOM,
  ZOOM_GUARD_EXIT_HYSTERESIS,
  ZOOM_GUARD_OVERFLOW_HEAL_THRESHOLD,
  ZOOM_GUARD_WARM_CANCEL_RATIO,
  computeOverflowHealScale,
  computeTargetFreezeScale,
  computeZoomRatio,
  isAbsurdStoredBaselineInnerWidth,
  shouldCancelWarmStart,
  shouldKeepFreeze,
} from '../utils/zoom-guard-math';

const MAX_SAFE_ZOOM = ZOOM_GUARD_MAX_SAFE_ZOOM;
const ZOOM_EXIT_HYSTERESIS = ZOOM_GUARD_EXIT_HYSTERESIS;
const FREEZE_SCALE_UPDATE_EPSILON = 0.01;

const BASELINE_KEY = 'zoomFreezeBaselineV2';
const GUARD_STATE_KEY = 'zoomFreezeGuardStateV2';
const DPR_BASELINE_MISMATCH_RATIO = 1.12;
const DESKTOP_BASELINE_INNER_WIDTH_MIN = 640;

let installed = false;

export function initZoomGuard(): void {
  if (installed) return;
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const body = document.body;
  if (!body) return;

  const hasComposition =
    !!document.querySelector('.hero') ||
    !!document.querySelector('.profile-section') ||
    !!document.querySelector('.writing-page .page-buttons-panel') ||
    !!document.querySelector('.contact-page .page-buttons-panel');
  if (!hasComposition) return;

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

  type Baseline = { dpr: number; vvScale: number; innerWidth: number };
  let storedBaseline: Baseline | null = null;
  if (storedBaselineRaw) {
    try {
      storedBaseline = JSON.parse(storedBaselineRaw) as Baseline;
    } catch {
      storedBaseline = null;
    }
  }

  let persistedGuardActiveWarm = false;
  let persistedFreezeScaleWarm = 1;
  try {
    const raw = window.sessionStorage.getItem(GUARD_STATE_KEY) ?? null;
    if (raw) {
      const parsed = JSON.parse(raw) as {
        active?: boolean;
        freezeScale?: number;
      };
      if (typeof parsed.active === 'boolean') {
        persistedGuardActiveWarm = parsed.active;
      }
      if (Number.isFinite(parsed.freezeScale)) {
        persistedFreezeScaleWarm = parsed.freezeScale as number;
      }
    }
  } catch {
    /* ignore */
  }

  const shouldSkipBaselineResetWarm = persistedGuardActiveWarm === true;

  function hasValidBaseline(baseline: Baseline | null): baseline is Baseline {
    return (
      !!baseline &&
      Number.isFinite(baseline.dpr) &&
      baseline.dpr > 0 &&
      Number.isFinite(baseline.vvScale) &&
      baseline.vvScale > 0 &&
      Number.isFinite(baseline.innerWidth) &&
      baseline.innerWidth > 0
    );
  }

  function currentVisualViewportScale(): number {
    const vv = window.visualViewport;
    return vv && vv.scale ? vv.scale : 0;
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

  function shouldResetBaseline(baseline: Baseline): boolean {
    if (!hasValidBaseline(baseline)) return true;

    const innerWidthNow = window.innerWidth || 0;
    const dprNow = window.devicePixelRatio || 1;
    const vvNow =
      window.visualViewport && window.visualViewport.scale
        ? window.visualViewport.scale
        : 1;

    const dprBaselineMismatch =
      Math.max(dprNow, baseline.dpr) / Math.min(dprNow, baseline.dpr) >
      DPR_BASELINE_MISMATCH_RATIO;

    const scaleDropped =
      dprNow < baseline.dpr * 0.9 || vvNow < baseline.vvScale * 0.9;

    const widthExpanded = innerWidthNow > baseline.innerWidth * 1.15;

    const likelyNarrowViewportZoomContext = innerWidthNow <= 520;
    const narrowButBaselineLooksDesktop =
      likelyNarrowViewportZoomContext &&
      baseline.innerWidth >= DESKTOP_BASELINE_INNER_WIDTH_MIN &&
      baseline.innerWidth > innerWidthNow * 1.25;

    const absurdStoredInnerWidth = isAbsurdStoredBaselineInnerWidth(
      baseline.innerWidth,
      innerWidthNow,
    );

    return (
      dprBaselineMismatch ||
      scaleDropped ||
      widthExpanded ||
      narrowButBaselineLooksDesktop ||
      absurdStoredInnerWidth
    );
  }

  if (
    !hasValidBaseline(storedBaseline) ||
    (!shouldSkipBaselineResetWarm && shouldResetBaseline(storedBaseline))
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
    storedBaseline = {
      dpr: currentDpr,
      vvScale: currentVvScale,
      innerWidth: currentInnerWidth,
    };
    persistBaseline(storedBaseline);
    try {
      window.sessionStorage.removeItem(GUARD_STATE_KEY);
    } catch {
      /* ignore */
    }
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

  function getZoomRatio(): number {
    return zoomRatioForBaseline(
      baselineDpr,
      baselineVvScale,
      baselineInnerWidth,
    );
  }

  function updateZoomGuard(): void {
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
    body.classList.toggle('zoom-threshold-exceeded', freezeActive);
    if (mainContent instanceof HTMLElement) {
      mainContent.style.setProperty('--zoom-freeze-scale', String(freezeScale));
      mainContent.classList.toggle('zoom-freeze-active', freezeActive);
    }
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
