import type { Page } from '@playwright/test';

import {
  connectToMockServer,
  linkAccountToSimpleFin,
  mockBankSyncServer,
  openBankSyncPage,
  SIMPLEFIN_EXTERNAL_ACCOUNT,
} from './bank-sync-server';
import type { MockBankSyncServer } from './bank-sync-server';
import { expect, test } from './fixtures';
import { ConfigurationPage } from './page-models/configuration-page';
import { MobileBankSyncPage } from './page-models/mobile-bank-sync-page';
import { MobileNavigation } from './page-models/mobile-navigation';

test.describe('Mobile Bank Sync', () => {
  let page: Page;
  let server: MockBankSyncServer;
  let bankSyncPage: MobileBankSyncPage;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    server = await mockBankSyncServer(page);
    bankSyncPage = new MobileBankSyncPage(page);

    await page.setViewportSize({
      width: 350,
      height: 600,
    });

    await page.goto('/');
    await new ConfigurationPage(page).createTestFile();
  });

  test.afterEach(async () => {
    expect(server.unexpectedRequests).toEqual([]);
    await page?.close();
  });

  test('checks the page visuals', async () => {
    await new MobileNavigation(page).goToBankSyncPage();
    await bankSyncPage.waitToLoad();

    await expect(
      page.getByRole('heading', { name: 'Bank Sync' }),
    ).toBeVisible();
    await expect(bankSyncPage.serverRequiredMessage).toContainText(
      'Bank sync needs an Actual server',
    );
    await expect(bankSyncPage.linkBankAccountButton).toHaveCount(0);
    await expect(bankSyncPage.menuButton).toHaveCount(0);
    await expect(bankSyncPage.accountRows).toHaveCount(0);
    await expect(page).toMatchThemeScreenshots();
  });

  test('starts with the provider list when no provider is configured', async () => {
    await connectToMockServer(page);
    await openBankSyncPage(page);

    await expect(
      page.getByRole('heading', { name: 'Bank Sync' }),
    ).toBeVisible();
    await expect(bankSyncPage.providerList.getByRole('listitem')).toHaveCount(
      4,
    );
    await expect(bankSyncPage.getProviderRow('simpleFin')).toContainText(
      'US and Canadian banks',
    );
    await expect(bankSyncPage.getProviderRow('simpleFin')).toContainText(
      'Set up',
    );
    await expect(bankSyncPage.providerList).not.toContainText('Not configured');
    await expect(bankSyncPage.linkBankAccountButton).toHaveCount(0);
    await expect(bankSyncPage.menuButton).toHaveCount(0);
    await expect(page.getByRole('grid', { name: 'Accounts' })).toBeVisible();
    await expect(page).toMatchThemeScreenshots();

    await bankSyncPage.getProviderRow('simpleFin').click();
    await expect(page.getByTestId('simplefin-init-modal')).toBeVisible();
  });

  test('links directly from the header when one provider is configured', async () => {
    server.configured = { simpleFin: 'global' };
    await connectToMockServer(page);
    await openBankSyncPage(page);

    await expect(bankSyncPage.linkBankAccountButton).toBeEnabled();
    await bankSyncPage.linkBankAccountButton.click();

    await expect(bankSyncPage.linkAccountsDialog).toContainText(
      SIMPLEFIN_EXTERNAL_ACCOUNT.name,
    );
  });

  test.describe('with several providers and a linked account', () => {
    test.beforeEach(async () => {
      server.configured = {
        simpleFin: 'per-budget-file',
        goCardless: 'global',
      };
      await connectToMockServer(page);
      await openBankSyncPage(page);
      await linkAccountToSimpleFin(page, 'Bank of America');
      await openBankSyncPage(page);
      await expect(bankSyncPage.linkBankAccountButton).toBeEnabled();
    });

    test('lists accounts as named rows with their last sync', async () => {
      const linkedRow = bankSyncPage.getAccountRow(/Bank of America/);
      const unlinkedRow = bankSyncPage.getAccountRow(/Ally Savings/);

      await expect(page.getByRole('grid', { name: 'SimpleFIN' })).toBeVisible();
      await expect(linkedRow).toContainText(/Synced .* ago/);
      await expect(linkedRow).toContainText('Example Bank');
      await expect(unlinkedRow).toContainText('Link account');
      await expect(unlinkedRow).not.toContainText('Synced');
      await expect(bankSyncPage.providerList).toHaveCount(0);
      await expect(page).toMatchThemeScreenshots();
    });

    test('searches for accounts', async () => {
      await expect(bankSyncPage.accountRows.nth(1)).toBeVisible();

      await bankSyncPage.searchFor('Ally');
      await expect(bankSyncPage.searchBox).toHaveValue('Ally');
      await expect(bankSyncPage.accountRows).toHaveCount(1);

      await bankSyncPage.searchFor('NonExistentAccount123456789');
      await expect(page.getByText(/No accounts found/)).toBeVisible();
      await expect(page).toMatchThemeScreenshots();
    });

    test('asks which provider to use from the header', async () => {
      await bankSyncPage.linkBankAccountButton.click();

      const sheet = page.getByRole('dialog', { name: 'Link bank account' });
      await expect(sheet.getByRole('button')).toHaveText([
        'GoCardless',
        'SimpleFIN',
      ]);
      expect(server.requests).not.toContain('/simplefin/accounts');

      await sheet.getByRole('button', { name: 'SimpleFIN' }).click();
      await expect(sheet).toHaveCount(0);
      await expect(bankSyncPage.linkAccountsDialog).toContainText(
        SIMPLEFIN_EXTERNAL_ACCOUNT.name,
      );
    });

    test('offers a provider choice for an existing account', async () => {
      await bankSyncPage.getAccountRow(/Ally Savings/).click();

      const sheet = page.getByRole('dialog', { name: 'Link Ally Savings' });
      await expect(sheet.getByRole('listitem')).toHaveCount(4);
      await expect(
        sheet.getByRole('button', { name: 'Set up Akahu' }),
      ).toBeVisible();
      await expect(sheet).not.toContainText('Edit setup');
      await expect(sheet).toMatchThemeScreenshots();
      expect(server.requests).not.toContain('/simplefin/accounts');

      await sheet.getByRole('button', { name: 'Link with SimpleFIN' }).click();
      await expect(bankSyncPage.linkAccountsDialog).toContainText(
        SIMPLEFIN_EXTERNAL_ACCOUNT.name,
      );
      await expect(bankSyncPage.linkAccountsDialog).toContainText(
        'Ally Savings',
      );
    });

    test('keeps providers and automatic syncing in the menu', async () => {
      await bankSyncPage.menuButton.click();

      const sheet = page.getByRole('dialog', { name: 'Bank Sync' });
      await expect(sheet.getByRole('button')).toHaveText([
        'Providers',
        'Automatic syncing: never',
      ]);

      await sheet.getByRole('button', { name: /Automatic syncing/ }).click();
      const settings = page.getByRole('dialog', { name: 'Automatic syncing' });
      await settings.getByLabel('Sync accounts').click();
      await page.getByRole('button', { name: 'Custom interval' }).click();
      await settings.getByLabel('every').fill('3');
      await settings.getByLabel('every').press('Enter');
      await expect(settings).toMatchThemeScreenshots();
      await page.keyboard.press('Escape');

      await bankSyncPage.menuButton.click();
      await expect(
        sheet.getByRole('button', { name: 'Automatic syncing: every 3 hours' }),
      ).toBeVisible();
    });

    test('resets a provider from its detail only after confirmation', async () => {
      await bankSyncPage.menuButton.click();
      await page.getByRole('button', { name: 'Providers' }).click();

      const sheet = page.getByRole('dialog');
      await expect(sheet).toHaveAccessibleName('Providers');
      await expect(bankSyncPage.getProviderRow('akahu')).toContainText(
        'Set up',
      );
      await expect(sheet).toMatchThemeScreenshots();

      await bankSyncPage.getProviderRow('goCardless').click();
      await expect(sheet).toHaveAccessibleName('GoCardless');
      await expect(sheet.getByTestId('bank-sync-provider-scope')).toHaveText(
        'Configured for all budgets',
      );
      await expect(
        sheet.getByRole('button', { name: 'All providers' }),
      ).toBeFocused();
      await expect(sheet).toMatchThemeScreenshots();

      await sheet.getByRole('button', { name: 'Reset credentials' }).click();
      await expect(sheet).toContainText('Reset GoCardless credentials?');
      await sheet.getByRole('button', { name: 'Cancel' }).click();
      expect(server.deletedSecrets).toEqual([]);

      await sheet.getByRole('button', { name: 'All providers' }).click();
      await expect(sheet).toHaveAccessibleName('Providers');

      await bankSyncPage.getProviderRow('goCardless').click();
      await sheet.getByRole('button', { name: 'Reset credentials' }).click();
      await sheet.getByRole('button', { name: 'Reset credentials' }).click();

      await expect(bankSyncPage.getProviderRow('goCardless')).toContainText(
        'European banks',
      );
      expect(server.deletedSecrets).toContain('gocardless_secretId');
    });

    test('keeps linked accounts but no link actions when the server is unreachable', async () => {
      server.isUnreachable = true;
      await page.reload();

      await expect(bankSyncPage.serverRequiredMessage).toContainText(
        'The server cannot be reached',
      );
      await expect(bankSyncPage.getAccountRow(/Bank of America/)).toBeVisible();
      await expect(bankSyncPage.getAccountRow(/Ally Savings/)).toHaveCount(0);
      await expect(bankSyncPage.linkBankAccountButton).toHaveCount(0);
    });
  });
});
