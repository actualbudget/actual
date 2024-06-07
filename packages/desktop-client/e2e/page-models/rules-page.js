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
        .getByRole('option', { exact: true, name: data.conditionsOp })
        .click();
    }

    if (data.conditions) {
      await this._fillEditorFields(
        data.conditions,
        this.page.getByTestId('condition-list'),
      );
    }

    if (data.actions) {
      await this._fillEditorFields(
        data.actions,
        this.page.getByTestId('action-list'),
      );
    }

    if (data.splits) {
      if (data.splits.beforeSplitActions) {
        await this._fillEditorFields(
          data.splits.beforeSplitActions,
          this.page.getByTestId('action-list'),
        );
      }

      if (data.splits.splitActions) {
        let idx = data.splits?.beforeSplitActions.length ?? 0;
        for (const splitActions of data.splits.splitActions) {
          await this.page.getByTestId('add-split-transactions').click();
          await this._fillEditorFields(
            splitActions,
            this.page.getByTestId('action-list').nth(idx),
          );
          idx++;
        }
      }
    }
  }

  async _fillEditorFields(data, rootElement) {
    for (const idx in data) {
      const { field, op, value } = data[idx];

      const row = rootElement.getByTestId('editor-row').nth(idx);

      if (!(await row.isVisible())) {
        await rootElement.getByRole('button', { name: 'Add entry' }).click();
      }

      if (field) {
        await row.getByRole('button').first().click();
        await this.page
          .getByRole('option', { exact: true, name: field })
          .click();
      }

      if (op) {
        await row.getByRole('button', { name: 'is' }).click();
        await this.page.getByRole('option', { name: op, exact: true }).click();
      }

      if (value) {
        await row.getByRole('textbox').fill(value);
        await this.page.keyboard.press('Enter');
      }
    }
  }
}
