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
    if (await advancedSettingsButton.isVisible()) {
      await advancedSettingsButton.click();
    }

    const experimentalSettingsButton = this.page.getByTestId(
      'experimental-settings',
    );
    if (await experimentalSettingsButton.isVisible()) {
      await experimentalSettingsButton.click();
    }

    const featureCheckbox = this.page.getByRole('checkbox', {
      name: featureName,
    });
    if (!(await featureCheckbox.isChecked())) {
      await featureCheckbox.click();
    }
  }
}
