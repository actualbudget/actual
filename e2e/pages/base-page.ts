import { type Locator, type Page } from '@playwright/test';

/**
 * BasePage is the root of every page object.
 *
 * It holds a reference to the Playwright `Page` and exposes thin wrappers
 * around the most common locator factories so that subclasses never import
 * from @playwright/test directly (keeps page objects decoupled from the
 * test runner and easier to mock in unit tests of the framework itself).
 *
 * Assertions do NOT belong here — keep them in spec files.
 */
export class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(path: string): Promise<void> {
    await this.page.goto(path);
  }

  async waitForNetworkIdle(): Promise<void> {
    await this.page.waitForLoadState('load');
  }

  async waitForDOMReady(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
  }

  /** Returns a locator scoped to this page. */
  protected locator(selector: string): Locator {
    return this.page.locator(selector);
  }

  protected getByTestId(testId: string): Locator {
    return this.page.getByTestId(testId);
  }

  protected getByRole(
    role: Parameters<Page['getByRole']>[0],
    options?: Parameters<Page['getByRole']>[1],
  ): Locator {
    return this.page.getByRole(role, options);
  }

  protected getByLabel(label: string | RegExp): Locator {
    return this.page.getByLabel(label);
  }

  protected getByPlaceholder(placeholder: string | RegExp): Locator {
    return this.page.getByPlaceholder(placeholder);
  }

  protected getByText(text: string | RegExp): Locator {
    return this.page.getByText(text);
  }

  /**
   * Waits until the current URL matches the given pattern.
   * Used to confirm navigation completed before interacting with the new page.
   */
  async waitForUrl(urlOrRegex: string | RegExp): Promise<void> {
    await this.page.waitForURL(urlOrRegex);
  }
}
