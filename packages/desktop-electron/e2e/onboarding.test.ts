import { AccountPage } from '@actual-app/web/e2e/page-models/account-page';
import { ConfigurationPage } from '@actual-app/web/e2e/page-models/configuration-page';
import { expect } from '@playwright/test';

import { test } from './fixtures';

test.describe('Onboarding', () => {
  let configurationPage: ConfigurationPage;

  test.beforeEach(async ({ electronPage }) => {
    configurationPage = new ConfigurationPage(electronPage);
  });

  test('checks the page visuals', async ({ electronPage }) => {
    await expect(electronPage).toHaveScreenshot();
    await configurationPage.clickOnNoServer();
    await expect(electronPage).toHaveScreenshot();
  });

  test('creates a new empty budget file then closes it to return to the onboarding screen', async ({
    electronPage,
  }) => {
    await configurationPage.clickOnNoServer();
    await configurationPage.startFresh();

    const accountPage = new AccountPage(electronPage);
    await expect(accountPage.accountName).toBeVisible();
    await expect(accountPage.accountName).toHaveText('All Accounts');
    await expect(accountPage.accountBalance).toHaveText('0.00');
    await expect(electronPage).toHaveScreenshot();
    await electronPage.getByRole('button', { name: 'My Finances' }).click();
    await electronPage.getByRole('button', { name: 'Close' }).click();
    await expect(electronPage).toHaveScreenshot();
  });
});
