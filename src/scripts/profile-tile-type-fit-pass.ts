import { queryElement } from './profile-fit-dom';
import { SELECTORS } from './profile-tile-type-fit-constants';
import { measurePortraitGeometryPx } from './profile-tile-type-fit-portrait';
import { fitFoundationsReveal } from './profile-tile-type-fit-reveal-fit';
import { fitTileLabels } from './profile-tile-type-fit-tiles';

export function fitAll(): void {
  const section = queryElement(document, SELECTORS.profileSection, HTMLElement);
  if (section) fitTileLabels(section);
  const reveal = queryElement(
    document,
    SELECTORS.foundationsReveal,
    HTMLElement,
  );
  if (reveal) fitFoundationsReveal(reveal);
  measurePortraitGeometryPx();
}
