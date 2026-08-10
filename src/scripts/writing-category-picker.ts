import {
  WRITING_CATEGORY_PICKER_BOOT_TIMEOUT_MS,
  WRITING_CATEGORY_PICKER_FLASH_MS,
  WRITING_CATEGORY_PICKER_IDLE_MS,
  WRITING_CATEGORY_PICKER_READY_CLASS,
  WRITING_CATEGORY_PICKER_SELECTORS as SELECTORS,
} from '../constants/writing-category-picker';

type PickerState = {
  root: HTMLElement;
  control: HTMLElement;
  shell: HTMLElement;
  track: HTMLElement;
  options: HTMLElement[];
  sections: HTMLElement[];
  idleTimerId: number;
  flashTimerId: number;
  selectedCategory: string;
  bootFinished: boolean;
};

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function measureSlotWidth(root: HTMLElement): number {
  const measure = root.querySelector(SELECTORS.measure);
  if (!(measure instanceof HTMLElement)) return 0;
  const widths = Array.from(measure.children).map((child) => {
    if (!(child instanceof HTMLElement)) return 0;
    return child.getBoundingClientRect().width;
  });
  return Math.ceil(Math.max(0, ...widths));
}

function syncSlotWidth(state: PickerState): void {
  const slotPx = measureSlotWidth(state.root);
  if (slotPx <= 0) return;
  state.root.style.setProperty('--writing-category-slot-width', `${slotPx}px`);
}

function revealWritingGroups(): void {
  const writingGroups = document.querySelector(SELECTORS.groups);
  if (!(writingGroups instanceof HTMLElement)) return;
  if (writingGroups.classList.contains('writing-groups--visible')) return;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      writingGroups.classList.remove('writing-groups--pending');
      writingGroups.classList.add('writing-groups--visible');
      writingGroups.removeAttribute('aria-busy');
    });
  });
}

/**
 * Apply the measured slot with transitions still off, then enable expand
 * motion and fade the list in — avoids the first-load width shrink.
 */
function finishPickerBoot(state: PickerState): void {
  if (state.bootFinished) return;
  state.bootFinished = true;

  syncSlotWidth(state);
  updateTrackOffset(state);
  void state.control.offsetWidth;

  state.root.classList.add(WRITING_CATEGORY_PICKER_READY_CLASS);
  revealWritingGroups();
}

function clearIdleTimer(state: PickerState): void {
  if (state.idleTimerId) {
    window.clearTimeout(state.idleTimerId);
    state.idleTimerId = 0;
  }
}

function clearFlashTimer(state: PickerState): void {
  if (state.flashTimerId) {
    window.clearTimeout(state.flashTimerId);
    state.flashTimerId = 0;
  }
}

function isOpen(state: PickerState): boolean {
  return state.root.classList.contains('writing-category-picker--open');
}

function updateTrackOffset(state: PickerState): void {
  const selectedIndex = state.options.findIndex(
    (option) => option.dataset.category === state.selectedCategory,
  );
  const offsetIndex = isOpen(state) ? 0 : Math.max(0, selectedIndex);
  state.track.style.transform = `translateX(calc(-1 * ${offsetIndex} * var(--writing-category-slot-width)))`;
}

function readIdleMs(root: HTMLElement): number {
  const raw = getComputedStyle(root)
    .getPropertyValue('--writing-category-picker-idle-ms')
    .trim();
  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return WRITING_CATEGORY_PICKER_IDLE_MS;
  }
  return parsed;
}

function setOpen(state: PickerState, open: boolean): void {
  clearIdleTimer(state);
  state.root.classList.toggle('writing-category-picker--open', open);
  state.root.setAttribute('aria-expanded', open ? 'true' : 'false');
  updateTrackOffset(state);

  if (open) {
    state.idleTimerId = window.setTimeout(() => {
      state.idleTimerId = 0;
      setOpen(state, false);
    }, readIdleMs(state.root));
  }
}

function showCategory(state: PickerState, category: string): void {
  state.selectedCategory = category;
  for (const option of state.options) {
    const selected = option.dataset.category === category;
    option.setAttribute('aria-selected', selected ? 'true' : 'false');
    option.classList.toggle('is-selected', selected);
  }
  for (const section of state.sections) {
    section.hidden = section.dataset.writingCategory !== category;
  }
  updateTrackOffset(state);
}

function flashAndSelect(state: PickerState, category: string): void {
  clearIdleTimer(state);
  clearFlashTimer(state);

  const chosen = state.options.find(
    (option) => option.dataset.category === category,
  );
  if (!chosen) return;

  for (const option of state.options) {
    option.classList.remove('is-flashing');
  }
  chosen.classList.add('is-flashing');

  const finish = () => {
    state.flashTimerId = 0;
    chosen.classList.remove('is-flashing');
    showCategory(state, category);
    setOpen(state, false);
  };

  if (prefersReducedMotion()) {
    finish();
    return;
  }

  state.flashTimerId = window.setTimeout(
    finish,
    WRITING_CATEGORY_PICKER_FLASH_MS,
  );
}

function initPickerState(root: HTMLElement): PickerState | null {
  const control = root.querySelector(SELECTORS.control);
  const shell = root.querySelector(SELECTORS.shell);
  const track = root.querySelector(SELECTORS.track);
  if (
    !(control instanceof HTMLElement) ||
    !(shell instanceof HTMLElement) ||
    !(track instanceof HTMLElement)
  ) {
    return null;
  }

  const options = Array.from(root.querySelectorAll(SELECTORS.option)).filter(
    (el): el is HTMLElement => el instanceof HTMLElement,
  );
  const sections = Array.from(
    document.querySelectorAll(SELECTORS.section),
  ).filter((el): el is HTMLElement => el instanceof HTMLElement);

  const selected =
    options.find((option) => option.getAttribute('aria-selected') === 'true')
      ?.dataset.category ??
    options[0]?.dataset.category ??
    '';

  return {
    root,
    control,
    shell,
    track,
    options,
    sections,
    idleTimerId: 0,
    flashTimerId: 0,
    selectedCategory: selected,
    bootFinished: false,
  };
}

export function initWritingCategoryPicker(): void {
  const root = document.querySelector(SELECTORS.root);
  if (!(root instanceof HTMLElement)) {
    revealWritingGroups();
    return;
  }

  const state = initPickerState(root);
  if (!state || state.options.length === 0) {
    revealWritingGroups();
    return;
  }

  syncSlotWidth(state);
  showCategory(state, state.selectedCategory);
  setOpen(state, false);

  const fontsReady = document.fonts?.ready ?? Promise.resolve();
  fontsReady.finally(() => finishPickerBoot(state));
  window.setTimeout(
    () => finishPickerBoot(state),
    WRITING_CATEGORY_PICKER_BOOT_TIMEOUT_MS,
  );

  state.shell.addEventListener('click', (event) => {
    event.stopPropagation();
    const target = event.target;
    if (!(target instanceof Element)) return;

    if (!isOpen(state)) {
      setOpen(state, true);
      return;
    }

    const option = target.closest(SELECTORS.option);
    if (!(option instanceof HTMLElement)) return;
    const category = option.dataset.category;
    if (!category) return;

    if (category === state.selectedCategory) {
      setOpen(state, false);
      return;
    }

    flashAndSelect(state, category);
  });

  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (!state.root.contains(target) && isOpen(state)) {
      setOpen(state, false);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isOpen(state)) {
      setOpen(state, false);
    }
  });

  window.addEventListener('resize', () => {
    syncSlotWidth(state);
    updateTrackOffset(state);
  });
}
