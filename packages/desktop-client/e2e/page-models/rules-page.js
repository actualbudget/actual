export class RulesPage {
  constructor(page) {
    this.page = page;
    this.searchBox = page.getByPlaceholder('Filter rules...');
  }

  /**
   * Create a new rule
   */
  async createRule(data) {
    await this.page
      .getByRole('button', {
        name: 'Create new rule',
      })
      .click();

    await this._fillRuleFields(data);

    await this.page.getByRole('button', { name: 'Save' }).click();
  }

  /**
   * Retrieve the data for the nth-rule.
   * 0-based index
   */
  getNthRule(index) {
    const row = this.page.getByTestId('table').getByTestId('row').nth(index);

    return {
      conditions: row.getByTestId('conditions').locator(':scope > div'),
      actions: row.getByTestId('actions').locator(':scope > div'),
    };
  }

  async searchFor(text) {
    await this.searchBox.fill(text);
  }

  async _fillRuleFields(data) {
    if (data.conditionsOp) {
      await this.page
        .getByTestId('conditions-op')
        .getByRole('button')
        .first()
        .click();
      await this.page
        .getByRole('button', { exact: true, name: data.conditionsOp })
        .click();
    }

    if (data.conditions) {
      await this._fillEditorFields(
        data.conditions,
        this.page.getByTestId('condition-list'),
        true,
      );
    }

    if (data.actions) {
      await this._fillEditorFields(
        data.actions,
        this.page.getByTestId('action-list'),
      );
    }

    if (data.splits) {
      let idx = data.actions?.length ?? 0;
      for (const splitActions of data.splits) {
        await this.page.getByTestId('add-split-transactions').click();
        await this._fillEditorFields(
          splitActions,
          this.page.getByTestId('action-list').nth(idx),
        );
        idx++;
      }
    }
  }

  async _fillEditorFields(data, rootElement, fieldFirst = false) {
    for (const idx in data) {
      const { field, op, value } = data[idx];

      const row = rootElement.getByTestId('editor-row').nth(idx);

      if (!(await row.isVisible())) {
        await rootElement.getByRole('button', { name: 'Add entry' }).click();
      }

      if (op && !fieldFirst) {
        await row.getByTestId('op-select').getByRole('button').first().click();
        await this.page.getByRole('button', { name: op, exact: true }).click();
      }

      if (field) {
        await row.getByTestId('field-select').getByRole('button').first().click();
        await this.page.getByRole('button', { name: field, exact: true }).click();
      }

      if (op && fieldFirst) {
        await row.getByTestId('op-select').getByRole('button').first().click();
        await this.page.getByRole('button', { name: op, exact: true }).click();
      }

      if (value) {
        await row.getByRole('textbox').fill(value);
        await this.page.keyboard.press('Enter');
      }
    }
  }
}
