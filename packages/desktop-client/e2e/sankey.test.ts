import { type Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { ConfigurationPage } from './page-models/configuration-page';
import { Navigation } from './page-models/navigation';
import { type ReportsPage } from './page-models/reports-page';
import { type SankeyPage } from './page-models/sankey-page';
import { SettingsPage } from './page-models/settings-page';

test.describe('Sankey Report', () => {
  let page: Page;
  let navigation: Navigation;
  let reportsPage: ReportsPage;
  let sankeyPage: SankeyPage;
  let configurationPage: ConfigurationPage;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    navigation = new Navigation(page);
    configurationPage = new ConfigurationPage(page);

    await page.goto('/');
    await configurationPage.createTestFile();
  });

  test.afterEach(async () => {
    if (page) {
      await page.close();
    }
  });

  test('loads sankey report and checks budgeted view', async () => {
    reportsPage = await navigation.goToReportsPage();
    sankeyPage = await reportsPage.goToSankeyPage();
    await sankeyPage.waitToLoad();

    // Should be in budgeted mode by default
    await expect(page).toMatchThemeScreenshots();
  });

  test('switches to spent view and checks visuals', async () => {
    reportsPage = await navigation.goToReportsPage();
    sankeyPage = await reportsPage.goToSankeyPage();
    await sankeyPage.waitToLoad();

    await sankeyPage.selectMode('spent');
    await expect(page).toMatchThemeScreenshots();
  });

  test('switches to difference view and checks visuals', async () => {
    reportsPage = await navigation.goToReportsPage();
    sankeyPage = await reportsPage.goToSankeyPage();
    await sankeyPage.waitToLoad();

    await sankeyPage.selectMode('difference');
    await expect(page).toMatchThemeScreenshots();
  });

  test('changes month and verifies graph updates', async () => {
    reportsPage = await navigation.goToReportsPage();
    sankeyPage = await reportsPage.goToSankeyPage();
    await sankeyPage.waitToLoad();

    // Get the month select and choose a different month
    const monthOptions = await sankeyPage.monthSelect.locator('option').count();
    
    // If there are multiple months available, select the second one
    if (monthOptions > 1) {
      const secondMonthValue = await sankeyPage.monthSelect
        .locator('option')
        .nth(1)
        .getAttribute('value');
      
      if (secondMonthValue) {
        await sankeyPage.selectMonth(secondMonthValue);
        await expect(page).toMatchThemeScreenshots();
      }
    }
  });

  test('verifies all three modes work correctly', async () => {
    reportsPage = await navigation.goToReportsPage();
    sankeyPage = await reportsPage.goToSankeyPage();
    await sankeyPage.waitToLoad();

    // Test budgeted mode
    await sankeyPage.selectMode('budgeted');
    await expect(sankeyPage.budgetedButton).toBeVisible();

    // Test spent mode
    await sankeyPage.selectMode('spent');
    await expect(sankeyPage.spentButton).toBeVisible();

    // Test difference mode
    await sankeyPage.selectMode('difference');
    await expect(sankeyPage.differenceButton).toBeVisible();

    await expect(page).toMatchThemeScreenshots();
  });
});

