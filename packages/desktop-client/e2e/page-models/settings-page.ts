import type { Locator, Page } from '@playwright/test';

export class SettingsPage {
  readonly page: Page;
  readonly settings: Locator;
  readonly exportDataButton: Locator;
  readonly switchBudgetTypeButton: Locator;
  readonly showExperimentalToggle: Locator;
  readonly showExperimentalToggleLabel: Locator;
  readonly settingsNav: Locator;

  constructor(page: Page) {
    this.page = page;
    this.settings = page.getByTestId('settings');
    this.settingsNav = page.getByRole('navigation', { name: 'Settings' });
    this.exportDataButton = this.settings.getByRole('button', {
      name: 'Export data',
    });
    this.switchBudgetTypeButton = this.settings.getByRole('button', {
      name: /^Switch to (envelope|tracking) budgeting$/i,
    });
    // `Toggle` hides its checkbox behind a label, so it is out of the
    // accessibility tree: locate both by id rather than by role.
    this.showExperimentalToggle = page.locator('#settings-showExperimental');
    this.showExperimentalToggleLabel = page.locator(
      'label[for="settings-showExperimental"]',
    );
  }

  async waitFor(...options: Parameters<Locator['waitFor']>) {
    await this.settings.waitFor(...options);
  }

  /**
   * Settings sections each have their own page, reached from the settings nav.
   * Narrow layouts have no nav and keep every section on one page, so there is
   * nothing to click there.
   */
  async goToSection(name: 'General' | 'Advanced' | 'Experimental') {
    // Wait for the settings page itself before asking whether it has a nav —
    // callers reach here straight off a click, with nothing rendered yet.
    await this.settings.waitFor();
    if (await this.settingsNav.isVisible()) {
      await this.settingsNav.getByRole('link', { name, exact: true }).click();
      await this.settings.waitFor();
    }
  }

  async exportData() {
    await this.goToSection('General');
    await this.exportDataButton.click();
  }

  async useBudgetType(budgetType: 'Envelope' | 'Tracking') {
    await this.switchBudgetTypeButton.waitFor();

    const buttonText = await this.switchBudgetTypeButton.textContent();
    if (buttonText?.includes(budgetType.toLowerCase())) {
      await this.switchBudgetTypeButton.click();
    }
  }

  async enableExperimentalFeature(featureName: string) {
    // The feature flags live on their own page, revealed by a toggle on the
    // Advanced page.
    await this.goToSection('Advanced');
    await this.showExperimentalToggleLabel.waitFor({ state: 'visible' });
    if (!(await this.showExperimentalToggle.isChecked())) {
      await this.showExperimentalToggleLabel.click();
    }

    await this.goToSection('Experimental');

    const featureCheckbox = this.page.getByRole('checkbox', {
      name: featureName,
    });
    await featureCheckbox.waitFor({ state: 'visible' });
    if (!(await featureCheckbox.isChecked())) {
      await featureCheckbox.click();
    }
  }
}
