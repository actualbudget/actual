import type { Locator, Page } from '@playwright/test';

export class MobileTagsPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly searchBox: Locator;
  readonly addButton: Locator;
  readonly tagsList: Locator;
  readonly emptyMessage: Locator;
  readonly noMatchesMessage: Locator;
  readonly nameInput: Locator;
  readonly descriptionInput: Locator;
  readonly colorButton: Locator;
  readonly saveButton: Locator;
  readonly colorSheet: Locator;
  readonly hexInput: Locator;
  readonly viewTransactionsButton: Locator;
  readonly deleteTagButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Tags' });
    this.searchBox = page.getByPlaceholder('Filter tags…');
    this.addButton = page.getByRole('button', { name: 'Add new tag' });
    this.tagsList = page.getByRole('grid', { name: 'Tags' });
    this.emptyMessage = page.getByText('No tags yet.');
    this.noMatchesMessage = page.getByText('No tags found.');
    this.nameInput = page.getByRole('textbox', { name: 'Name' });
    this.descriptionInput = page.getByRole('textbox', { name: 'Description' });
    this.colorButton = page.getByRole('button', { name: /^Color, / });
    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.colorSheet = page.getByRole('dialog', { name: 'Color' });
    this.hexInput = this.colorSheet.getByRole('textbox', { name: 'Hex color' });
    this.viewTransactionsButton = page.getByRole('button', {
      name: 'View transactions',
    });
    this.deleteTagButton = page.getByRole('button', { name: 'Delete tag' });
  }

  async waitFor(options?: {
    state?: 'attached' | 'detached' | 'visible' | 'hidden';
    timeout?: number;
  }) {
    await this.heading.waitFor(options);
  }

  async searchFor(text: string) {
    await this.searchBox.fill(text);
  }

  getAllTags() {
    return this.tagsList.getByRole('row');
  }

  getTag(name: string) {
    return this.tagsList.getByRole('row').filter({ hasText: `#${name}` });
  }

  async createTag({
    name,
    description,
    color,
  }: {
    name: string;
    description?: string;
    color?: string;
  }) {
    await this.addButton.click();
    await this.nameInput.fill(name);
    if (description != null) {
      await this.descriptionInput.fill(description);
    }
    if (color != null) {
      await this.pickColor(color);
    }
    await this.saveButton.click();
    await this.heading.waitFor();
    await this.getToast(`Tag "#${name}" created`).waitFor();
    await this.getTag(name).waitFor();
  }

  getToast(message: string) {
    return this.page.getByRole('alert').filter({ hasText: message });
  }

  async undoFromToast(message: string) {
    await this.getToast(message).getByRole('button', { name: 'Undo' }).click();
  }

  async pickColor(color: string) {
    await this.colorButton.click();
    await this.colorSheet.getByRole('button', { name: color }).click();
    await this.colorSheet.waitFor({ state: 'hidden' });
  }

  async typeHexColor(color: string) {
    await this.colorButton.click();
    await this.hexInput.fill(color);
    await this.hexInput.press('Enter');
    await this.colorSheet.waitFor({ state: 'hidden' });
  }

  async resetColor() {
    await this.colorButton.click();
    await this.colorSheet
      .getByRole('button', { name: 'Theme default' })
      .click();
    await this.colorSheet.waitFor({ state: 'hidden' });
  }

  async swipeToRevealActions(name: string) {
    const row = this.getTag(name);
    const box = await row.boundingBox();
    if (!box) {
      throw new Error(`Unable to get bounding box of tag ${name}.`);
    }
    const y = box.y + box.height / 2;
    await this.page.mouse.move(box.x + box.width - 20, y);
    await this.page.mouse.down();
    await this.page.mouse.move(box.x + 20, y, { steps: 10 });
    await this.page.mouse.up();
  }
}
