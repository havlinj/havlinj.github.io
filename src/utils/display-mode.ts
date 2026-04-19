/** `localStorage` keys — keep identical strings in `Layout.astro` + `settings.astro` inline scripts. */
export const DISPLAY_MODE_STORAGE_KEY = 'display-mode';
export const DISPLAY_MODE_PROMPT_SEEN_STORAGE_KEY = 'display-mode-prompt-seen';

export type DisplayEnvironmentSignals = {
  isStandardRange: boolean;
  isSrgb: boolean;
  isWideGamut: boolean;
  devicePixelRatio: number;
  colorDepth: number;
  maxScreenDimension: number;
};

/**
 * Conservative heuristic: only mark as likely-legacy when all signals align.
 * Keep in sync with `likelyLegacyDisplayEnvironment` in `Layout.astro` (head),
 * exposed as `window.__jhLikelyLegacyDisplay` for inline scripts (Settings, body).
 * `clearDisplayModeClasses` is `window.__jhClearDisplayModeClasses` from the same head script.
 */
export function isLikelyLegacyDisplayEnvironment(
  signals: DisplayEnvironmentSignals,
): boolean {
  const lowDpi = signals.devicePixelRatio <= 1.05;
  const lowColorDepth = signals.colorDepth <= 24;
  const isClassicDesktopPanel =
    signals.maxScreenDimension > 0 && signals.maxScreenDimension <= 1920;

  return (
    signals.isStandardRange &&
    signals.isSrgb &&
    !signals.isWideGamut &&
    lowDpi &&
    lowColorDepth &&
    isClassicDesktopPanel
  );
}
