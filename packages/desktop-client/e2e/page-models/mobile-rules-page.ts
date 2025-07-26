import { type Locator, type Page } from '@playwright/test';

export class MobileRulesPage {
  readonly page: Page;
  readonly searchBox: Locator;
  readonly addButton: Locator;
  readonly rulesList: Locator;
  readonly emptyMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchBox = page.getByPlaceholder('Filter rules…');
    this.addButton = page.getByRole('button', { name: 'Add new rule' });
    this.rulesList = page.getByRole('main');
    this.emptyMessage = page.getByText('No rules found');
  }

  async waitFor(options?: {
    state?: 'attached' | 'detached' | 'visible' | 'hidden';
    timeout?: number;
  }) {
    await this.rulesList.waitFor(options);
  }

  /**
   * Search for rules using the search box
   */
  async searchFor(text: string) {
    await this.searchBox.fill(text);
  }

  /**
   * Clear the search box
   */
  async clearSearch() {
    await this.searchBox.fill('');
  }

  /**
   * Get the nth rule item (0-based index)
   */
  getNthRule(index: number) {
    return this.page
      .getByRole('button')
      .filter({ hasText: /IF|THEN/ })
      .nth(index);
  }

  /**
   * Get all visible rule items
   */
  getAllRules() {
    return this.page.getByRole('button').filter({ hasText: /IF|THEN/ });
  }

  /**
   * Click on a rule to edit it
   */
  async clickRule(index: number) {
    const rule = this.getNthRule(index);
    await rule.click();
  }

  /**
   * Click the add button to create a new rule
   */
  async clickAddRule() {
    await this.addButton.click();
  }

  /**
   * Get the number of visible rules
   */
  async getRuleCount() {
    const rules = this.getAllRules();
    return await rules.count();
  }

  /**
   * Check if the search bar has a border
   */
  async hasSearchBarBorder() {
    const searchContainer = this.searchBox.locator('..');
    const borderStyle = await searchContainer.evaluate(el => {
      const style = window.getComputedStyle(el);
      return style.borderBottomWidth;
    });
    return borderStyle === '2px';
  }

  /**
   * Get the background color of the search box
   */
  async getSearchBackgroundColor() {
    return await this.searchBox.evaluate(el => {
      const style = window.getComputedStyle(el);
      return style.backgroundColor;
    });
  }

  /**
   * Check if a rule contains specific text
   */
  async ruleContainsText(index: number, text: string) {
    const rule = this.getNthRule(index);
    const ruleText = await rule.textContent();
    return ruleText?.includes(text) || false;
  }

  /**
   * Get the stage badge text for a rule (PRE/DEFAULT/POST)
   */
  async getRuleStage(index: number) {
    const rule = this.getNthRule(index);
    const stageBadge = rule.locator('span').first();
    return await stageBadge.textContent();
  }
}
