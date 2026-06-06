import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { ConfigurationPage } from './page-models/configuration-page';
import { MobileNavigation } from './page-models/mobile-navigation';

test.describe('Mobile budget automations', () => {
  let page: Page;
  let navigation: MobileNavigation;
  let configurationPage: ConfigurationPage;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    navigation = new MobileNavigation(page);
    configurationPage = new ConfigurationPage(page);

    await page.setViewportSize({ width: 350, height: 600 });
    await page.goto('/');
    await configurationPage.createTestFile();

    const settingsPage = await navigation.goToSettingsPage();
    await settingsPage.enableExperimentalFeature('Goal templates');
    const uiToggle = page.getByRole('checkbox', {
      name: 'Budget automations UI',
    });
    await uiToggle.waitFor({ state: 'visible' });
    if (!(await uiToggle.isChecked())) {
      await uiToggle.click();
    }
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('opens automations from the category menu and drills into the editor', async () => {
    const budgetPage = await navigation.goToBudgetPage();
    const categoryName = await budgetPage.getCategoryNameForRow(1);

    const categoryMenuModal = await budgetPage.openCategoryMenu(categoryName);
    const automationsModal = await categoryMenuModal.editAutomations();

    await expect(automationsModal.getByText(categoryName)).toBeVisible();
    const addAutomation = automationsModal.getByRole('button', {
      name: 'Add an automation',
    });
    await expect(addAutomation).toBeVisible();

    await expect(
      automationsModal.getByRole('button', { name: 'Cancel' }),
    ).toBeInViewport({ ratio: 1 });
    await expect(
      automationsModal.getByRole('button', { name: 'Save', exact: true }),
    ).toBeInViewport({ ratio: 1 });

    await expect(page).toMatchThemeScreenshots();

    await addAutomation.click();
    const backButton = automationsModal.getByRole('button', {
      name: 'Back',
      exact: true,
    });
    await expect(backButton).toBeVisible();
    await expect(automationsModal.getByText('Automation type')).toBeVisible();

    const fieldHeight = (selector: string) =>
      automationsModal
        .locator(selector)
        .evaluate(el => Math.round(el.getBoundingClientRect().height));

    // on mobile every field is the touch-friendly height and consistent
    await automationsModal.getByRole('button', { name: /% of income/ }).click();
    const percentHeight = await fieldHeight('#percent-field');
    expect(percentHeight).toBeGreaterThanOrEqual(36);
    expect(
      Math.abs((await fieldHeight('#category-field')) - percentHeight),
    ).toBeLessThanOrEqual(3);

    await automationsModal
      .getByRole('button', { name: /Save by date/ })
      .click();
    const amountHeight = await fieldHeight('#by-amount-field');
    expect(amountHeight).toBeGreaterThanOrEqual(36);
    expect(
      Math.abs((await fieldHeight('#by-month-field')) - amountHeight),
    ).toBeLessThanOrEqual(3);

    const viewport = page.viewportSize();
    const editorBox = await automationsModal.boundingBox();
    if (!viewport || !editorBox) {
      throw new Error('expected a visible modal and viewport');
    }
    expect(editorBox.height).toBeLessThanOrEqual(viewport.height + 1);
    await expect(backButton).toBeInViewport({ ratio: 1 });
    await expect(
      automationsModal.getByRole('button', { name: 'Save', exact: true }),
    ).toHaveCount(0);
    await expect(page).toMatchThemeScreenshots();

    await backButton.click();
    await expect(addAutomation).toBeVisible();
    await expect(
      automationsModal.getByRole('button', { name: 'Save', exact: true }),
    ).toBeInViewport({ ratio: 1 });

    await automationsModal.getByRole('button', { name: 'Cancel' }).click();
    await expect(automationsModal).toBeHidden();
  });
});
