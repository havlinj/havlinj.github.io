/** Same idle window as Foundations reveal on Profile (`DEFAULT_REVEAL_TIMEOUT_MS`). */
export const WRITING_CATEGORY_PICKER_IDLE_MS = 7000;

/** Invert flash when an option is chosen — matches page-button transition feel. */
export const WRITING_CATEGORY_PICKER_FLASH_MS = 220;

/** Fallback if `document.fonts.ready` never settles — matches prior inline reveal. */
export const WRITING_CATEGORY_PICKER_BOOT_TIMEOUT_MS = 2500;

/** Enables expand/collapse transitions only after the first measured slot is applied. */
export const WRITING_CATEGORY_PICKER_READY_CLASS =
  'writing-category-picker--ready';

export const WRITING_CATEGORY_PICKER_SELECTORS = {
  root: '.writing-page .writing-category-picker',
  control: '.writing-page .writing-category-picker__control',
  shell: '.writing-page .writing-category-picker__shell',
  track: '.writing-page .writing-category-picker__track',
  option: '.writing-page .writing-category-picker__option',
  section: '.writing-page .writing-section[data-writing-category]',
  measure: '.writing-page .writing-category-picker__measure',
  groups: '.writing-page .writing-groups',
} as const;
