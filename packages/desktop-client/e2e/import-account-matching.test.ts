import { join } from 'path';

import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import type { AccountPage } from './page-models/account-page';
import { ConfigurationPage } from './page-models/configuration-page';
import { Navigation } from './page-models/navigation';

test.describe('Import account matching', () => {
  let page: Page;
  let navigation: Navigation;
  let accountA: AccountPage;

  async function chooseFile(
    startImport: () => Promise<void>,
    file = 'test-account.ofx',
  ) {
    const fileChooserPromise = page.waitForEvent('filechooser');
    await startImport();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(join(__dirname, 'data', file));
  }

  async function importFromAllAccounts(file?: string) {
    await page.getByRole('link', { name: /^All accounts/ }).click();
    await chooseFile(
      () => page.getByRole('button', { name: 'Import', exact: true }).click(),
      file,
    );
  }

  async function pickAccount(name: string) {
    await page.getByRole('textbox', { name: 'Account' }).fill(name);
    await page.getByRole('option', { name }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
  }

  async function finishImport() {
    const importButton = page.getByRole('button', {
      name: /Import \d+ transactions/,
    });
    await importButton.waitFor({ state: 'visible' });
    await importButton.click();
    await expect(importButton).not.toBeVisible();
  }

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    navigation = new Navigation(page);
    const configurationPage = new ConfigurationPage(page);

    await page.goto('/');
    await configurationPage.createTestFile();

    accountA = await navigation.createAccount({
      name: 'Match A',
      offBudget: false,
      balance: 0,
    });
    await accountA.waitFor();
    // The account page's "Edit account name" button would make the Name
    // field label ambiguous when creating the next account.
    await navigation.goToBudgetPage();
    await navigation.createAccount({
      name: 'Match B',
      offBudget: false,
      balance: 0,
    });
  });

  test.afterEach(async () => {
    await page?.close();
  });

  test('asks for the account on first import, then remembers it', async () => {
    await importFromAllAccounts();

    await expect(
      page.getByText('Which account is this file for?'),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continue' })).toBeDisabled();

    await pickAccount('Match A');
    await finishImport();

    // The pairing is saved, so the second import is matched automatically.
    await importFromAllAccounts();
    await expect(page.getByText(/This file matches/)).toBeVisible();
    await expect(
      page.getByRole('dialog').getByText('Match A', { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continue' })).toBeEnabled();
  });

  test('warns when a file belongs to a different account', async () => {
    await importFromAllAccounts();
    await pickAccount('Match A');
    await finishImport();

    await navigation.goToAccountPage('Match B');
    await chooseFile(() =>
      page.getByRole('button', { name: 'Import', exact: true }).click(),
    );

    await expect(page.getByRole('dialog')).toContainText(
      'This file looks like it belongs to Match A, but you started from Match B.',
    );
    await page.getByRole('button', { name: /Import to Match A/ }).click();
    await expect(
      page.getByRole('button', { name: /Import \d+ transactions/ }),
    ).toBeVisible();
  });

  test('re-pairing to another account shows a notice', async () => {
    await importFromAllAccounts();
    await pickAccount('Match A');
    await finishImport();

    await navigation.goToAccountPage('Match B');
    await chooseFile(() =>
      page.getByRole('button', { name: 'Import', exact: true }).click(),
    );
    await page
      .getByRole('button', { name: /Import to Match B anyway/ })
      .click();
    await finishImport();

    await expect(
      page.getByText(
        /previously linked to Match A\. It is now linked to Match B/,
      ),
    ).toBeVisible();
  });

  test('suggests an account from similar transactions when the file has no identifier', async () => {
    // Give Match A some history with the payees the QIF file contains.
    await importFromAllAccounts();
    await pickAccount('Match A');
    await finishImport();

    await importFromAllAccounts('test-no-account.qif');
    await expect(page.getByRole('dialog')).toContainText(
      'This looks like Match A.',
    );
    // A suggestion never skips the confirm step.
    await expect(page.getByRole('button', { name: 'Continue' })).toBeDisabled();

    await page.getByRole('button', { name: 'Use Match A' }).click();
    await expect(page.getByRole('button', { name: 'Continue' })).toBeEnabled();
  });
});
