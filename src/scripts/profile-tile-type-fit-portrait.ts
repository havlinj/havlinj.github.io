import {
  baseWidthFromEffectiveScale,
  normalizePositiveScale,
} from '../utils/profile-fit-math';
import { queryElement, setPxCustomProperty } from './profile-fit-dom';
import {
  PROFILE_PORTRAIT_SIDE_VAR,
  PROFILE_RIGHT_HEIGHT_VAR,
  SELECTORS,
} from './profile-tile-type-fit-constants';

export function measurePortraitGeometryPx(): void {
  const rightColumn = queryElement(
    document,
    SELECTORS.profileRightColumn,
    HTMLElement,
  );
  if (!rightColumn) return;

  // A = height of the right column (big square / whole right region)
  const rcHeight = rightColumn.getBoundingClientRect().height;
  if (!Number.isFinite(rcHeight) || rcHeight < 4) return;

  const shell = queryElement(
    rightColumn,
    SELECTORS.profilePhotoShell,
    HTMLElement,
  );
  if (!shell) return;

  // Portrait width is the "c" we need for h_max = A - c.
  // Keep this as BASE width (before visual scale in state2), otherwise c gets scaled twice.
  const cs = getComputedStyle(rightColumn);
  const rawScale = cs.getPropertyValue('--portrait-effective-scale').trim();
  const effectiveScale = normalizePositiveScale(rawScale);
  const w = baseWidthFromEffectiveScale(
    shell.getBoundingClientRect().width,
    effectiveScale,
  );
  if (!Number.isFinite(w) || w < 4) return; // keep waiting for layout

  setPxCustomProperty(rightColumn, PROFILE_RIGHT_HEIGHT_VAR, rcHeight);
  setPxCustomProperty(rightColumn, PROFILE_PORTRAIT_SIDE_VAR, w);
}
