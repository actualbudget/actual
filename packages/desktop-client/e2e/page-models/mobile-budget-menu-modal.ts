import { expect, type Locator, type Page } from '@playwright/test';

export class BudgetMenuModal {
  readonly page: Page;
  readonly locator: Locator;
  readonly heading: Locator;
  readonly budgetAmountInput: Locator;
  readonly budgetAmountDisplayButton: Locator;
  readonly copyLastMonthBudgetButton: Locator;
  readonly setTo3MonthAverageButton: Locator;
  readonly setTo6MonthAverageButton: Locator;
  readonly setToYearlyAverageButton: Locator;
  readonly applyBudgetTemplateButton: Locator;
  readonly moneyKeypadModal: Locator;

  constructor(locator: Locator) {
    this.locator = locator;
    this.page = locator.page();

    this.heading = locator.getByRole('heading');
    this.budgetAmountInput = locator.getByTestId('amount-input');
    this.budgetAmountDisplayButton = locator.getByTestId('amount-display');
    this.copyLastMonthBudgetButton = locator.getByRole('button', {
      name: "Copy last month's budget",
    });
    this.setTo3MonthAverageButton = locator.getByRole('button', {
      name: 'Set to 3 month average',
    });
    this.setTo6MonthAverageButton = locator.getByRole('button', {
      name: 'Set to 6 month average',
    });
    this.setToYearlyAverageButton = locator.getByRole('button', {
      name: 'Set to yearly average',
    });
    this.applyBudgetTemplateButton = locator.getByRole('button', {
      name: 'Overwrite with template',
    });

    this.moneyKeypadModal = this.page.getByTestId('money-keypad-modal');
  }

  private async dismissKeypadIfOpen() {
    if (await this.moneyKeypadModal.isVisible()) {
      await this.moneyKeypadModal
        .getByRole('button', { name: 'Close' })
        .click();
      await expect(this.moneyKeypadModal).toHaveCount(0);
    }
  }

  private async openAmountKeypad() {
    if (await this.moneyKeypadModal.isVisible()) {
      return;
    }

    if (await this.budgetAmountDisplayButton.isVisible()) {
      await this.budgetAmountDisplayButton.click();
    } else {
      await this.budgetAmountInput.dispatchEvent('pointerdown');
      await this.budgetAmountInput.focus();
    }

    await expect(this.moneyKeypadModal).toBeVisible();
  }

  private formatDigitStringAsCurrencyText(amount: string) {
    const digits = amount.replace(/\D/g, '');
    if (digits === '') {
      return '0';
    }
    if (digits.length <= 2) {
      return `0.${digits.padStart(2, '0')}`;
    }
    return `${digits.slice(0, -2)}.${digits.slice(-2)}`;
  }

  private async enterAmountWithKeypad(amount: string) {
    await this.openAmountKeypad();

    const keypadInput = this.moneyKeypadModal.getByRole('textbox', {
      name: 'Calculator input',
    });
    await keypadInput.fill(this.formatDigitStringAsCurrencyText(amount));

    await this.moneyKeypadModal.getByRole('button', { name: 'Done' }).click();
    await expect(this.moneyKeypadModal).toHaveCount(0);
  }

  async close() {
    await this.dismissKeypadIfOpen();
    await this.heading.getByRole('button', { name: 'Close' }).click();
  }

  async setBudgetAmount(newAmount: string) {
    await this.enterAmountWithKeypad(newAmount);
    await this.close();
  }

  async copyLastMonthBudget() {
    await this.dismissKeypadIfOpen();
    await this.copyLastMonthBudgetButton.click();
  }

  async setTo3MonthAverage() {
    await this.dismissKeypadIfOpen();
    await this.setTo3MonthAverageButton.click();
  }

  async setTo6MonthAverage() {
    await this.dismissKeypadIfOpen();
    await this.setTo6MonthAverageButton.click();
  }

  async setToYearlyAverage() {
    await this.dismissKeypadIfOpen();
    await this.setToYearlyAverageButton.click();
  }

  async applyBudgetTemplate() {
    await this.dismissKeypadIfOpen();
    await this.applyBudgetTemplateButton.click();
  }
}
