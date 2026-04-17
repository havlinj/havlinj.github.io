import { fitFontSize, roundPx } from '../utils/profile-fit-math';
import {
  contentWidthWithoutHorizontalPadding,
  maxLineWidth,
  queryElement,
  rootRemPx,
} from './profile-fit-dom';
import { LABEL_VAR, SELECTORS } from './profile-tile-type-fit-constants';

export function fitTileLabels(section: HTMLElement): void {
  const foundations = queryElement(
    section,
    SELECTORS.foundationsTile,
    HTMLAnchorElement,
  );
  const whatIDo = queryElement(
    section,
    SELECTORS.whatIDoTile,
    HTMLAnchorElement,
  );
  const why = queryElement(section, SELECTORS.whyTile, HTMLAnchorElement);
  const measureTile = foundations ?? whatIDo ?? why;
  if (!measureTile) return;

  const inner = queryElement(
    measureTile,
    SELECTORS.pageButtonInner,
    HTMLElement,
  );
  const textEl = queryElement(
    measureTile,
    SELECTORS.pageButtonText,
    HTMLElement,
  );
  if (!inner || !textEl) return;

  const rem = rootRemPx();
  const minPx = rem * 0.7;
  const available = contentWidthWithoutHorizontalPadding(inner);
  // Use full inner width as max — tiles should use the column, not cap to page-title optical size.
  const maxPx = Math.max(minPx, available);
  const tcs = getComputedStyle(textEl);
  const lines = Array.from(
    section.querySelectorAll<HTMLElement>(
      `${SELECTORS.whyTile} ${SELECTORS.pageButtonText}, ${SELECTORS.whatIDoTile} ${SELECTORS.pageButtonText}, ${SELECTORS.foundationsTile} ${SELECTORS.pageButtonText}`,
    ),
  )
    .map((el) => el.textContent?.trim() ?? '')
    .filter((text) => text.length > 0);
  if (lines.length === 0) return;
  const fontPx = fitFontSize(available, minPx, maxPx, (fp) =>
    maxLineWidth(lines, fp, tcs),
  );
  section.style.setProperty(LABEL_VAR, `${roundPx(fontPx)}px`);
}
