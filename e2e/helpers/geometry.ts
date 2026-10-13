import { expect, type Locator, type Page } from '@playwright/test';

export async function mustBox(
  locator: Locator,
): Promise<NonNullable<Awaited<ReturnType<Locator['boundingBox']>>>> {
  const box = await locator.boundingBox();
  expect(box).toBeTruthy();
  return box!;
}

export type ContentPanelContainmentInput = {
  contentPanelSelector: string;
  containerSelector?: string;
  tolerancePx?: number;
};

export type ContentPanelContainmentResult = {
  ok: boolean;
  contentPanelPresent: boolean;
  containerPresent: boolean;
  contentPanelWidth: number;
  contentPanelHeight: number;
  withinLeft: boolean;
  withinRight: boolean;
  widthMatchesHeight: boolean;
};

export async function readContentPanelContainment(
  locator: Locator,
  input: ContentPanelContainmentInput,
): Promise<ContentPanelContainmentResult> {
  return locator.evaluate(
    (
      root,
      cfg: ContentPanelContainmentInput,
    ): ContentPanelContainmentResult => {
      const tol = cfg.tolerancePx ?? 2;
      const contentPanel = root.querySelector(cfg.contentPanelSelector);
      const container = root.querySelector(
        cfg.containerSelector ?? 'main.content',
      );
      if (
        !(contentPanel instanceof HTMLElement) ||
        !(container instanceof HTMLElement)
      ) {
        return {
          ok: false,
          contentPanelPresent: contentPanel instanceof HTMLElement,
          containerPresent: container instanceof HTMLElement,
          contentPanelWidth: 0,
          contentPanelHeight: 0,
          withinLeft: false,
          withinRight: false,
          widthMatchesHeight: false,
        };
      }

      const panelRect = contentPanel.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const contentPanelWidth = panelRect.width;
      const contentPanelHeight = panelRect.height;
      const widthMatchesHeight =
        Math.abs(contentPanelWidth - contentPanelHeight) <= tol;
      const withinLeft = panelRect.left >= containerRect.left - tol;
      const withinRight = panelRect.right <= containerRect.right + tol;
      return {
        ok: widthMatchesHeight && withinLeft && withinRight,
        contentPanelPresent: true,
        containerPresent: true,
        contentPanelWidth,
        contentPanelHeight,
        withinLeft,
        withinRight,
        widthMatchesHeight,
      };
    },
    input,
  );
}

export type CreditsFloorSnapshot = {
  floorHeight: number;
  queryWidth: number;
  footerPastFloor: number;
  floorBelowWords: number;
  titleGap: number;
};

export async function readCreditsFloor(
  page: Page,
): Promise<CreditsFloorSnapshot | null> {
  return page.evaluate(() => {
    const floor = document.querySelector('.credits-page__floor');
    const footer = document.querySelector('.site-footer');
    const main = document.querySelector('main.content');
    const title = document.querySelector('h1.page-title');
    if (
      !(floor instanceof HTMLElement) ||
      !(footer instanceof HTMLElement) ||
      !(main instanceof HTMLElement) ||
      !(title instanceof HTMLElement)
    ) {
      return null;
    }
    const floorBox = floor.getBoundingClientRect();
    const footerBox = footer.getBoundingClientRect();
    const titleBox = title.getBoundingClientRect();
    const mainStyle = getComputedStyle(main);
    const queryWidth =
      main.clientWidth -
      Number.parseFloat(mainStyle.paddingLeft) -
      Number.parseFloat(mainStyle.paddingRight);
    const rootFont = Number.parseFloat(
      getComputedStyle(document.documentElement).fontSize,
    );
    const lineHeight = Number.parseFloat(getComputedStyle(title).lineHeight);
    return {
      floorHeight: floorBox.height,
      queryWidth,
      footerPastFloor: footerBox.top - floorBox.bottom,
      floorBelowWords: floorBox.top - titleBox.top - lineHeight,
      titleGap: 1.35 * rootFont,
    };
  });
}
