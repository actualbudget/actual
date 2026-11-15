import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { ConfigurationPage } from './page-models/configuration-page';
import type { MobileBudgetPage } from './page-models/mobile-budget-page';
import { MobileNavigation } from './page-models/mobile-navigation';

test.describe('Mobile simplified navbar', () => {
  let page: Page;
  let navigation: MobileNavigation;
  let budgetPage: MobileBudgetPage;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    navigation = new MobileNavigation(page);

    await page.setViewportSize({
      width: 350,
      height: 600,
    });
    await page.goto('/');
    await new ConfigurationPage(page).createTestFile();

    const settingsPage = await navigation.goToSettingsPage();
    await settingsPage.enableExperimentalFeature(
      'Simplified mobile navigation bar',
    );
    await expect(navigation.navbar).toHaveAttribute(
      'data-navbar-state',
      'fixed',
    );
    budgetPage = await navigation.goToBudgetPage();
  });

  test.afterEach(async () => {
    await page?.close();
  });

  test('shows five icon-only tabs that navigate between pages', async () => {
    const links = navigation.navbar.getByRole('link');
    await expect(links).toHaveCount(5);
    for (const name of [
      'Budget',
      'Accounts',
      'Transaction',
      'Schedules',
      'Reports',
    ]) {
      await expect(links.getByText(name)).toHaveCount(0);
      await expect(navigation.navbar.getByRole('link', { name })).toBeVisible();
    }

    await navigation.goToAccountsPage();
    await expect(page).toHaveURL(/\/accounts$/);

    await navigation.goToSchedulesPage();
    await expect(page).toHaveURL(/\/schedules$/);

    await navigation.goToReportsPage();
    await expect(page).toHaveURL(/\/reports/);

    await navigation.goToBudgetPage();
    await expect(page).toHaveURL(/\/budget$/);
  });

  test('opens settings from the gear button in the page header', async () => {
    await navigation.goToAccountsPage();
    await navigation.settingsHeaderButton.click();

    await expect(page).toHaveURL(/\/settings$/);
    await expect(navigation.navbar).toBeVisible();
  });

  test('stays visible on account and category pages and while scrolling', async () => {
    const accountsPage = await navigation.goToAccountsPage();
    const accountPage = await accountsPage.openNthAccount(0);
    await accountPage.waitFor();
    await expect(navigation.navbar).toBeInViewport({ ratio: 1 });

    await accountPage.transactionList.evaluate(el => el.scrollBy(0, 400));
    await expect(navigation.navbar).toBeInViewport({ ratio: 1 });

    await navigation.goToBudgetPage();
    const categoryName = await budgetPage.getCategoryNameForRow(0);
    const categoryPage = await budgetPage.openSpentPage(categoryName);
    await categoryPage.waitFor();
    await expect(navigation.navbar).toBeInViewport({ ratio: 1 });
  });

  test('is hidden on the full-screen transaction form', async () => {
    const transactionPage = await navigation.goToTransactionEntryPage();
    await transactionPage.waitFor();

    await expect(navigation.navbar).toHaveCount(0);
    await expect(transactionPage.footer).toBeVisible();
  });

  test('shows notifications above the navbar', async () => {
    await page.evaluate(() =>
      window.__actionsForMenu.addNotification({
        notification: {
          type: 'message',
          message: 'Simplified navbar notification',
          sticky: true,
        },
      }),
    );

    const notification = page.getByText('Simplified navbar notification');
    await expect(notification).toBeVisible();

    const notificationBox = await notification.boundingBox();
    const navbarBox = await navigation.navbar.boundingBox();
    if (!notificationBox || !navbarBox) {
      throw new Error('Expected notification and navbar to be rendered');
    }
    expect(notificationBox.y + notificationBox.height).toBeLessThanOrEqual(
      navbarBox.y,
    );
  });
});
