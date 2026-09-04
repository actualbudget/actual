import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { ConfigurationPage } from './page-models/configuration-page';
import type { CustomReportPage } from './page-models/custom-report-page';
import { Navigation } from './page-models/navigation';
import type { ReportsPage } from './page-models/reports-page';

test.describe('Reports', () => {
  test.describe.configure({ mode: 'serial' });

  let page: Page;
  let navigation: Navigation;
  let reportsPage: ReportsPage;
  let configurationPage: ConfigurationPage;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    navigation = new Navigation(page);
    configurationPage = new ConfigurationPage(page);

    await page.goto('/');
    await configurationPage.createTestFile();

    reportsPage = await navigation.goToReportsPage();
    await reportsPage.waitToLoad();
  });

  test.afterEach(async () => {
    await page?.close();
  });

  test('loads net worth and cash flow reports', async () => {
    const reports = await reportsPage.getAvailableReportList();

    expect(reports).toEqual([
      'Total Income (YTD)',
      'Total Expenses (YTD)',
      'Avg Per Month',
      'Avg Per Transaction',
      'Net Worth',
      'Cash Flow',
      'This Month',
      'Budget Overview',
      '3-Month Average',
    ]);
    await expect(page).toMatchThemeScreenshots();
  });

  test('right clicking a report card opens context menu', async () => {
    await reportsPage.rightClickReportCard('Net Worth');
    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();
    await expect(menu.getByRole('button', { name: 'Rename' })).toBeVisible();
  });

  test('loads net worth graph and checks visuals', async () => {
    await reportsPage.goToNetWorthPage();
    await expect(page).toMatchThemeScreenshots();
  });

  test('loads cash flow graph and checks visuals', async () => {
    await reportsPage.goToCashFlowPage();
    await expect(page).toMatchThemeScreenshots();
  });

  test('opens the date range picker and checks visuals', async () => {
    await reportsPage.goToNetWorthPage();

    await page.getByTestId('date-range-picker-trigger').click();
    const picker = page.locator('[data-popover]');
    await expect(picker).toMatchThemeScreenshots();

    // Switch to day granularity
    await picker.getByRole('button', { name: 'Day', exact: true }).click();
    await expect(picker).toMatchThemeScreenshots();
  });

  test('pins a fixed start date that keeps tracking the current month', async () => {
    await reportsPage.goToNetWorthPage();

    const trigger = page.getByTestId('date-range-picker-trigger');
    const initialLabel = await trigger.innerText();
    // The test file pins "now" to January 2017, so read the app's current
    // month from the range end rather than using the real clock.
    const [, , , endShortMonth, endYearText] =
      initialLabel.match(/(\w{3}) (\d{4}) – (\w{3}) (\d{4})/) ?? [];
    const endYear = Number(endYearText);
    const endMonthIdx = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ].indexOf(endShortMonth);
    const startYear = Number(initialLabel.match(/(\d{4})/)?.[1]);

    await trigger.click();
    const picker = page.locator('[data-popover]');

    // Opt into the fixed-start filter; it commits immediately and keeps
    // the picker open so a single month click pins the start.
    const fromStartDate = picker.getByRole('button', {
      name: 'From start date',
    });
    await fromStartDate.click();
    await expect(fromStartDate).toHaveAttribute('aria-pressed', 'true');

    // While fixed start is active, no other preset may highlight even when
    // its range coincides (Year to date also ends at the current month).
    await expect(
      picker.getByRole('button', { name: 'Year to date', exact: true }),
    ).toHaveAttribute('aria-pressed', 'false');

    // Pin the month before the app's current month (navigate the year grid
    // there first if the displayed year differs).
    const target = new Date(endYear, endMonthIdx - 1, 1);
    const targetYear = target.getFullYear();
    for (let year = startYear; year < targetYear; year++) {
      await picker.getByRole('button', { name: 'Next' }).click();
    }
    await picker
      .getByRole('button', {
        name: target.toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric',
        }),
      })
      .click();
    await expect(picker).toBeHidden();

    // The picked month is the start; the end is the app's current month.
    // The mode button still presents as Live since fixed start lives
    // within it.
    const formatOptions = {
      month: 'short',
      year: 'numeric',
    } satisfies Intl.DateTimeFormatOptions;
    const expectedStart = target.toLocaleDateString('en-US', formatOptions);
    const expectedEnd = new Date(endYear, endMonthIdx, 1).toLocaleDateString(
      'en-US',
      formatOptions,
    );
    await expect(trigger).toContainText(`${expectedStart} – ${expectedEnd}`);
    await expect(page.getByRole('button', { name: 'Live' })).toBeVisible();

    // Persist the widget, reload, and verify the stored fixed-start range
    // re-resolves: the pinned start is kept while the end snaps back to
    // the current month.
    await page.getByRole('button', { name: 'Save widget' }).click();
    await page.reload();
    await expect(trigger).toContainText(`${expectedStart} – ${expectedEnd}`);
  });

  test.describe('balance forecast', () => {
    test.beforeEach(async () => {
      const settingsPage = await navigation.goToSettingsPage();
      await settingsPage.enableExperimentalFeature('Balance Forecast Report');

      reportsPage = await navigation.goToReportsPage();
      await reportsPage.waitToLoad();
      await reportsPage.addWidget('Balance forecast');
      await reportsPage.goToBalanceForecastPage();
    });

    test('loads balance forecast report with monthly granularity', async () => {
      await expect(page).toMatchThemeScreenshots();
    });

    test('switches to daily granularity', async () => {
      await reportsPage.selectForecastGranularity('Daily');

      await expect(page).toMatchThemeScreenshots();
    });

    test('loads tracking budget forecast report', async () => {
      const settingsPage = await navigation.goToSettingsPage();
      await settingsPage.useBudgetType('Tracking');

      const budgetPage = await navigation.goToBudgetPage();
      await budgetPage.goToNextMonth();
      await budgetPage.setBudgetedAmount('Food', '1200', 0);
      await budgetPage.goToNextMonth();
      await budgetPage.setBudgetedAmount('Food', '1200', 0);
      await budgetPage.goToNextMonth();
      await budgetPage.setBudgetedAmount('Food', '1200', 0);

      reportsPage = await navigation.goToReportsPage();
      await reportsPage.waitToLoad();
      await reportsPage.goToBalanceForecastPage();
      await reportsPage.selectForecastSource('Tracking budget');

      await expect(page).toMatchThemeScreenshots();
    });
  });

  test.describe('custom reports', () => {
    let customReportPage: CustomReportPage;

    test.beforeEach(async () => {
      customReportPage = await reportsPage.goToCustomReportPage();
      await page.addStyleTag({
        content: '[role="tooltip"] { display: none !important; }',
      });
    });

    test('Switches to Data Table and checks the visuals', async () => {
      await customReportPage.selectMode('time');
      await customReportPage.selectViz('Data Table');
      await expect(page).toMatchThemeScreenshots();
    });

    test('Switches to Bar Graph and checks the visuals', async () => {
      await customReportPage.selectMode('time');
      await customReportPage.selectViz('Bar Graph');
      await expect(page).toMatchThemeScreenshots();
    });

    test('Switches to Line Graph and checks the visuals', async () => {
      await customReportPage.selectMode('time');
      await customReportPage.selectViz('Line Graph');
      await expect(page).toMatchThemeScreenshots();
    });

    test('Switches to Area Graph and checks the visuals', async () => {
      await customReportPage.selectMode('total');
      await customReportPage.selectViz('Area Graph');
      await expect(page).toMatchThemeScreenshots();
    });

    test('Switches to Donut Graph and checks the visuals', async () => {
      await customReportPage.selectMode('total');
      await customReportPage.selectViz('Donut Graph');
      await expect(page).toMatchThemeScreenshots();
    });

    test('Validates that "show legend" button shows the legend side-bar', async () => {
      await customReportPage.selectViz('Bar Graph');
      await customReportPage.showLegendButton.click();
      await expect(page).toMatchThemeScreenshots();

      await customReportPage.showLegendButton.click();
    });

    test('Validates that "show summary" button shows the summary', async () => {
      await customReportPage.selectViz('Bar Graph');
      await customReportPage.showSummaryButton.click();
      await expect(page).toMatchThemeScreenshots();

      await customReportPage.showSummaryButton.click();
    });

    test('Validates that "show labels" button shows the labels', async () => {
      await customReportPage.selectViz('Bar Graph');
      await customReportPage.showLabelsButton.click();
      await expect(page).toMatchThemeScreenshots();

      await customReportPage.showLabelsButton.click();
    });
  });
});

test.describe('Reports without transactions', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterEach(async () => {
    await page?.close();
  });

  test('creates a custom report in an empty budget', async () => {
    const pageErrors: Error[] = [];
    page.on('pageerror', error => pageErrors.push(error));

    const configurationPage = new ConfigurationPage(page);
    const navigation = new Navigation(page);

    await page.goto('/');
    await configurationPage.startFresh();

    const reportsPage = await navigation.goToReportsPage();
    await reportsPage.waitToLoad();
    const customReportPage = await reportsPage.goToCustomReportPage();

    await expect(page).toHaveURL(/\/reports\/custom/);
    await expect(
      customReportPage.pageContent.getByRole('button', {
        name: 'Total',
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      customReportPage.pageContent.getByRole('button', {
        name: 'Time',
        exact: true,
      }),
    ).toBeVisible();
    expect(pageErrors).toEqual([]);
  });
});
