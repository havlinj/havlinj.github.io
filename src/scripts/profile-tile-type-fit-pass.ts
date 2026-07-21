import { syncProfileFrameGuttersFromWhatTile } from './profile-frame-gutters';
import { queryElement } from './profile-fit-dom';
import { SELECTORS } from './profile-tile-type-fit-constants';
import { fitFoundationsReveal } from './profile-tile-type-fit-reveal-fit';
import { fitTileLabels } from './profile-tile-type-fit-tiles';

export type FitAllOptions = {
  /** When false, skip Foundations reveal stanza fit (hidden until open). Default true. */
  includeReveal?: boolean;
};

export function fitAll(options: FitAllOptions = {}): void {
  const includeReveal = options.includeReveal !== false;
  const section = queryElement(document, SELECTORS.profileSection, HTMLElement);
  if (section) {
    syncProfileFrameGuttersFromWhatTile(section);
    fitTileLabels(section);
  }
  if (!includeReveal) return;
  const reveal = queryElement(
    document,
    SELECTORS.foundationsReveal,
    HTMLElement,
  );
  if (reveal) fitFoundationsReveal(reveal);
}
