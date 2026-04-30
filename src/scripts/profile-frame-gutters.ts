import { queryElement, setPxCustomProperty } from './profile-fit-dom';
import { SELECTORS } from './profile-tile-type-fit-constants';

/** Set from measured “What I do” tile media insets; Why / Foundations / portrait reuse these px. */
export const PROFILE_FRAME_GUTTER_BLOCK_PX = '--profile-frame-gutter-block-px';
export const PROFILE_FRAME_GUTTER_SIDE_PX = '--profile-frame-gutter-side-px';

/**
 * Resolve authored % gutters on the What I do tile, read used px from layout, then publish
 * the same lengths for all other profile media frames (no % on those surfaces).
 */
export function syncProfileFrameGuttersFromWhatTile(section: HTMLElement): void {
  const what = queryElement(section, SELECTORS.whatIDoTile, HTMLElement);
  const surface = what?.querySelector<HTMLElement>('.profile-media-surface');
  if (!what || !surface) return;

  const cs = getComputedStyle(surface);
  const top = parseFloat(cs.top);
  const bottom = parseFloat(cs.bottom);
  const right = parseFloat(cs.right);

  const block =
    Number.isFinite(top) && Number.isFinite(bottom)
      ? (top + bottom) / 2
      : Number.isFinite(bottom)
        ? bottom
        : top;
  const side = Number.isFinite(right) ? right : 0;

  if (!Number.isFinite(block) || block <= 0) return;

  setPxCustomProperty(section, PROFILE_FRAME_GUTTER_BLOCK_PX, block);
  setPxCustomProperty(section, PROFILE_FRAME_GUTTER_SIDE_PX, side);
}
