import { readFile } from 'fs/promises';
import { join } from 'path';

import type { Locator, Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { ConfigurationPage } from './page-models/configuration-page';
import { Navigation } from './page-models/navigation';
import type { SettingsPage } from './page-models/settings-page';

// Browser execution is user-deferred. These tests are runnable definitions.
// Every case is local: manual fallbacks, CSV import and export, and paging.

const dataDir = join(__dirname, 'data');

async function setInput(locator: Locator, value: string) {
  await locator.evaluate((el, next) => {
    const input = el as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    )?.set;
    setter?.call(input, next);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
}

async function chooseMenu(page: Page, id: string, label: string) {
  await page.locator(id).click();
  await page
    .getByRole('menu')
    .getByRole('button', { name: label, exact: true })
    .click();
}

async function openRateSettings(page: Page): Promise<SettingsPage> {
  const navigation = new Navigation(page);
  const settings = await navigation.goToSettingsPage();
  // Choosing a currency needs Currency support; Multiple currencies needs a
  // currency.
  await settings.enableExperimentalFeature('Currency support');
  await settings.goToSection('General');
  await page.locator('#default-currency-select').click();
  await page.getByRole('button', { name: 'USD - US Dollar ($)' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Back up your budget')).toBeVisible();
  await dialog.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await settings.enableExperimentalFeature('Multiple currencies');
  await settings.goToSection('Exchange rates');
  await expect(page.getByTestId('exchange-rates')).toBeVisible();
  await expect(page.getByText('No exchange rates saved yet.')).toBeVisible();
  return settings;
}

async function saveFallback(
  page: Page,
  currency: string,
  date: string,
  rate: string,
) {
  // A pair with a tab is selected there; another is added first.
  const tab = page.getByRole('tab', {
    name: `${currency.slice(0, 3)} to USD`,
    exact: true,
  });
  if (await tab.isVisible()) {
    await tab.click();
  } else {
    await chooseMenu(page, '#exchange-rate-add-pair', currency);
  }
  await setInput(page.locator('#exchange-rate-date'), date);
  // Rates here are quote per 1 USD, but entry starts as USD per 1 quote.
  const value = page.locator('#exchange-rate-value');
  const label = `Rate in ${currency.slice(0, 3)} per 1 USD`;
  await setInput(value, '');
  if ((await value.getAttribute('aria-label')) !== label) {
    await value
      .locator('..')
      .getByRole('button', { name: 'Swap rate direction' })
      .click();
  }
  await expect(value).toHaveAttribute('aria-label', label);
  await setInput(value, rate);
  await page.getByRole('button', { name: 'Save fallback' }).click();
}

function rateRow(currency: string, name: string, rate: string, date: string) {
  return `${currency} (${name}): ${rate} fallback ${date}`;
}

async function removeListedRate(page: Page, text: string) {
  const row = page.getByText(text, { exact: true });
  await row.locator('..').getByRole('button', { name: 'Remove' }).click();
  await expect(row).not.toBeVisible();
}

async function chooseCsv(page: Page, file: string) {
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Choose file' }).click();
  await (await chooser).setFiles(file);
}

test.describe('Exchange rate history', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('/');
    await new ConfigurationPage(page).createTestFile();
    await openRateSettings(page);
  });

  test.afterEach(async () => {
    await page?.close();
  });

  test('exports live manual rows and re-imports that file as unchanged', async () => {
    await saveFallback(page, 'EUR - Euro (€)', '2026-02-28', '0.92');
    await expect(
      page.getByText(rateRow('EUR', 'Euro', '0.92', '2026-02-28')),
    ).toBeVisible();
    await saveFallback(page, 'EUR - Euro (€)', '2026-02-20', '0.80');
    await expect(
      page.getByText(rateRow('EUR', 'Euro', '0.8', '2026-02-20')),
    ).toBeVisible();
    await removeListedRate(page, rateRow('EUR', 'Euro', '0.8', '2026-02-20'));

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export rates' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(
      /^exchange-rates-USD-\d{4}-\d{2}-\d{2}\.csv$/,
    );
    await expect(
      page.getByText('Rates exported: 1. Invalid rates left out: 0.'),
    ).toBeVisible();
    // Import accepts only .csv paths, and download.path() has no extension.
    const exported = test.info().outputPath(download.suggestedFilename());
    await download.saveAs(exported);
    const csv = await readFile(exported, 'utf8');
    expect(csv).toBe(
      'base_currency,quote_currency,rate,kind,date,source,timestamp\n' +
        'USD,EUR,0.92,dated,2026-02-28,manual,2026-02-28T00:00:00.000Z\n',
    );

    await chooseCsv(page, exported);
    await expect(page.getByText('Unchanged: 1')).toBeVisible();
    await expect(page.getByText('Fetched rates skipped: 0')).toBeVisible();
    await page.getByRole('button', { name: 'Import', exact: true }).click();
    await expect(
      page.getByText('Rates written: 0. Replaced: 0. Kept unchanged: 0.'),
    ).toBeVisible();
    await expect(
      page.getByText(rateRow('EUR', 'Euro', '0.92', '2026-02-28')),
    ).toBeVisible();
  });

  test('classifies the approved X1 file as unchanged and skipped fetched', async () => {
    await saveFallback(page, 'EUR - Euro (€)', '2026-02-28', '0.92');
    await expect(
      page.getByText(rateRow('EUR', 'Euro', '0.92', '2026-02-28')),
    ).toBeVisible();
    await chooseCsv(page, join(dataDir, 'exchange-rates-x1.csv'));
    await expect(page.getByText('Unchanged: 1')).toBeVisible();
    await expect(page.getByText('Fetched rates skipped: 1')).toBeVisible();
    await expect(page.getByText('New: 0')).toBeVisible();
    await page.getByRole('button', { name: 'Import', exact: true }).click();
    await expect(
      page.getByText('Rates written: 0. Replaced: 0. Kept unchanged: 0.'),
    ).toBeVisible();
    await expect(page.getByText(/plugin:fxtest/)).toHaveCount(0);
  });

  test('imports M1 with Keep, then replaces the saved conflict from the same file', async () => {
    await saveFallback(page, 'EUR - Euro (€)', '2026-02-28', '0.90');
    await saveFallback(page, 'EUR - Euro (€)', '2026-02-27', '0.88');
    await saveFallback(page, 'EUR - Euro (€)', '2026-02-26', '0.85');
    await expect(
      page.getByText(rateRow('EUR', 'Euro', '0.9', '2026-02-28')),
    ).toBeVisible();
    await removeListedRate(page, rateRow('EUR', 'Euro', '0.88', '2026-02-27'));

    const file = join(dataDir, 'exchange-rates-m1.csv');
    await chooseCsv(page, file);
    await expect(page.getByText('New: 2')).toBeVisible();
    await expect(page.getByText('Unchanged: 1')).toBeVisible();
    await expect(
      page.getByText('Different from a saved rate: 1'),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Import', exact: true }).click();
    await expect(
      page.getByText('Rates written: 2. Replaced: 0. Kept unchanged: 1.'),
    ).toBeVisible();
    await expect(
      page.getByText(rateRow('EUR', 'Euro', '0.9', '2026-02-28')),
    ).toBeVisible();
    await expect(
      page.getByText(rateRow('EUR', 'Euro', '0.88', '2026-02-27')),
    ).toBeVisible();
    await expect(
      page.getByText(rateRow('EUR', 'Euro', '0.84', '2026-02-25')),
    ).toBeVisible();

    await chooseCsv(page, file);
    await expect(
      page.getByText('Different from a saved rate: 1'),
    ).toBeVisible();
    await chooseMenu(page, '#exchange-rate-import-policy', 'Replace existing');
    await page.getByRole('button', { name: 'Import', exact: true }).click();
    await expect(
      page.getByText(
        'Saved rates to replace: 1. Replace them with the rates in this file? You can undo the import.',
      ),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Replace and import' }).click();
    await expect(
      page.getByText('Rates written: 1. Replaced: 1. Kept unchanged: 0.'),
    ).toBeVisible();
    await expect(
      page.getByText(rateRow('EUR', 'Euro', '0.92', '2026-02-28')),
    ).toBeVisible();
    await expect(
      page.getByText(rateRow('EUR', 'Euro', '0.9', '2026-02-28')),
    ).toHaveCount(0);
  });

  test('leaves both in-file conflicts unwritten', async () => {
    await chooseCsv(page, join(dataDir, 'exchange-rates-p13.csv'));
    await expect(
      page.getByText('Conflicting within the file: 2'),
    ).toBeVisible();
    await expect(
      page.getByText(/Line 2: conflicts with another row in the file/),
    ).toBeVisible();
    await expect(
      page.getByText(/Line 3: conflicts with another row in the file/),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Import', exact: true }).click();
    await expect(
      page.getByText('Rates written: 0. Replaced: 0. Kept unchanged: 0.'),
    ).toBeVisible();
    await expect(page.getByText('No exchange rates saved yet.')).toBeVisible();
  });

  test('pages 250 saved EUR rows as 100, 100, then 50', async () => {
    await chooseCsv(page, join(dataDir, 'exchange-rates-paging.csv'));
    await expect(page.getByText('New: 250')).toBeVisible();
    await page.getByRole('button', { name: 'Import', exact: true }).click();
    await expect(
      page.getByText('Rates written: 250. Replaced: 0. Kept unchanged: 0.'),
    ).toBeVisible();

    const newest = rateRow('EUR', 'Euro', '1.5', '2024-09-06');
    const oldest = rateRow('EUR', 'Euro', '1.5', '2024-01-01');
    const loadMore = page.getByRole('button', { name: 'Load more' });
    await expect(page.getByText(newest)).toBeVisible();
    await expect(page.getByText(oldest)).toHaveCount(0);
    await expect(loadMore).toBeVisible();
    await loadMore.click();
    await expect(page.getByText(oldest)).toHaveCount(0);
    await expect(loadMore).toBeVisible();
    await loadMore.click();
    await expect(page.getByText(oldest)).toBeVisible();
    await expect(page.getByText(newest)).toBeVisible();
    await expect(loadMore).toHaveCount(0);
  });

  test('updates the current month FX changes line after a rate import without reloading', async () => {
    // Playwright's user agent fixes the app clock at 2017-01-01. The
    // fallback has to apply on that acquisition day, and the imported rate
    // replaces it for the close of the selected month (today).
    await saveFallback(page, 'JPY - Japanese Yen (¥)', '2017-01-01', '150');
    await expect(
      page.getByText(rateRow('JPY', 'Japanese Yen', '150', '2017-01-01')),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Add account' }).click();
    await expect(
      page.getByRole('heading', { name: 'Add account' }),
    ).toBeVisible();
    await setInput(page.getByLabel('Name'), 'Yen');
    await chooseMenu(
      page,
      '#account-currency-select',
      'JPY - Japanese Yen (¥)',
    );
    await setInput(page.getByLabel('Balance'), '15000');
    await expect(
      page.getByText('at 1 JPY = 0.006666666666667 USD'),
    ).toBeVisible();
    const create = page
      .getByRole('dialog')
      .getByRole('button', { name: 'Create', exact: true });
    await create.evaluate((el: HTMLElement) => el.click());
    await expect(page.getByTestId('account-name')).toHaveText('Yen');

    const navigation = new Navigation(page);
    const budget = await navigation.goToBudgetPage();
    expect(await budget.getSelectedMonth()).toBe('2017-01');
    const summary = page.locator(
      '[data-testid="budget-summary"][data-month="2017-01"]',
    );
    await expect(summary.getByText('FX changes (included)')).toBeVisible();
    await summary.getByRole('button', { name: 'FX details' }).click();
    const details = page.getByRole('dialog');
    const totals = details.getByRole('region', { name: 'Valuation totals' });
    // Amounts are wrapped in bidi isolation marks, so match around them.
    await expect(totals).toContainText(/Monthly FX changes\W*\$\W*0\.00/);
    await details.getByRole('button', { name: 'Close' }).first().click();
    await expect(details).not.toBeVisible();

    await page.evaluate(() => {
      document.documentElement.dataset.fx22Stay = '1';
    });
    const settings = await navigation.goToSettingsPage();
    await settings.goToSection('Exchange rates');
    await chooseCsv(page, join(dataDir, 'exchange-rates-v2.csv'));
    await expect(
      page.getByText('Different from a saved rate: 1'),
    ).toBeVisible();
    await chooseMenu(page, '#exchange-rate-import-policy', 'Replace existing');
    await page.getByRole('button', { name: 'Import', exact: true }).click();
    await page.getByRole('button', { name: 'Replace and import' }).click();
    await expect(
      page.getByText('Rates written: 1. Replaced: 1. Kept unchanged: 0.'),
    ).toBeVisible();

    await navigation.goToBudgetPage();
    expect(
      await page.evaluate(() => document.documentElement.dataset.fx22Stay),
    ).toBe('1');
    const after = page.locator(
      '[data-testid="budget-summary"][data-month="2017-01"]',
    );
    expect(await budget.getSelectedMonth()).toBe('2017-01');
    await expect(after.getByText('FX changes (included)')).toBeVisible();
    await after.getByRole('button', { name: 'FX details' }).click();
    await expect(
      page
        .getByRole('dialog')
        .getByRole('region', { name: 'Valuation totals' }),
    ).toContainText(/Monthly FX changes\W*\$\W*20\.00/);
  });
});
