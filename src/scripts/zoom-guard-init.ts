import {
  ZOOM_GUARD_MAX_SAFE_ZOOM,
  ZOOM_GUARD_EXIT_HYSTERESIS,
  ZOOM_GUARD_OVERFLOW_HEAL_THRESHOLD,
  ZOOM_GUARD_WARM_CANCEL_RATIO,
  ZOOM_GUARD_FREEZE_ENTER_RATIO,
  ZOOM_FREEZE_VEIL_CLASS,
  ZOOM_FREEZE_PENDING_CLASS,
  computeOverflowHealScale,
  computeTargetFreezeScale,
  shouldApplyOverflowHeal,
  shouldArmFreezeVeil,
  shouldShowFreezeVeil,
  shouldCancelWarmStart,
  shouldKeepFreeze,
} from '../utils/zoom-guard-math';
import {
  ZOOM_SIGNAL_STABLE_MAX,
  computeEffectiveZoomRatio,
  readZoomViewportSnapshot,
  shouldResetZoomFreezeBaseline,
  type ZoomViewportSnapshot,
} from '../utils/zoom-signals';
import {
  ZOOM_FREEZE_BASELINE_STORAGE_KEY,
  ZOOM_FREEZE_GUARD_STATE_STORAGE_KEY,
  type ZoomFreezeBaselineV3,
  hasValidZoomFreezeBaseline,
  parseZoomFreezeBaselineJson,
  parseZoomGuardStateJson,
} from '../utils/zoom-guard-storage';

const MAX_SAFE_ZOOM = ZOOM_GUARD_MAX_SAFE_ZOOM;
const ZOOM_EXIT_HYSTERESIS = ZOOM_GUARD_EXIT_HYSTERESIS;
const FREEZE_SCALE_UPDATE_EPSILON = 0.01;

const BASELINE_KEY = ZOOM_FREEZE_BASELINE_STORAGE_KEY;
const GUARD_STATE_KEY = ZOOM_FREEZE_GUARD_STATE_STORAGE_KEY;

let installed = false;

export function initZoomGuard(): void {
  if (installed) return;
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const body = document.body;
  if (!body) return;

  installed = true;

  type Baseline = ZoomFreezeBaselineV3;

  function readSnapshot(): ZoomViewportSnapshot {
    return readZoomViewportSnapshot(window);
  }

  let storedBaselineRaw: string | null = null;
  try {
    storedBaselineRaw = window.sessionStorage.getItem(BASELINE_KEY);
  } catch {
    storedBaselineRaw = null;
  }

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

  function persistBaseline(baseline: Baseline): void {
    try {
      window.sessionStorage.setItem(BASELINE_KEY, JSON.stringify(baseline));
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

  const opening = readSnapshot();
  if (
    !hasValidZoomFreezeBaseline(storedBaseline) ||
    shouldResetZoomFreezeBaseline(storedBaseline, opening)
  ) {
    storedBaseline = opening;
    persistBaseline(storedBaseline);
  }

  let baseline: Baseline = storedBaseline;

  const provisionalRatio = computeEffectiveZoomRatio(baseline, opening);
  if (
    persistedGuardActiveWarm &&
    provisionalRatio <= MAX_SAFE_ZOOM - ZOOM_EXIT_HYSTERESIS
  ) {
    persistedGuardActiveWarm = false;
    persistedFreezeScaleWarm = 1;
    baseline = opening;
    persistBaseline(baseline);
    clearPersistedGuardState();
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

  let freezeRevealGeneration = 0;
  let freezeSettling = false;
  let lastPublishedRatio = 1;

  function setFreezeVeil(on: boolean): void {
    body.classList.toggle(ZOOM_FREEZE_VEIL_CLASS, on);
  }

  function syncFreezeVeil(): void {
    setFreezeVeil(shouldShowFreezeVeil({ freezeSettling }));
  }

  function hideMainUntilFreezeSettles(): void {
    freezeSettling = true;
    setFreezeVeil(true);
    if (mainContent instanceof HTMLElement) {
      mainContent.classList.add(ZOOM_FREEZE_PENDING_CLASS);
    }
  }

  function clearFreezePending(): void {
    freezeRevealGeneration += 1;
    freezeSettling = false;
    if (mainContent instanceof HTMLElement) {
      mainContent.classList.remove(ZOOM_FREEZE_PENDING_CLASS);
    }
  }

  function revealMainAfterFreezeSettles(): void {
    const generation = freezeRevealGeneration;
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        if (generation !== freezeRevealGeneration) return;
        freezeSettling = false;
        setFreezeVeil(false);
        if (mainContent instanceof HTMLElement) {
          mainContent.classList.remove(ZOOM_FREEZE_PENDING_CLASS);
        }
      });
    });
  }

  function armVeilIfApproachingWall(): void {
    if (
      shouldArmFreezeVeil({
        freezeActive,
        freezeSettling,
        lastPublishedRatio,
        currentRatio: getZoomRatio(),
      })
    ) {
      setFreezeVeil(true);
    }
  }

  function resetBaselineFromCurrentViewport(): void {
    baseline = readSnapshot();
    persistBaseline(baseline);
    freezeActive = false;
    freezeScale = 1;
    healLockFrames = 0;
    clearPersistedGuardState();
    lastPersistedActive = false;
    lastPersistedFreezeScale = 1;
    applyFreezeToDom(false, 1);
    lastPublishedRatio = 1;
    clearFreezePending();
    syncFreezeVeil();
  }

  function getZoomRatio(): number {
    return computeEffectiveZoomRatio(baseline, readSnapshot());
  }

  function updateZoomGuard(): void {
    const current = readSnapshot();
    if (shouldResetZoomFreezeBaseline(baseline, current)) {
      resetBaselineFromCurrentViewport();
    }

    const wasFrozen = freezeActive;
    const ratio = getZoomRatio();
    if (!wasFrozen && ratio > ZOOM_GUARD_FREEZE_ENTER_RATIO) {
      setFreezeVeil(true);
    }

    const exceeded = shouldKeepFreeze({
      ratio,
      freezeActive,
      healLockFrames,
      maxSafe: MAX_SAFE_ZOOM,
      hysteresis: ZOOM_EXIT_HYSTERESIS,
    });
    if (exceeded) {
      const targetFreezeScale = computeTargetFreezeScale(ratio, MAX_SAFE_ZOOM);
      if (
        !freezeActive ||
        Math.abs(targetFreezeScale - freezeScale) >= FREEZE_SCALE_UPDATE_EPSILON
      ) {
        freezeScale = Math.round(targetFreezeScale * 1000) / 1000;
      }
    } else {
      freezeScale = 1;
    }
    freezeActive = exceeded;

    let didOverflowHeal = false;
    if (
      shouldApplyOverflowHeal({
        freezeActive,
        zoomRatio: ratio,
        stableMax: ZOOM_SIGNAL_STABLE_MAX,
      }) &&
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

    if (!wasFrozen && freezeActive) {
      hideMainUntilFreezeSettles();
    }

    persistGuardState(freezeActive, freezeScale);
    applyFreezeToDom(freezeActive, freezeScale);
    lastPublishedRatio = ratio;

    if (!wasFrozen && freezeActive) {
      revealMainAfterFreezeSettles();
    } else if (!freezeActive) {
      clearFreezePending();
    }
    syncFreezeVeil();
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

  const ratioAfterReconcile = computeEffectiveZoomRatio(
    baseline,
    readSnapshot(),
  );
  const warmStartDelayMs =
    freezeActive && ratioAfterReconcile > MAX_SAFE_ZOOM - ZOOM_EXIT_HYSTERESIS
      ? 180
      : 0;
  let warmStartUntil = Date.now() + warmStartDelayMs;
  if (warmStartDelayMs === 0) {
    updateZoomGuard();
  }

  window.addEventListener(
    'resize',
    function () {
      armVeilIfApproachingWall();
      runZoomGuardBurst();
    },
    { passive: true, capture: true },
  );
  window.addEventListener('orientationchange', runZoomGuardBurst, {
    passive: true,
  });
  if (window.visualViewport) {
    window.visualViewport.addEventListener(
      'resize',
      function () {
        armVeilIfApproachingWall();
        runZoomGuardBurst();
      },
      { passive: true, capture: true },
    );
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
      if (e && (e.ctrlKey || e.metaKey)) {
        armVeilIfApproachingWall();
        runZoomGuardBurst();
      }
    },
    { passive: true, capture: true },
  );
  window.addEventListener(
    'keydown',
    function (e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key !== '+' && e.key !== '=' && e.key !== '-' && e.key !== '0') {
        return;
      }
      armVeilIfApproachingWall();
    },
    { capture: true },
  );

  function loopZoomGuard(): void {
    const ratioNow = getZoomRatio();
    if (!freezeActive && ratioNow > ZOOM_GUARD_FREEZE_ENTER_RATIO) {
      setFreezeVeil(true);
    }
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
