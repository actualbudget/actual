import type { Locator, Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { ConfigurationPage } from './page-models/configuration-page';
import { MobileAccountPage } from './page-models/mobile-account-page';
import { MobileBudgetPage } from './page-models/mobile-budget-page';
import { MobileNavigation } from './page-models/mobile-navigation';

declare global {
  // oxlint-disable-next-line typescript/consistent-type-definitions
  interface Window {
    __scrollOffsetWhenLeaving?: number;
  }
}

function scrollOffset(scrollContainer: Locator) {
  return scrollContainer.evaluate(element => element.scrollTop);
}

// Records the scroll container's offset up to the moment it unmounts: the
// position the user expects to come back to. (Tapping a row can still nudge
// the list as the row takes focus.)
async function recordScrollOffsetUntilLeaving(scrollContainer: Locator) {
  await scrollContainer.evaluate(element => {
    window.__scrollOffsetWhenLeaving = element.scrollTop;
    element.addEventListener('scroll', () => {
      window.__scrollOffsetWhenLeaving = element.scrollTop;
    });
  });
  return async () => {
    const offset = await scrollContainer
      .page()
      .evaluate(() => window.__scrollOffsetWhenLeaving);
    if (offset == null) {
      throw new Error('Scroll offset was not recorded');
    }
    return offset;
  };
}

// Scroll with the pointer over the middle of the page content, below the
// header and above the bottom navigation.
async function scrollDown(page: Page, pixels: number) {
  await page.mouse.move(175, 400);
  await page.mouse.wheel(0, pixels);
}

// The first of `locators` that is in the middle of the screen.
async function firstOnScreen(locators: Locator) {
  const count = await locators.count();
  for (let i = 0; i < count; i++) {
    const box = await locators.nth(i).boundingBox();
    if (box && box.y > 250 && box.y < 450) {
      return locators.nth(i);
    }
  }
  throw new Error('Nothing is in the middle of the screen');
}

test.describe('Mobile scroll restoration', () => {
  let page: Page;
  let navigation: MobileNavigation;
  let configurationPage: ConfigurationPage;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    navigation = new MobileNavigation(page);
    configurationPage = new ConfigurationPage(page);

    await page.setViewportSize({ width: 350, height: 600 });
    await page.goto('/');
    await configurationPage.createTestFile();
  });

  test.afterEach(async () => {
    await page?.close();
  });

  test("budget page keeps its scroll position after viewing a category's spending", async () => {
    const budgetPage = await navigation.goToBudgetPage();
    await budgetPage.waitFor();
    // The pull-to-refresh container around the budget table scrolls it.
    const scrollContainer = page
      .locator('.ptr__children')
      .filter({ has: budgetPage.budgetTable });

    await scrollDown(page, 400);
    await expect.poll(() => scrollOffset(scrollContainer)).toBeGreaterThan(200);
    const getOffsetWhenLeaving =
      await recordScrollOffsetUntilLeaving(scrollContainer);

    const spentButton = await firstOnScreen(
      budgetPage.budgetTable.getByRole('button', {
        name: /^Show transactions for .* category$/,
      }),
    );
    await spentButton.click();
    await expect(page).toHaveURL(/\/categories\//);
    const offsetWhenLeaving = await getOffsetWhenLeaving();
    expect(offsetWhenLeaving).toBeGreaterThan(200);

    await page.getByRole('button', { name: 'Back' }).click();
    await new MobileBudgetPage(page).waitFor();

    await expect
      .poll(() => scrollOffset(scrollContainer))
      .toBe(offsetWhenLeaving);
  });

  test('transaction search results keep their scroll position after viewing a transaction', async () => {
    const accountsPage = await navigation.goToAccountsPage();
    await accountsPage.waitFor();
    const accountPage = await accountsPage.openNthAccount(0);
    await accountPage.waitFor();

    await accountPage.searchByText(SEARCH_TERM);
    await expect(accountPage.transactions.first()).toBeVisible();

    await scrollDown(page, 600);
    await expect
      .poll(() => scrollOffset(accountPage.transactionList))
      .toBeGreaterThan(300);
    const getOffsetWhenLeaving = await recordScrollOffsetUntilLeaving(
      accountPage.transactionList,
    );

    await (await firstOnScreen(accountPage.transactions)).click();
    await expect(page).toHaveURL(/\/transactions\//);
    const offsetWhenLeaving = await getOffsetWhenLeaving();
    expect(offsetWhenLeaving).toBeGreaterThan(300);

    await page.getByRole('button', { name: 'Back' }).click();
    const restoredAccountPage = new MobileAccountPage(page);
    await restoredAccountPage.waitFor();
    await expect(restoredAccountPage.searchBox).toHaveValue(SEARCH_TERM);

    await expect
      .poll(() => scrollOffset(restoredAccountPage.transactionList))
      .toBe(offsetWhenLeaving);
  });
});

const SEARCH_TERM = 'Kroger';
