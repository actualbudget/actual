import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { ConfigurationPage } from './page-models/configuration-page';
import type { CustomReportPage } from './page-models/custom-report-page';
import { Navigation } from './page-models/navigation';
import type { ReportsPage } from './page-models/reports-page';

test.describe.parallel('Reports', () => {
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

  test('loads net worth graph and checks visuals', async () => {
    await reportsPage.goToNetWorthPage();
    await expect(page).toMatchThemeScreenshots();
  });

  test('loads cash flow graph and checks visuals', async () => {
    await reportsPage.goToCashFlowPage();
    await expect(page).toMatchThemeScreenshots();
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
  });

  test.describe.parallel('custom reports', () => {
    let customReportPage: CustomReportPage;

    test.beforeEach(async () => {
      customReportPage = await reportsPage.goToCustomReportPage();
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

  test('navigates to Net Worth report and back to reports dashboard', async () => {
    console.log('[reports] navigating to Net Worth report');
    await reportsPage.goToNetWorthPage();

    await expect(
      reportsPage.pageContent.getByText('How is net worth calculated?'),
    ).toBeVisible();
    console.log(
      '[reports] Net Worth page loaded — "How is net worth calculated?" section visible',
    );

    await navigation.goToReportsPage();
    await reportsPage.waitToLoad();
    console.log(
      '[reports] navigated back to reports dashboard — page content visible',
    );

    await expect(reportsPage.pageContent).toBeVisible();
  });

  test.describe.parallel('custom reports – mode and viz', () => {
    let localCustomReportPage: CustomReportPage;

    test.beforeEach(async () => {
      localCustomReportPage = await reportsPage.goToCustomReportPage();
    });

    test('switching between Total and Time mode changes available viz options', async () => {
      await localCustomReportPage.selectMode('total');
      console.log(
        '[reports] switched to Total mode — Bar Graph option should be visible',
      );
      await expect(
        localCustomReportPage.pageContent.getByRole('button', {
          name: 'Bar Graph',
        }),
      ).toBeVisible();

      await localCustomReportPage.selectMode('time');
      console.log(
        '[reports] switched to Time mode — Stacked Bar Graph option should now appear',
      );
      await expect(
        localCustomReportPage.pageContent.getByRole('button', {
          name: 'Stacked Bar Graph',
        }),
      ).toBeVisible();
    });

    test('selecting Line Graph keeps the report page and controls visible', async () => {
      await localCustomReportPage.selectMode('time');
      await localCustomReportPage.selectViz('Line Graph');
      console.log(
        '[reports] selected Time mode + Line Graph — verifying page and controls remain visible',
      );

      await expect(localCustomReportPage.pageContent).toBeVisible();
      await expect(
        localCustomReportPage.pageContent.getByRole('button', {
          name: 'Line Graph',
        }),
      ).toBeVisible();
      await expect(localCustomReportPage.showLegendButton).toBeVisible();
      await expect(localCustomReportPage.showSummaryButton).toBeVisible();
      console.log(
        '[reports] page content, Line Graph button, legend and summary controls all visible',
      );
    });
  });
});
