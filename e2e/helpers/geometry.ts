import { expect, type Locator } from '@playwright/test';

export async function mustBox(
  locator: Locator,
): Promise<NonNullable<Awaited<ReturnType<Locator['boundingBox']>>>> {
  const box = await locator.boundingBox();
  expect(box).toBeTruthy();
  return box!;
}

type SquareContainmentInput = {
  squareSelector: string;
  containerSelector?: string;
  tolerancePx?: number;
};

type SquareContainmentResult = {
  ok: boolean;
  squarePresent: boolean;
  containerPresent: boolean;
  squareWidth: number;
  squareHeight: number;
  withinLeft: boolean;
  withinRight: boolean;
  widthMatchesHeight: boolean;
};

export async function readSquareContainment(
  locator: Locator,
  input: SquareContainmentInput,
): Promise<SquareContainmentResult> {
  return locator.evaluate(
    (root, cfg: SquareContainmentInput): SquareContainmentResult => {
      const tol = cfg.tolerancePx ?? 2;
      const square = root.querySelector(cfg.squareSelector);
      const container = root.querySelector(
        cfg.containerSelector ?? 'main.content',
      );
      if (
        !(square instanceof HTMLElement) ||
        !(container instanceof HTMLElement)
      ) {
        return {
          ok: false,
          squarePresent: square instanceof HTMLElement,
          containerPresent: container instanceof HTMLElement,
          squareWidth: 0,
          squareHeight: 0,
          withinLeft: false,
          withinRight: false,
          widthMatchesHeight: false,
        };
      }

      const s = square.getBoundingClientRect();
      const c = container.getBoundingClientRect();
      const squareWidth = s.width;
      const squareHeight = s.height;
      const widthMatchesHeight = Math.abs(squareWidth - squareHeight) <= tol;
      const withinLeft = s.left >= c.left - tol;
      const withinRight = s.right <= c.right + tol;
      return {
        ok: widthMatchesHeight && withinLeft && withinRight,
        squarePresent: true,
        containerPresent: true,
        squareWidth,
        squareHeight,
        withinLeft,
        withinRight,
        widthMatchesHeight,
      };
    },
    input,
  );
}
