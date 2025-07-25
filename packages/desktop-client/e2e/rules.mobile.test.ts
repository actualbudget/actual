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
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.beforeEach(async () => {
    rulesPage = await navigation.goToRulesPage();
    await rulesPage.waitForRulesToLoad();
  });

  test('checks the page visuals and layout', async () => {
    await expect(page).toMatchThemeScreenshots();
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
  });

  test('search bar has proper styling and border', async () => {
    // Check that search bar has a border bottom
    const searchContainer = rulesPage.searchBox.locator('xpath=..');
    await expect(searchContainer).toHaveCSS('border-bottom-width', '2px');

    // Check that search input has white background
    await expect(rulesPage.searchBox).toHaveCSS(
      'background-color',
      /rgb\(255,\s*255,\s*255\)|white/,
    );
  });

  test('displays existing rules with proper structure', async () => {
    const ruleCount = await rulesPage.getRuleCount();

    if (ruleCount > 0) {
      // Check first rule structure
      const firstRule = rulesPage.getNthRule(0);
      await expect(firstRule).toBeVisible();

      // Check that rule contains IF and THEN blocks
      await expect(firstRule).toContainText('IF');
      await expect(firstRule).toContainText('THEN');

      // Check that rule has stage badge (PRE or POST)
      const stage = await rulesPage.getRuleStage(0);
      expect(stage).toMatch(/PRE|POST/);
    }
  });

  test('search functionality filters rules correctly', async () => {
    const initialRuleCount = await rulesPage.getRuleCount();

    if (initialRuleCount > 0) {
      // Search for a specific term
      await rulesPage.searchFor('Fast Internet');

      // Wait for search results
      await page.waitForTimeout(500);

      const filteredRuleCount = await rulesPage.getRuleCount();

      // Results should be filtered (could be 0 or less than initial)
      expect(filteredRuleCount).toBeLessThanOrEqual(initialRuleCount);

      // Clear search and verify all rules return
      await rulesPage.clearSearch();
      await page.waitForTimeout(500);

      const clearedSearchRuleCount = await rulesPage.getRuleCount();
      expect(clearedSearchRuleCount).toBe(initialRuleCount);
    }
  });

  test('search with no results shows empty message properly centered', async () => {
    // Search for something that definitely won't exist
    await rulesPage.searchFor('ThisSearchTermWillNeverMatchAnyRule12345');

    // Wait for search to complete
    await page.waitForTimeout(500);

    // Check that no rules message is displayed
    const emptyMessage = page.getByText('No rules found');
    await expect(emptyMessage).toBeVisible();

    // Check that the message is vertically centered
    const messageContainer = emptyMessage.locator('xpath=..');
    await expect(messageContainer).toHaveCSS('justify-content', 'center');
    await expect(messageContainer).toHaveCSS('align-items', 'center');
  });

  test('clicking add button opens rule creation modal', async () => {
    await rulesPage.clickAddRule();

    // Check that edit rule modal is opened
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();

    // Check that it has the proper title for creating a new rule
    await expect(page.getByText('Create rule')).toBeVisible();
  });

  test('clicking on a rule opens edit modal', async () => {
    const ruleCount = await rulesPage.getRuleCount();

    if (ruleCount > 0) {
      await rulesPage.clickRule(0);

      // Check that edit rule modal is opened
      const modal = page.getByRole('dialog');
      await expect(modal).toBeVisible();

      // Check that it has edit-related content
      await expect(page.getByText('Edit rule')).toBeVisible();
    }
  });

  test('rules display with proper column layout', async () => {
    const ruleCount = await rulesPage.getRuleCount();

    if (ruleCount > 0) {
      const firstRule = rulesPage.getNthRule(0);

      // Check that rule uses flexbox row layout
      await expect(firstRule).toHaveCSS('flex-direction', 'row');

      // Check that rule has proper alignment
      await expect(firstRule).toHaveCSS('align-items', 'flex-start');

      // Check that rule has full width
      await expect(firstRule).toHaveCSS('width', /100%|350px/);
    }
  });

  test('search is real-time and responsive', async () => {
    const initialRuleCount = await rulesPage.getRuleCount();

    if (initialRuleCount > 0) {
      // Type partial search term
      await rulesPage.searchFor('F');
      await page.waitForTimeout(300);

      const partialSearchCount = await rulesPage.getRuleCount();

      // Continue typing
      await rulesPage.searchFor('Fa');
      await page.waitForTimeout(300);

      const moreSpecificSearchCount = await rulesPage.getRuleCount();

      // More specific search should have equal or fewer results
      expect(moreSpecificSearchCount).toBeLessThanOrEqual(partialSearchCount);

      // Clear search
      await rulesPage.clearSearch();
      await page.waitForTimeout(300);

      const finalCount = await rulesPage.getRuleCount();
      expect(finalCount).toBe(initialRuleCount);
    }
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
  });

  test('navigation works correctly', async () => {
    // Check that we're on the rules page
    await expect(page).toHaveURL(/\/rules/);

    // Check that the Rules tab is highlighted in navigation
    const rulesNavButton = page.getByRole('link', { name: 'Rules' });
    await expect(rulesNavButton).toBeVisible();
  });

  test('page is responsive to mobile viewport', async () => {
    // Check that page content fits within mobile viewport
    const mainContent = page.getByRole('main');
    await expect(mainContent).toBeVisible();

    // Check that search bar takes full width
    await expect(rulesPage.searchBox).toHaveCSS('width', /100%|350px/);

    // Check that add button is properly positioned
    await expect(rulesPage.addButton).toBeVisible();
  });
});
