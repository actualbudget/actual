import type { Browser, Page } from '@playwright/test';

import type { BudgetPage } from './page-models/budget-page';
import { ConfigurationPage } from './page-models/configuration-page';
import { Navigation } from './page-models/navigation';

export type DemoSession = {
  page: Page;
  navigation: Navigation;
  budgetPage: BudgetPage;
};

/**
 * Open a fresh browser page on a freshly seeded demo budget file.
 *
 * Each test gets its own budget file, which is what makes the suite safe under
 * Playwright's `fullyParallel: true` -- no test can observe another's writes.
 *
 * Pair with `closeDemoSession` in `afterEach`.
 */
export async function createDemoSession(
  browser: Browser,
): Promise<DemoSession> {
  const page = await browser.newPage();
  const navigation = new Navigation(page);

  await page.goto('/');
  const budgetPage = await new ConfigurationPage(page).createTestFile();

  // Park the cursor away from the budget table. A stray hover renders a
  // budget-amount input under the pointer and steals focus from the next
  // interaction.
  await page.mouse.move(0, 0);

  return { page, navigation, budgetPage };
}

/**
 * Tear a session down. Tolerates an already-closed or never-created page so a
 * failure during setup doesn't produce a second, misleading error in teardown.
 */
export async function closeDemoSession(session?: Partial<DemoSession>) {
  await session?.page?.close();
}
