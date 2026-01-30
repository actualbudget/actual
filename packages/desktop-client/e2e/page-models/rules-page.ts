import type { Locator, Page } from '@playwright/test';

import { EditRuleModal } from './edit-rule-modal';

export class RulesPage {
  readonly page: Page;
  readonly searchBox: Locator;
  readonly createNewRuleButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchBox = page.getByPlaceholder('Filter rules...');
    this.createNewRuleButton = page.getByRole('button', {
      name: 'Create new rule',
    });
  }

  /**
   * Open the edit rule modal to create a new rule.
   */
  async createNewRule() {
    await this.createNewRuleButton.click();
    return new EditRuleModal(this.page.getByTestId('edit-rule-modal'));
  }

  /**
   * Retrieve the data for the nth-rule.
   * 0-based index
   */
  getNthRule(index: number) {
    const row = this.page.getByTestId('table').getByTestId('row').nth(index);

    return {
      conditions: row.getByTestId('conditions').locator(':scope > div'),
      actions: row.getByTestId('actions').locator(':scope > div'),
    };
  }

  async searchFor(text: string) {
    await this.searchBox.fill(text);
  }
}
