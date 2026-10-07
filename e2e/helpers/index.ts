export {
  awaitWhyLayoutReady,
  expectNavLinkActive,
  gotoProfileWhenReady,
  gotoWhyWhenReady,
  pathnameIsProfile,
} from './navigation';
export { expectFoundationsRevealCopyPainted } from './profile-foundations-reveal';
export {
  expectProfileFrameGuttersSynced,
  readProfileFrameGutterSnapshot,
} from './profile-frame-gutters';
export { countRevealRasterSignature } from './foundations-reveal-raster';
export { waitTwoFrames } from './raf';
export {
  mustBox,
  readContentPanelContainment,
  type ContentPanelContainmentInput,
  type ContentPanelContainmentResult,
} from './geometry';
export { applyExtremeZoom } from './zoom';
export {
  CONTENT_PANEL_CASES,
  applyDocZoom,
  assertContentPanelLayout,
  readZoomGuardSnapshot,
  resetDocZoom,
  simulateDevicePixelRatioOnly,
  simulatePageZoom,
  waitContactFitVisible,
  waitWritingGroupsVisible,
  type ContentPanelCase,
} from './zoom-guard';
export {
  CONTACT_API_ERROR_RESETS_TURNSTILE,
  CONTACT_ERROR_CODES,
  CONTACT_ERROR_MESSAGES,
  expectContactFormShowsApiError,
  fillContactFormWithValidData,
  gotoContactForm,
  installTurnstileResetCounter,
  mockContactApiError,
  readTurnstileResetCount,
  submitContactForm,
} from './contact';
export { expectDichromTierMatchesPaint } from './responsive-panel-bg-matrix';
export { hasAstroStylesheetBundle, readStylesheetHrefs } from './stylesheets';
export {
  expectWritingCategoryPickerClosed,
  installWritingCategoryPickerWidthProbe,
  openWritingCategoryPicker,
  readWritingCategoryPickerLayout,
  readWritingCategoryPickerWidthLog,
  selectWritingCategory,
  setWritingCategoryPickerIdleMs,
  waitForWritingCategoryPickerExpanded,
  waitForWritingCategoryPickerSlotReady,
  type WritingCategoryPickerLayout,
  type WritingCategoryPickerWidthSample,
} from './writing-category';
export {
  expectProfileLayoutStable,
  expectSharedPageRevealTransition,
  gotoMainPageRevealReady,
  normalizeOpacityTransition,
  PAGE_REVEAL_OPACITY_TRANSITION,
  PAGE_REVEAL_SELECTORS,
  readOpacityTransition,
  readProfileLayoutSnapshot,
  waitForOpacityRevealComplete,
} from './page-reveal';
export {
  holdProfilePortrait,
  waitForProfileTileLabelFit,
} from './profile-portrait-gate';
