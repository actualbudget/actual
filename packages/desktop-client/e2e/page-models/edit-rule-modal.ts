import type { Locator, Page } from '@playwright/test';

type ConditionsEntry = {
  field: string;
  op: string;
  value: string;
};

type ActionsEntry = {
  field: string;
  op?: string;
  value: string;
};

type SplitsEntry = {
  field: string;
  op?: string;
  value?: string;
};

type RuleEntry = {
  conditionsOp?: string | RegExp;
  conditions?: ConditionsEntry[];
  actions?: ActionsEntry[];
  splits?: Array<SplitsEntry[]>;
};

export class EditRuleModal {
  readonly page: Page;
  readonly locator: Locator;
  readonly heading: Locator;
  readonly conditionsOpButton: Locator;
  readonly conditionList: Locator;
  readonly actionList: Locator;
  readonly splitIntoMultipleTransactionsButton: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;

  constructor(locator: Locator) {
    this.locator = locator;
    this.page = locator.page();

    this.heading = locator.getByRole('heading');
    this.conditionsOpButton = locator
      .getByTestId('conditions-op')
      .getByRole('button');
    this.conditionList = locator.getByTestId('condition-list');
    this.actionList = locator.getByTestId('action-list');
    this.splitIntoMultipleTransactionsButton = locator.getByTestId(
      'add-split-transactions',
    );
    this.saveButton = locator.getByRole('button', { name: 'Save' });
    this.cancelButton = locator.getByRole('button', { name: 'Cancel' });
  }

  async fill(data: RuleEntry) {
    if (data.conditionsOp) {
      await this.selectConditionsOp(data.conditionsOp);
    }

    if (data.conditions) {
      await this.fillEditorFields(data.conditions, this.conditionList, true);
    }

    if (data.actions) {
      await this.fillEditorFields(data.actions, this.actionList);
    }

    if (data.splits) {
      let idx = data.actions?.length ?? 0;
      for (const splitActions of data.splits) {
        await this.splitIntoMultipleTransactionsButton.click();
        await this.fillEditorFields(splitActions, this.actionList.nth(idx));
        idx++;
      }
    }
  }

  async fillEditorFields(
    data: Array<ConditionsEntry | ActionsEntry | SplitsEntry>,
    rootElement: Locator,
    fieldFirst = false,
  ) {
    for (const [idx, entry] of data.entries()) {
      const { field, op, value } = entry;

      const row = await this.getRow(rootElement, idx);

      if (!(await row.isVisible())) {
        await this.addEntry(rootElement);
      }

      if (op && !fieldFirst) {
        await this.selectOp(row, op);
      }

      if (field) {
        await this.selectField(row, field);
      }

      if (op && fieldFirst) {
        await this.selectOp(row, op);
      }

      if (value && value.length > 0) {
        const input = row.getByRole('textbox');
        const existingValue = await input.inputValue();
        if (existingValue) {
          await input.selectText();
        }
        // Using pressSequentially here to simulate user typing.
        // When using .fill(...), playwright just "pastes" the entire word onto the input
        // and for some reason this breaks the autocomplete highlighting logic
        // e.g. "Create payee" option is not being highlighted.
        await input.pressSequentially(value);
        await this.page.keyboard.press('Enter');
      }
    }
  }

  async selectConditionsOp(conditionsOp: string | RegExp) {
    await this.conditionsOpButton.click();

    const conditionsOpSelectOption =
      await this.getPopoverSelectOption(conditionsOp);
    await conditionsOpSelectOption.click();
  }

  async selectOp(row: Locator, op: string) {
    await row.getByTestId('op-select').getByRole('button').click();

    const opSelectOption = await this.getPopoverSelectOption(op);
    await opSelectOption.waitFor({ state: 'visible' });
    await opSelectOption.click();
  }

  async selectField(row: Locator, field: string) {
    await row.getByTestId('field-select').getByRole('button').click();

    const fieldSelectOption = await this.getPopoverSelectOption(field);
    await fieldSelectOption.waitFor({ state: 'visible' });
    await fieldSelectOption.click();
  }

  async getRow(locator: Locator, index: number) {
    return locator.getByTestId('editor-row').nth(index);
  }

  async addEntry(locator: Locator) {
    await locator.getByRole('button', { name: 'Add entry' }).click();
  }

  async getPopoverSelectOption(value: string | RegExp) {
    // Need to use page because popover is rendered outside of modal locator
    return this.page
      .locator('[data-popover]')
      .getByRole('button', { name: value, exact: true });
  }

  async save() {
    await this.saveButton.click();
  }

  async cancel() {
    await this.cancelButton.click();
  }

  async close() {
    await this.heading.getByRole('button', { name: 'Close' }).click();
  }
}
