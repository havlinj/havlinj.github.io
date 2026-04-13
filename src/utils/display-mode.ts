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
