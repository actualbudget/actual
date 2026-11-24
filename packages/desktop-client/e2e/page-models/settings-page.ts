import type { Locator, Page } from '@playwright/test';

type SettingsSection =
  | 'General'
  | 'Payees'
  | 'Rules'
  | 'Bank Sync'
  | 'Tags'
  | 'Advanced'
  | 'Experimental';

export class SettingsPage {
  readonly page: Page;
  readonly settings: Locator;
  readonly settingsNav: Locator;
  readonly backButton: Locator;
  readonly exportDataButton: Locator;
  readonly switchBudgetTypeButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.settings = page.getByTestId('settings');
    this.settingsNav = page.getByRole('navigation', { name: 'Settings' });
    this.backButton = page.getByRole('button', { name: 'Back' });
    this.exportDataButton = this.settings.getByRole('button', {
      name: 'Export data',
    });
    this.switchBudgetTypeButton = this.settings.getByRole('button', {
      name: /^Switch to (envelope|tracking) budgeting$/i,
    });
  }

  async waitFor(...options: Parameters<Locator['waitFor']>) {
    await this.settings.waitFor(...options);
  }

  async goToSection(name: SettingsSection) {
    const sectionLink = this.settingsNav.getByRole('link', {
      name,
      exact: true,
    });

    // Narrow layouts only show the settings nav on the settings landing page
    const viewport = this.page.viewportSize();
    const isNarrow = viewport != null && viewport.width < 512;
    if (isNarrow && !(await sectionLink.isVisible())) {
      await this.backButton.click();
    }

    await sectionLink.click();
  }

  async exportData() {
    await this.goToSection('General');
    await this.exportDataButton.click();
  }

  async useBudgetType(budgetType: 'Envelope' | 'Tracking') {
    await this.goToSection('General');
    await this.switchBudgetTypeButton.waitFor();

    const buttonText = await this.switchBudgetTypeButton.textContent();
    if (buttonText?.includes(budgetType.toLowerCase())) {
      await this.switchBudgetTypeButton.click();
    }
  }

  async enableExperimentalFeature(featureName: string) {
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
