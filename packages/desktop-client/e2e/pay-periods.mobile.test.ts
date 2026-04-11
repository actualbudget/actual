import * as monthUtils from '@actual-app/core/shared/months';
import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { ConfigurationPage } from './page-models/configuration-page';
import type { MobileBudgetPage } from './page-models/mobile-budget-page';
import { MobileNavigation } from './page-models/mobile-navigation';
import type { SettingsPage } from './page-models/settings-page';

/**
 * Select a frequency via the custom Select component (button → popover menu item).
 */
async function selectFrequency(page: Page, frequencyLabel: string) {
  await page.locator('#pay-period-frequency').click();
  await page
    .locator('[data-popover]')
    .getByText(frequencyLabel, { exact: true })
    .click();
}

/**
 * Configure pay period settings on the settings page.
 * Assumes the pay period settings section is already visible.
 */
async function configurePayPeriods(
  page: Page,
  opts: {
    frequencyLabel?: string;
    startDate?: string;
    enable?: boolean;
  } = {},
) {
  const {
    frequencyLabel = 'Biweekly (every 2 weeks)',
    startDate,
    enable = true,
  } = opts;

  const payPeriodSettings = page.getByTestId('pay-period-settings');
  await payPeriodSettings.waitFor({ state: 'visible' });

  await selectFrequency(page, frequencyLabel);

  if (startDate) {
    // Use the native setter + dispatch to reliably trigger React's onChange for
    // <input type="date"> in Chromium, where fill() may not fire synthetic events.
    await payPeriodSettings
      .locator('#pay-period-start-date')
      .evaluate((el: HTMLInputElement, value: string) => {
        // eslint-disable-next-line @typescript-eslint/unbound-method
        const nativeSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value',
        )?.set;
        nativeSetter?.call(el, value);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }, startDate);
  }

  if (enable) {
    const checkbox = payPeriodSettings.getByRole('checkbox', {
      name: 'Enable pay period budgeting',
    });
    if (!(await checkbox.isChecked())) {
      await checkbox.click();
      // Verify handleToggle succeeded (not silently blocked by validation)
      await expect(checkbox).toBeChecked();
    }
  }
}

async function enablePayPeriodsFeatureFlag(settingsPage: SettingsPage) {
  await settingsPage.enableExperimentalFeature('Pay period budgeting');
}

// ── Pay periods enabled ────────────────────────────────────────────────────────

test.describe('Mobile Pay Periods (enabled)', () => {
  let page: Page;
  let navigation: MobileNavigation;
  let configurationPage: ConfigurationPage;
  let budgetPage: MobileBudgetPage;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    navigation = new MobileNavigation(page);
    configurationPage = new ConfigurationPage(page);

    await page.setViewportSize({ width: 350, height: 600 });
    await page.goto('/');
    await configurationPage.createTestFile();

    const settingsPage = await navigation.goToSettingsPage();
    await enablePayPeriodsFeatureFlag(settingsPage);
    await configurePayPeriods(page, {
      frequencyLabel: 'Biweekly (every 2 weeks)',
      startDate: '2016-01-01',
      enable: true,
    });

    budgetPage = await navigation.goToBudgetPage();
    await budgetPage.waitFor({ state: 'visible' });
  });

  test.afterEach(async () => {
    await page?.close();
  });

  // ── Spec: period label in mobile heading ───────────────────────────────────
  // Covers: MonthSelector periodLabel branch (short format)

  test('budget heading shows pay period short label when pay periods are enabled', async () => {
    // Short format: "Jan 5 - Jan 18" — no (PPX) suffix on mobile
    await expect(budgetPage.heading).toHaveText(
      /[A-Z][a-z]+ \d+ - [A-Z][a-z]+ \d+/,
    );
    await expect(budgetPage.heading).not.toHaveText(/\(PP\d+\)/);
    await expect(page).toMatchThemeScreenshots();
  });

  // ── Spec: next arrow advances by one pay period ────────────────────────────

  test('next period arrow advances mobile budget view by one pay period', async () => {
    const initialText =
      await budgetPage.selectedBudgetMonthButton.textContent();

    await budgetPage.nextMonthButton.click();
    await page.waitForTimeout(500);

    const nextText = await budgetPage.selectedBudgetMonthButton.textContent();

    expect(nextText).not.toBe(initialText);
    expect(nextText).toMatch(/[A-Z][a-z]+ \d+ - [A-Z][a-z]+ \d+/);
  });

  // ── Spec: previous arrow retreats by one pay period ────────────────────────

  test('previous period arrow retreats mobile budget view by one pay period', async () => {
    const initialText =
      await budgetPage.selectedBudgetMonthButton.textContent();

    await budgetPage.nextMonthButton.click();
    await page.waitForTimeout(500);

    const advancedText =
      await budgetPage.selectedBudgetMonthButton.textContent();
    expect(advancedText).not.toBe(initialText);

    await budgetPage.previousMonthButton.click();
    await page.waitForTimeout(500);

    const retreatedText =
      await budgetPage.selectedBudgetMonthButton.textContent();
    expect(retreatedText).toBe(initialText);
  });

  // ── Spec: "Today" button hidden on current period ──────────────────────────

  test('Today button is hidden when on the current pay period', async () => {
    await expect(page.getByRole('button', { name: 'Today' })).not.toBeVisible();
  });

  // ── Spec: "Today" button visible off current period, navigates back ────────

  test('Today button appears after navigating away and returns to the current period', async () => {
    await budgetPage.nextMonthButton.click();
    await page.waitForTimeout(300);
    await budgetPage.nextMonthButton.click();
    await page.waitForTimeout(300);

    const todayButton = page.getByRole('button', { name: 'Today' });
    await expect(todayButton).toBeVisible();

    await todayButton.click();
    await page.waitForTimeout(500);

    await expect(budgetPage.heading).toHaveText(
      /[A-Z][a-z]+ \d+ - [A-Z][a-z]+ \d+/,
    );
    await expect(todayButton).not.toBeVisible();
  });

  // ── Spec: clicking the pay period label in the header opens the month menu modal ──

  test('clicking the pay period label in the header opens the month menu modal', async () => {
    await budgetPage.openMonthMenu();

    const monthMenuModal = page.getByRole('dialog');
    await expect(monthMenuModal).toBeVisible();

    const monthMenuModalHeading = monthMenuModal.getByRole('heading');
    await expect(monthMenuModalHeading).toHaveText(
      /[A-Z][a-z]+ \d+ - [A-Z][a-z]+ \d+/,
    );
    await expect(page).toMatchThemeScreenshots();

    await page.getByRole('button', { name: 'Close' }).click();
    await expect(monthMenuModal).not.toBeVisible();
  });

  // ── Spec: clicking the To Budget button opens the budget summary modal ──────

  test('clicking the To Budget button opens the budget summary modal', async () => {
    const budgetSummaryModal = await budgetPage.openEnvelopeBudgetSummary();

    await expect(budgetSummaryModal.heading).toHaveText('Budget Summary');
    await expect(page).toMatchThemeScreenshots();

    await budgetSummaryModal.close();
    await expect(budgetPage.budgetTable).toBeVisible();
  });

  // ── Spec: CategoryPage header shows pay period label ──────────────────────
  // Covers: CategoryPage periodLabel branch + short format (no PP suffix)

  test('CategoryPage header shows pay period label when opening a spent cell', async () => {
    const categoryName = await budgetPage.getCategoryNameForRow(0);
    const accountPage = await budgetPage.openSpentPage(categoryName);

    await expect(accountPage.heading).toContainText(
      /[A-Z][a-z]+ \d+ - [A-Z][a-z]+ \d+/,
    );
    await expect(accountPage.heading).not.toContainText(/\(PP\d+\)/);
    await expect(accountPage.transactionList).toBeVisible();
    await expect(page).toMatchThemeScreenshots();

    await page.getByRole('button', { name: 'Back' }).click();
    await expect(budgetPage.budgetTable).toBeVisible();
  });

  // ── Spec: Spent cell routes to transactions and Back returns to budget ──────

  test('clicking on a spent amount opens the transactions page and back returns to budget', async () => {
    const categoryName = await budgetPage.getCategoryNameForRow(0);
    const accountPage = await budgetPage.openSpentPage(categoryName);

    await expect(accountPage.transactionList).toBeVisible();

    await page.getByRole('button', { name: 'Back' }).click();
    await expect(budgetPage.budgetTable).toBeVisible();
  });
});

// ── Pay periods disabled (regression) ─────────────────────────────────────────

test.describe('Mobile Pay Periods (disabled)', () => {
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

  // ── Spec: calendar month labels unchanged when pay periods off ─────────────
  // Covers: fallback path in MonthSelector and CategoryPage

  test('calendar month labels are unchanged when pay periods are disabled', async () => {
    const budgetPage = await navigation.goToBudgetPage();
    const selectedMonth = await budgetPage.getSelectedMonth();
    const expectedLabel = monthUtils.format(
      selectedMonth,
      budgetPage.MONTH_HEADER_DATE_FORMAT,
    );

    await expect(budgetPage.heading).toHaveText(expectedLabel);
    await expect(budgetPage.heading).not.toHaveText(/\(PP\d+\)/);
  });
});
