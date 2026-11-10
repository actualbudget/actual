import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { ConfigurationPage } from './page-models/configuration-page';
import { MobileNavigation } from './page-models/mobile-navigation';
import type { MobileTagsPage } from './page-models/mobile-tags-page';

test.describe('Mobile Tags', () => {
  let page: Page;
  let navigation: MobileNavigation;
  let tagsPage: MobileTagsPage;
  let configurationPage: ConfigurationPage;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    navigation = new MobileNavigation(page);
    configurationPage = new ConfigurationPage(page);

    await page.setViewportSize({
      width: 350,
      height: 600,
    });

    await page.goto('/');
    await configurationPage.createTestFile();

    tagsPage = await navigation.goToTagsPage();
  });

  test.afterEach(async () => {
    await page?.close();
  });

  test('shows the mobile page', async () => {
    await expect(tagsPage.heading).toBeVisible();
    await expect(tagsPage.searchBox).toBeVisible();
    await expect(tagsPage.addButton).toBeVisible();
    await expect(page.getByRole('button', { name: 'Back' })).toBeVisible();

    const row = tagsPage.getTag('clothing');
    await expect(row).toBeVisible();
    await expect(row).toContainText('Apparel purchases');

    const rowBox = await row.boundingBox();
    expect(rowBox?.height).toBeGreaterThanOrEqual(44);
  });

  test('creates a tag from a filter, clears the filter and can undo', async () => {
    await tagsPage.searchFor('aa road');
    await expect(tagsPage.noMatchesMessage).toBeVisible();
    await tagsPage.addButton.click();

    await expect(page).toHaveURL(/\/tags\/new/);
    await expect(page.getByRole('heading', { name: 'New tag' })).toBeVisible();
    await expect(tagsPage.nameInput).toBeFocused();
    await expect(tagsPage.nameInput).toHaveValue('aa-road');

    await tagsPage.nameInput.pressSequentially(' #trip');
    await expect(tagsPage.nameInput).toHaveValue('aa-road-trip');
    await tagsPage.descriptionInput.fill('Summer holiday');
    await tagsPage.pickColor('#1976D2');
    await expect(
      page.getByRole('button', { name: 'Color, #1976D2' }),
    ).toBeVisible();
    await tagsPage.saveButton.click();

    await expect(page).toHaveURL(/\/settings\/tags$/);
    await expect(tagsPage.searchBox).toHaveValue('');
    await expect(
      tagsPage.getToast('Tag "#aa-road-trip" created'),
    ).toBeVisible();
    const row = tagsPage.getTag('aa-road-trip');
    await expect(row).toBeVisible();
    await expect(row).toContainText('Summer holiday');
    await expect(row.getByText('#aa-road-trip')).toHaveCSS(
      'background-color',
      'rgb(25, 118, 210)',
    );

    await tagsPage.undoFromToast('Tag "#aa-road-trip" created');

    await expect(tagsPage.getTag('aa-road-trip')).toHaveCount(0);
    await expect(page).toHaveURL(/\/settings\/tags$/);
  });

  test('picks, types and resets a color in the color sheet', async () => {
    await tagsPage.getTag('clothing').click();
    await expect(page.getByRole('heading', { name: 'Edit tag' })).toBeVisible();

    await tagsPage.colorButton.click();
    await expect(tagsPage.colorSheet).toBeVisible();
    await expect(tagsPage.colorSheet.getByText('#clothing')).toBeVisible();
    await expect(tagsPage.hexInput).not.toBeFocused();
    const swatch = tagsPage.colorSheet.getByRole('button', { name: '#388E3C' });
    const swatchBox = await swatch.boundingBox();
    expect(swatchBox?.width).toBeGreaterThanOrEqual(44);
    expect(swatchBox?.height).toBeGreaterThanOrEqual(44);
    await swatch.click();
    await expect(tagsPage.colorSheet).toBeHidden();
    await expect(
      page.getByRole('button', { name: 'Color, #388E3C' }),
    ).toBeVisible();

    await tagsPage.typeHexColor('#12abef');
    await expect(
      page.getByRole('button', { name: 'Color, #12ABEF' }),
    ).toBeVisible();

    await tagsPage.resetColor();
    await expect(
      page.getByRole('button', { name: 'Color, theme default' }),
    ).toBeVisible();

    await tagsPage.colorButton.click();
    await expect(
      tagsPage.colorSheet.getByRole('button', { pressed: true }),
    ).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(tagsPage.colorSheet).toBeHidden();

    await tagsPage.saveButton.click();
    await expect(tagsPage.getToast('Tag "#clothing" saved')).toBeVisible();
    await expect(
      tagsPage.getTag('clothing').getByText('#clothing'),
    ).not.toHaveCSS('background-color', 'rgb(18, 171, 239)');
  });

  test('filters tags and keeps the filter after editing', async () => {
    await tagsPage.createTag({ name: 'aa-holiday', description: 'Time away' });

    await tagsPage.searchFor('nonsense');
    await expect(tagsPage.noMatchesMessage).toBeVisible();
    await expect(tagsPage.getAllTags()).toHaveCount(0);

    await tagsPage.searchFor('away');
    await expect(tagsPage.getAllTags()).toHaveCount(1);
    await expect(tagsPage.getTag('aa-holiday')).toBeVisible();

    await tagsPage.getTag('aa-holiday').click();
    await expect(page.getByRole('heading', { name: 'Edit tag' })).toBeVisible();
    await expect(tagsPage.nameInput).toHaveValue('aa-holiday');

    await tagsPage.nameInput.fill('groceries');
    await expect(
      page.getByText('A tag with this name already exists.'),
    ).toBeVisible();
    await expect(tagsPage.nameInput).toHaveAttribute('aria-invalid', 'true');
    await expect(tagsPage.saveButton).toBeDisabled();

    await tagsPage.nameInput.fill('aa vacation');
    await expect(tagsPage.nameInput).toHaveValue('aa-vacation');
    await tagsPage.saveButton.click();

    await expect(tagsPage.searchBox).toHaveValue('away');
    await expect(tagsPage.getTag('aa-vacation')).toBeVisible();
    await expect(tagsPage.getAllTags()).toHaveCount(1);
  });

  test('undoes an edit that renamed and recolored a tag and stays on the list', async () => {
    await tagsPage.createTag({ name: 'aa-holiday' });

    await tagsPage.getTag('aa-holiday').click();
    await tagsPage.nameInput.fill('aa-vacation');
    await tagsPage.pickColor('#388E3C');
    await tagsPage.saveButton.click();

    await expect(
      tagsPage.getTag('aa-vacation').getByText('#aa-vacation'),
    ).toHaveCSS('background-color', 'rgb(56, 142, 60)');

    await tagsPage.undoFromToast('Tag "#aa-vacation" saved');

    const restored = tagsPage.getTag('aa-holiday');
    await expect(restored).toBeVisible();
    await expect(restored.getByText('#aa-holiday')).not.toHaveCSS(
      'background-color',
      'rgb(56, 142, 60)',
    );
    await expect(tagsPage.getTag('aa-vacation')).toHaveCount(0);
    await expect(page).toHaveURL(/\/settings\/tags$/);
  });

  test('deletes a tag from its swipe actions and restores it with undo', async () => {
    await tagsPage.swipeToRevealActions('clothing');

    const row = tagsPage.getTag('clothing');
    const deleteButton = row.getByRole('button', { name: 'Delete' });
    const viewButton = row.getByRole('button', { name: 'View transactions' });
    await expect(viewButton).toHaveText('Transactions');
    const deleteBox = await deleteButton.boundingBox();
    const viewBox = await viewButton.boundingBox();
    expect(
      Math.round((deleteBox?.width ?? 0) + (viewBox?.width ?? 0)),
    ).toBeLessThanOrEqual(160);

    await deleteButton.click();

    await expect(tagsPage.getTag('clothing')).toHaveCount(0);

    await tagsPage.undoFromToast('Tag "#clothing" deleted');

    await expect(tagsPage.getTag('clothing')).toBeVisible();
  });

  test('shows an undo toast for each of two quick swipe deletes', async () => {
    await tagsPage.swipeToRevealActions('clothing');
    await tagsPage.swipeToRevealActions('dining-out');
    await tagsPage
      .getTag('clothing')
      .getByRole('button', { name: 'Delete' })
      .click();
    await tagsPage
      .getTag('dining-out')
      .getByRole('button', { name: 'Delete' })
      .click();

    await expect(tagsPage.getToast('Tag "#clothing" deleted')).toBeVisible();
    await expect(tagsPage.getToast('Tag "#dining-out" deleted')).toBeVisible();
    await expect(tagsPage.getTag('clothing')).toHaveCount(0);
    await expect(tagsPage.getTag('dining-out')).toHaveCount(0);
  });

  test('stays on the edit page when the server rejects a rename', async () => {
    await tagsPage.swipeToRevealActions('clothing');
    await tagsPage
      .getTag('clothing')
      .getByRole('button', { name: 'Delete' })
      .click();
    await expect(tagsPage.getTag('clothing')).toHaveCount(0);

    await tagsPage.getTag('dining-out').click();
    await expect(page.getByRole('heading', { name: 'Edit tag' })).toBeVisible();
    await tagsPage.nameInput.fill('clothing');
    await tagsPage.descriptionInput.fill('Changed');
    await tagsPage.saveButton.click();

    await expect(
      tagsPage.getToast('There was an error renaming the tag'),
    ).toContainText('A tag with that name already exists');
    await expect(page.getByRole('heading', { name: 'Edit tag' })).toBeVisible();
    await expect(tagsPage.nameInput).toHaveValue('clothing');
    await expect(tagsPage.descriptionInput).toHaveValue('Changed');
    await expect(tagsPage.getToast('saved')).toHaveCount(0);

    await page.getByRole('button', { name: 'Back' }).click();
    await expect(tagsPage.getTag('dining-out')).toContainText(
      'Restaurants and takeout',
    );
  });

  test('opens the transactions that use a tag from its swipe actions', async () => {
    await tagsPage.swipeToRevealActions('clothing');
    await tagsPage
      .getTag('clothing')
      .getByRole('button', { name: 'View transactions' })
      .click();

    await expect(page).toHaveURL(/\/accounts\/all$/);
    await expect(page.getByText('Filters applied')).toBeVisible();
  });

  test('opens the transactions that use a tag from the edit page', async () => {
    await tagsPage.getTag('clothing').click();
    await expect(page.getByRole('heading', { name: 'Edit tag' })).toBeVisible();
    await tagsPage.viewTransactionsButton.click();

    await expect(page).toHaveURL(/\/accounts\/all$/);
    await expect(page.getByText('Filters applied')).toBeVisible();
  });

  test('deletes a tag from the edit page and restores it with undo', async () => {
    await tagsPage.getTag('clothing').click();
    await expect(page.getByRole('heading', { name: 'Edit tag' })).toBeVisible();
    await tagsPage.deleteTagButton.click();

    await expect(page).toHaveURL(/\/settings\/tags$/);
    await expect(tagsPage.getToast('Tag "#clothing" deleted')).toBeVisible();
    await expect(tagsPage.getTag('clothing')).toHaveCount(0);

    await tagsPage.undoFromToast('Tag "#clothing" deleted');

    await expect(tagsPage.getTag('clothing')).toBeVisible();
    await expect(page).toHaveURL(/\/settings\/tags$/);
  });

  test('does not return to a deleted tag with the browser back button', async () => {
    await tagsPage.getTag('clothing').click();
    await expect(page.getByRole('heading', { name: 'Edit tag' })).toBeVisible();
    const editUrl = page.url();
    await tagsPage.deleteTagButton.click();
    await expect(tagsPage.getToast('Tag "#clothing" deleted')).toBeVisible();
    await expect(tagsPage.getTag('clothing')).toHaveCount(0);

    await page.goBack();

    await expect(page).not.toHaveURL(editUrl);
    await expect(page).not.toHaveURL(/\/tags\/[^/]+$/);
  });
});
