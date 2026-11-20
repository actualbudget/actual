import type { BrowserContext, Page } from '@playwright/test';

import { addE2EInitScripts, expect, test } from './fixtures';
import { BudgetPage } from './page-models/budget-page';
import { ConfigurationPage } from './page-models/configuration-page';
import { Navigation } from './page-models/navigation';

// A user agent without "playwright" in it, so the app uses the SharedWorker
// coordinator (leader tab plus followers) instead of a worker per tab
const CHROME_USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

async function addTransactionAndCheck(page: Page, notes: string) {
  const accountPage = await new Navigation(page).goToAccountPage(
    'Ally Savings',
  );
  await accountPage.waitFor();
  // Queries are answered once the new leader has restored the budget; wait
  // for the data and a moment of quiet before typing into the table
  await expect(accountPage.transactionTableRow.first()).toBeVisible({
    timeout: 60_000,
  });
  await page.waitForTimeout(1000);
  await accountPage.createSingleTransaction({
    payee: 'Kroger',
    notes,
    debit: '12.34',
  });
  // The demo account has later-dated transactions, so look for the note
  await expect(accountPage.transactionTable.getByText(notes)).toBeVisible();
  return accountPage;
}

// Simulates the user switching away from a tab and back
async function hideAndShow(page: Page) {
  for (const state of ['hidden', 'visible']) {
    await page.evaluate(visibility => {
      Object.defineProperty(document, 'visibilityState', {
        value: visibility,
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));
    }, state);
    await page.waitForTimeout(500);
  }
}

function budgetedAmount(page: Page, category: string) {
  return page
    .getByTestId('budget-table')
    .getByTestId('row')
    .filter({ hasText: category })
    .first()
    .getByTestId('budget')
    .nth(0);
}

test.describe('Multiple tabs on one budget', () => {
  let context: BrowserContext;
  let leader: Page;
  let follower: Page;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext({ userAgent: CHROME_USER_AGENT });
    await addE2EInitScripts(context);
    leader = await context.newPage();
    await leader.goto('/');
    await new ConfigurationPage(leader).createTestFile();

    follower = await context.newPage();
    await follower.goto('/');
    await expect(follower.getByTestId('budget-table')).toBeVisible({
      timeout: 60_000,
    });
  });

  test.afterEach(async () => {
    await context?.close();
  });

  test('the follower takes over when the leader tab closes', async () => {
    await leader.close({ runBeforeUnload: true });

    // The follower becomes the leader, restores the budget and keeps working
    await addTransactionAndCheck(follower, 'after takeover');

    // And its writes are persisted
    await follower.waitForTimeout(2000);
    await follower.reload();
    const accountPage = await new Navigation(follower).goToAccountPage(
      'Ally Savings',
    );
    await accountPage.waitFor({ timeout: 60_000 });
    await expect(
      accountPage.transactionTable.getByText('after takeover'),
    ).toBeVisible();
  });

  test('closing the budget in the leader hands it to the follower', async () => {
    // The leader releases its storage before its worker is terminated
    await leader.evaluate(() => window.__actionsForMenu.closeBudget());
    // The leader is back on the budget list
    await expect(leader.getByText('Test Budget')).toBeVisible({
      timeout: 30_000,
    });

    await addTransactionAndCheck(follower, 'after handover');
  });
  test('a leader that was hidden keeps its budget after resuming', async () => {
    // Switching tabs hides the leader; on return the bridge reports the
    // budget it was told about, which must match the coordinator's view
    await hideAndShow(leader);

    await new BudgetPage(leader).setBudgetedAmount('Food', '123');
    await expect(budgetedAmount(leader, 'Food')).toHaveText('123.00');
    await expect(budgetedAmount(follower, 'Food')).toHaveText('123.00');
  });

  test('transaction edits sync to another tab without refresh', async () => {
    // Open the same account in both tabs
    const accountA = await new Navigation(leader).goToAccountPage(
      'Ally Savings',
    );
    const accountB = await new Navigation(follower).goToAccountPage(
      'Ally Savings',
    );

    // Select the first transaction in each tab
    const rowA = accountA.transactionTableRow.first();
    const rowB = accountB.transactionTableRow.first();

    await expect(rowA).toBeVisible();
    await expect(rowB).toBeVisible();

    // Verify that both tabs display the same transaction
    const payee = (await rowA.getByTestId('payee').innerText()).trim();
    await expect(rowB.getByTestId('payee')).toHaveText(payee);

    const notesA = rowA.getByTestId('notes');
    const notesB = rowB.getByTestId('notes');

    const originalNotes = (await notesA.innerText()).trim();
    await expect(notesB).toHaveText(originalNotes);

    // Edit the transaction in the first tab

    const bounds = await notesA.boundingBox();
    if (!bounds) {
      throw new Error('Notes cell is not visible');
    }
    // Click in the empty area on the right, avoiding clickable tags
    await notesA.click({
      position: {
        x: bounds.width - 12,
        y: bounds.height / 2,
      },
    });
    const notesEditor = notesA.getByRole('combobox');
    // Fail quickly if clicking did not activate edit mode
    await expect(notesEditor).toBeVisible({ timeout: 5000 });

    await notesEditor.fill('regression-9423');
    await leader.keyboard.press('Tab');

    // Confirm the first tab displays the new value
    await expect(notesA).toHaveText('regression-9423');

    // The second tab must update without a manual refresh
    await expect(notesB).toHaveText('regression-9423', {
      timeout: 10_000,
    });
  });

  test('follower transaction edits sync to leader without refresh', async () => {
    const leaderAccount = await new Navigation(leader).goToAccountPage(
      'Ally Savings',
    );
    const followerAccount = await new Navigation(follower).goToAccountPage(
      'Ally Savings',
    );

    const leaderRow = leaderAccount.transactionTableRow.first();
    const followerRow = followerAccount.transactionTableRow.first();

    await expect(leaderRow).toBeVisible();
    await expect(followerRow).toBeVisible();

    const payee = (await followerRow.getByTestId('payee').innerText()).trim();
    await expect(leaderRow.getByTestId('payee')).toHaveText(payee);

    const followerNotes = followerRow.getByTestId('notes');
    const leaderNotes = leaderRow.getByTestId('notes');

    const originalNotes = (await followerNotes.innerText()).trim();
    await expect(leaderNotes).toHaveText(originalNotes);

    const bounds = await followerNotes.boundingBox();
    if (!bounds) {
      throw new Error('Follower notes cell is not visible');
    }

    await followerNotes.click({
      position: {
        x: bounds.width - 12,
        y: bounds.height / 2,
      },
    });

    const editor = followerNotes.getByRole('combobox');
    await expect(editor).toBeVisible({ timeout: 5000 });

    const newNotes = 'regression-9423-from-follower';
    await editor.fill(newNotes);
    await follower.keyboard.press('Tab');

    await expect(followerNotes).toHaveText(newNotes);
    await expect(leaderNotes).toHaveText(newNotes, {
      timeout: 10_000,
    });
  });
});

test.describe('Refreshing a tab', () => {
  test('a tab opened before the budget was created can refresh afterwards', async ({
    browser,
  }) => {
    const context = await browser.newContext({ userAgent: CHROME_USER_AGENT });
    await addE2EInitScripts(context);
    const creator = await context.newPage();
    await creator.goto('/');
    // The second tab opens once the first has booted, as a user would
    await creator
      .getByRole('button', { name: 'Try the demo', exact: true })
      .waitFor({ timeout: 60_000 });
    const other = await context.newPage();
    await other.goto('/');
    await other
      .getByRole('button', { name: 'Try the demo', exact: true })
      .waitFor({ timeout: 60_000 });

    // The budget is created in the first tab, which is then switched away
    // from and back, before the second tab is refreshed
    await creator.bringToFront();
    await new ConfigurationPage(creator).createTestFile();
    await hideAndShow(creator);

    await other.reload();
    await expect(
      other.getByText(/Loading global preferences/).first(),
    ).toBeHidden({
      timeout: 30_000,
    });
    await expect(other.getByTestId('budget-table')).toBeVisible({
      timeout: 60_000,
    });
    await context.close();
  });

  test('a tab that closed the budget can refresh while another tab has it open', async ({
    browser,
  }) => {
    const context = await browser.newContext({ userAgent: CHROME_USER_AGENT });
    await addE2EInitScripts(context);
    // The first tab creates the budget and goes back to the file list
    const closer = await context.newPage();
    await closer.goto('/');
    await new ConfigurationPage(closer).createTestFile();
    await closer.evaluate(() => window.__actionsForMenu.closeBudget());
    await closer.getByText('Test Budget').waitFor({ timeout: 30_000 });

    // A second tab opens it, then the first is switched to and refreshed
    const opener = await context.newPage();
    await opener.goto('/');
    await opener.getByText('Test Budget').click({ timeout: 30_000 });
    await expect(opener.getByTestId('budget-table')).toBeVisible({
      timeout: 60_000,
    });
    await closer.bringToFront();
    await hideAndShow(closer);
    await closer.reload();

    await expect(
      closer.getByText(/Loading global preferences/).first(),
    ).toBeHidden({
      timeout: 30_000,
    });
    await expect(closer.getByTestId('budget-table')).toBeVisible({
      timeout: 60_000,
    });
    await context.close();
  });
});
