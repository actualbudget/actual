export class SettingsPage {
  constructor(page) {
    this.page = page;
  }

  async exportData() {
    await this.page.getByRole('button', { name: 'Export data' }).click();
  }

  async useBudgetType(budgetType) {
    await this.enableExperimentalFeature('Budget mode toggle');

    const switchBudgetTypeButton = this.page.getByRole('button', {
      name: `Switch to ${budgetType} budgeting`,
    });

    await switchBudgetTypeButton.click();
  }

  async enableExperimentalFeature(featureName) {
    const advancedSettingsButton = this.page.getByTestId('advanced-settings');
    await advancedSettingsButton.click();

    const experimentalSettingsButton = this.page.getByTestId(
      'experimental-settings',
    );
    await experimentalSettingsButton.click();

    const featureCheckbox = this.page.getByRole('checkbox', {
      name: featureName,
    });
    await featureCheckbox.click();
  }
}
