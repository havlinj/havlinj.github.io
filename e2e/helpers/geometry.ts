import { expect, type Locator } from '@playwright/test';

export async function mustBox(
  locator: Locator,
): Promise<NonNullable<Awaited<ReturnType<Locator['boundingBox']>>>> {
  const box = await locator.boundingBox();
  expect(box).toBeTruthy();
  return box!;
}
