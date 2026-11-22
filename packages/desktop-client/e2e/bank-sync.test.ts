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
import { BankSyncPage } from './page-models/bank-sync-page';
import { ConfigurationPage } from './page-models/configuration-page';
import { Navigation } from './page-models/navigation';

test.describe('Bank Sync', () => {
  let page: Page;
  let server: MockBankSyncServer;
  let bankSyncPage: BankSyncPage;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    server = await mockBankSyncServer(page);
    bankSyncPage = new BankSyncPage(page);

    await page.goto('/');
    await new ConfigurationPage(page).createTestFile();
  });

  test.afterEach(async () => {
    expect(server.unexpectedRequests).toEqual([]);
    await page?.close();
  });

  test('checks the page visuals', async () => {
    await new Navigation(page).goToBankSyncPage();
    await bankSyncPage.waitToLoad();

    await expect(bankSyncPage.serverRequiredMessage).toContainText(
      'Bank sync needs an Actual server',
    );
    await expect(bankSyncPage.linkBankAccountButton).toHaveCount(0);
    await expect(bankSyncPage.providerList).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: /^Link account/ }),
    ).toHaveCount(0);
    await expect(page).toMatchThemeScreenshots();
  });

  test('starts with the provider list when no provider is configured', async () => {
    await connectToMockServer(page);
    await openBankSyncPage(page);

    await expect(bankSyncPage.description).toBeVisible();
    await expect(bankSyncPage.providerList.getByRole('listitem')).toHaveCount(
      4,
    );
    await expect(bankSyncPage.getProviderRow('simpleFin')).toContainText(
      'US and Canadian banks',
    );
    await expect(bankSyncPage.getProviderRow('goCardless')).toContainText(
      'European banks',
    );
    await expect(bankSyncPage.providerList).not.toContainText('Not configured');
    await expect(bankSyncPage.linkBankAccountButton).toHaveCount(0);
    await expect(bankSyncPage.menuButton).toHaveCount(0);
    await expect(page).toMatchThemeScreenshots();

    await page.getByRole('button', { name: 'Set up SimpleFIN' }).click();
    await expect(page.getByTestId('simplefin-init-modal')).toBeVisible();
  });

  test('links directly when one provider is configured', async () => {
    server.configured = { simpleFin: 'global' };
    await connectToMockServer(page);
    await openBankSyncPage(page);

    await expect(bankSyncPage.linkBankAccountButton).toBeEnabled();
    await expect(bankSyncPage.providerList).toHaveCount(0);

    await bankSyncPage.linkBankAccountButton.click();

    await expect(page.getByRole('menu')).toHaveCount(0);
    await expect(bankSyncPage.linkAccountsDialog).toContainText(
      SIMPLEFIN_EXTERNAL_ACCOUNT.name,
    );
  });

  test('skips the provider choice for an existing account with one provider', async () => {
    server.configured = { simpleFin: 'global' };
    await connectToMockServer(page);
    await openBankSyncPage(page);
    await expect(bankSyncPage.linkBankAccountButton).toBeEnabled();

    await page
      .getByRole('button', { name: 'Link account Bank of America' })
      .click();

    await expect(bankSyncPage.linkAccountsDialog).toContainText(
      SIMPLEFIN_EXTERNAL_ACCOUNT.name,
    );
    await expect(bankSyncPage.linkAccountsDialog).toContainText(
      'Bank of America',
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

    test('lists linked accounts with their last sync', async () => {
      const row = bankSyncPage.getAccountRow('Bank of America');

      await expect(
        page.getByRole('heading', { name: 'SimpleFIN', level: 2 }),
      ).toBeVisible();
      await expect(row).toContainText('Example Bank');
      await expect(
        row.getByRole('button', { name: /ago, \w{3} \d{1,2}, \d{4}/ }),
      ).toBeVisible();
      await expect(
        row.getByRole('button', { name: 'Edit Bank of America' }),
      ).toBeVisible();
      await expect(bankSyncPage.providerList).toHaveCount(0);
      await expect(page).toMatchThemeScreenshots();
    });

    test('asks which provider to use for a new bank account', async () => {
      await bankSyncPage.linkBankAccountButton.click();

      const menu = page.getByRole('menu');
      await expect(menu.getByRole('button')).toHaveText([
        'GoCardless',
        'SimpleFIN',
      ]);
      expect(server.requests).not.toContain('/simplefin/accounts');

      await menu.getByRole('button', { name: 'SimpleFIN' }).click();
      await expect(bankSyncPage.linkAccountsDialog).toContainText(
        SIMPLEFIN_EXTERNAL_ACCOUNT.name,
      );
    });

    test('offers a provider choice for an existing account', async () => {
      await page
        .getByRole('button', { name: 'Link account Ally Savings' })
        .click();

      const dialog = page.getByRole('dialog', { name: 'Link Ally Savings' });
      await expect(dialog.getByRole('listitem')).toHaveCount(4);
      await expect(
        dialog.getByRole('button', { name: 'Link with GoCardless' }),
      ).toBeVisible();
      await expect(
        dialog.getByRole('button', { name: 'Set up Akahu' }),
      ).toBeVisible();
      await expect(dialog).not.toContainText('Edit setup');
      await expect(dialog).not.toContainText('Configured');
      await expect(dialog).toMatchThemeScreenshots();
      expect(server.requests).not.toContain('/simplefin/accounts');

      await dialog.getByRole('button', { name: 'Link with SimpleFIN' }).click();
      await expect(bankSyncPage.linkAccountsDialog).toContainText(
        SIMPLEFIN_EXTERNAL_ACCOUNT.name,
      );
      await expect(bankSyncPage.linkAccountsDialog).toContainText(
        'Ally Savings',
      );
    });

    test('shows the automatic syncing interval in the menu', async () => {
      await bankSyncPage.menuButton.click();
      await page
        .getByRole('button', { name: 'Automatic syncing: never' })
        .click();

      const dialog = page.getByRole('dialog', { name: 'Automatic syncing' });
      await dialog.getByLabel('Sync accounts').click();
      await page.getByRole('button', { name: 'Every 12 hours' }).click();
      await dialog.getByRole('button', { name: 'Close' }).click();

      await bankSyncPage.menuButton.click();
      await expect(
        page.getByRole('button', { name: 'Automatic syncing: every 12 hours' }),
      ).toBeVisible();
    });

    test('resets a provider only after confirmation', async () => {
      await bankSyncPage.menuButton.click();
      await page.getByRole('button', { name: 'Providers' }).click();

      const dialog = page.getByRole('dialog');
      await expect(dialog).toHaveAccessibleName('Providers');
      await expect(bankSyncPage.getProviderRow('goCardless')).toContainText(
        'Configured for all budgets',
      );
      await expect(bankSyncPage.getProviderRow('simpleFin')).toContainText(
        'Configured for this budget only',
      );
      await expect(dialog).toMatchThemeScreenshots();

      await dialog.getByRole('button', { name: 'GoCardless menu' }).click();
      await page.getByRole('button', { name: 'Reset credentials' }).click();
      await expect(dialog).toContainText('Reset GoCardless credentials?');
      await expect(dialog).toContainText('for all budgets on this server');
      await expect(
        dialog.getByRole('button', { name: 'Cancel' }),
      ).toBeFocused();
      await dialog.getByRole('button', { name: 'Cancel' }).click();
      expect(server.deletedSecrets).toEqual([]);

      await dialog.getByRole('button', { name: 'GoCardless menu' }).click();
      await page.getByRole('button', { name: 'Reset credentials' }).click();
      await dialog.getByRole('button', { name: 'Reset credentials' }).click();

      await expect(bankSyncPage.getProviderRow('goCardless')).toContainText(
        'European banks',
      );
      expect(server.deletedSecrets).toContain('gocardless_secretId');

      await dialog.getByRole('button', { name: 'Close' }).click();
      await expect(bankSyncPage.linkBankAccountButton).toBeEnabled();
      await bankSyncPage.linkBankAccountButton.click();
      await expect(page.getByRole('menu')).toHaveCount(0);
      await expect(bankSyncPage.linkAccountsDialog).toBeVisible();
    });

    test('keeps linked accounts but no link actions when the server is unreachable', async () => {
      server.isUnreachable = true;
      await page.reload();

      await expect(bankSyncPage.serverRequiredMessage).toContainText(
        'The server cannot be reached',
      );
      await expect(bankSyncPage.getAccountRow('Bank of America')).toBeVisible();
      await expect(bankSyncPage.getAccountRow('Ally Savings')).toHaveCount(0);
      await expect(bankSyncPage.linkBankAccountButton).toHaveCount(0);
      await expect(
        page.getByRole('button', { name: /^Link account/ }),
      ).toHaveCount(0);
    });
  });
});
