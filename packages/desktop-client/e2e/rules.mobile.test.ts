import { type Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { ConfigurationPage } from './page-models/configuration-page';
import { MobileNavigation } from './page-models/mobile-navigation';
import { type MobileRulesPage } from './page-models/mobile-rules-page';

test.describe('Mobile Rules', () => {
  let page: Page;
  let navigation: MobileNavigation;
  let rulesPage: MobileRulesPage;
  let configurationPage: ConfigurationPage;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    navigation = new MobileNavigation(page);
    configurationPage = new ConfigurationPage(page);

    // Set mobile viewport
    await page.setViewportSize({
      width: 350,
      height: 600,
    });

    await page.goto('/');
    await configurationPage.createTestFile();

    // Navigate to rules page and wait for it to load
    rulesPage = await navigation.goToRulesPage();
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('displays the rules page with proper header and search bar', async () => {
    // Check that the header is present
    await expect(page.getByRole('heading', { name: 'Rules' })).toBeVisible();

    // Check that the add button is present
    await expect(rulesPage.addButton).toBeVisible();

    // Check that the search box is present with proper placeholder
    await expect(rulesPage.searchBox).toBeVisible();
    await expect(rulesPage.searchBox).toHaveAttribute(
      'placeholder',
      'Filter rules…',
    );

    await expect(page).toMatchThemeScreenshots();
  });

  test('displays existing rules with proper structure', async () => {
    const ruleCount = await rulesPage.getRuleCount();
    expect(ruleCount).toBeGreaterThan(0);

    // Check first rule structure
    const firstRule = rulesPage.getNthRule(0);
    await expect(firstRule).toBeVisible();

    // Check that rule contains IF and THEN blocks
    await expect(firstRule).toContainText('IF');
    await expect(firstRule).toContainText('THEN');

    // Check that rule has stage badge (PRE, DEFAULT, or POST)
    const stage = await rulesPage.getRuleStage(0);
    expect(stage).toMatch(/PRE|DEFAULT|POST/);
  });

  test('search functionality filters rules correctly', async () => {
    const initialRuleCount = await rulesPage.getRuleCount();
    expect(initialRuleCount).toBeGreaterThan(0);

    // Search for a specific term
    await rulesPage.searchFor('Fast Internet');

    // Wait for search results
    await page.waitForTimeout(500);

    const filteredRuleCount = await rulesPage.getRuleCount();

    // Results should be filtered (could be 0 or less than initial)
    expect(filteredRuleCount).toBeLessThanOrEqual(initialRuleCount);
    await expect(page).toMatchThemeScreenshots();

    // Clear search and verify all rules return
    await rulesPage.clearSearch();
    await page.waitForTimeout(500);

    const clearedSearchRuleCount = await rulesPage.getRuleCount();
    expect(clearedSearchRuleCount).toBe(initialRuleCount);
  });

  test('clicking add button opens rule creation modal', async () => {
    await rulesPage.clickAddRule();

    // Check that edit rule modal is opened
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    await expect(page).toMatchThemeScreenshots();
  });

  test('clicking on a rule opens edit modal', async () => {
    const ruleCount = await rulesPage.getRuleCount();
    expect(ruleCount).toBeGreaterThan(0);

    await rulesPage.clickRule(0);

    // Check that edit rule modal is opened
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    await expect(page).toMatchThemeScreenshots();
  });

  test('page handles empty state gracefully', async () => {
    // Search for something that won't match to get empty state
    await rulesPage.searchFor('NonExistentRule123456789');
    await page.waitForTimeout(500);

    // Check that empty message is shown
    const emptyMessage = page.getByText(/No rules found/);
    await expect(emptyMessage).toBeVisible();

    // Check that no rule items are visible
    const rules = rulesPage.getAllRules();
    await expect(rules).toHaveCount(0);
    await expect(page).toMatchThemeScreenshots();
  });
});
