export function fontPxToMatchBandWidth(
  currentFontPx: number,
  currentBandWidth: number,
  targetBandWidth: number,
  paddingInlineSum: number,
): number {
  const currentContent = currentBandWidth - paddingInlineSum;
  const targetContent = targetBandWidth - paddingInlineSum;
  if (currentFontPx <= 0 || currentContent <= 0 || targetContent <= 0) {
    return currentFontPx;
  }
  return currentFontPx * (targetContent / currentContent);
}
