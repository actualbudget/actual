import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import type { AccountPage } from './page-models/account-page';
import type { BudgetPage } from './page-models/budget-page';
import { ConfigurationPage } from './page-models/configuration-page';
import { Navigation } from './page-models/navigation';
import type { TransactionChangesPage } from './page-models/transaction-changes-page';

// The flag is a synced pref and the recording mode is decided when the budget
// is opened, so these tests mutate state that outlives a single navigation.
test.describe.configure({ mode: 'serial' });

// There is deliberately no `.mobile` counterpart: the route is wrapped in
// `NarrowNotSupported` and redirects away on narrow widths.
test.describe('Transaction Changes', () => {
  let page: Page;
  let navigation: Navigation;
  let budgetPage: BudgetPage;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    navigation = new Navigation(page);

    await page.goto('/');
    // A real budget rather than the demo: only a non-demo budget is recorded
    // as the last-opened one, so only that one reopens itself after a reload.
    // Both the bookmarked-URL check and turning recording on need a reload.
    budgetPage = await new ConfigurationPage(page).startFresh();
  });

  test.afterEach(async () => {
    await page?.close();
  });

  test('is unreachable until the feature flag is enabled', async () => {
    await page.getByRole('button', { name: 'More' }).click();
    await expect(
      page.getByRole('link', { name: 'Transaction Changes' }),
    ).toBeHidden();

    // The screen has to be gated on the route as well as in the sidebar,
    // otherwise a bookmarked or hand-typed URL walks straight into it.
    await page.goto('/transaction-changes');
    await budgetPage.waitFor();
    await expect(page).toHaveURL(/\/budget/);

    const settingsPage = await navigation.goToSettingsPage();
    await settingsPage.enableExperimentalFeature('Transaction Changes');

    // The sidebar picks the entry up as soon as the pref reaches it.
    await expect(
      page.getByRole('link', { name: 'Transaction Changes' }),
    ).toBeVisible();

    const transactionChangesPage =
      await navigation.goToTransactionChangesPage();
    await expect(page).toHaveURL(/\/transaction-changes/);
    await expect(transactionChangesPage.description).toBeVisible();

    // Recording starts at budget load, so a budget opened before the flag was
    // turned on says so rather than claiming it has no history.
    await expect(transactionChangesPage.notRecordingNotice).toBeVisible();
  });

  test.describe('with recording enabled', () => {
    let accountPage: AccountPage;

    test.beforeEach(async () => {
      const settingsPage = await navigation.goToSettingsPage();
      await settingsPage.enableExperimentalFeature('Transaction Changes');

      // Two waits before reloading, both load-bearing. The sidebar entry
      // appearing says the client has the pref; opening the screen forces a
      // backend round trip, which cannot be served before the pref write
      // ahead of it in the queue. Reloading any sooner races that write and
      // the budget reopens with the flag still off.
      await expect(
        page.getByRole('link', { name: 'Transaction Changes' }),
      ).toBeVisible();
      await navigation.goToTransactionChangesPage();

      // The recording mode is picked when the budget is loaded, so the flag
      // only takes effect once it is reopened. Reloading straight onto the
      // budget rather than back onto the screen we are standing on.
      await page.goto('/budget');
      await budgetPage.waitFor();

      accountPage = await navigation.createAccount({
        name: 'Checking',
        balance: 0,
        offBudget: false,
      });
    });

    async function createTransaction() {
      await accountPage.createSingleTransaction({
        payee: 'Coffee Shop',
        notes: 'first note',
        debit: '12.34',
      });
    }

    /**
     * Writes closer together than the replay code's grouping window are one
     * edit, so creating and then immediately changing a transaction really
     * does collapse into a single "Added" entry. A test that wants two
     * entries has to step outside that window rather than assume one.
     */
    async function stepPastGroupingWindow() {
      const groupWindowMs = 250;
      await page.waitForTimeout(groupWindowMs * 3);
    }

    async function openChangeLog(): Promise<TransactionChangesPage> {
      const transactionChangesPage =
        await navigation.goToTransactionChangesPage();
      await expect(transactionChangesPage.notRecordingNotice).toBeHidden();
      return transactionChangesPage;
    }

    test('records creating a transaction', async () => {
      await createTransaction();

      const changeLog = await openChangeLog();
      const entry = changeLog.getNthEntry(0);

      await expect(entry.cell('payee')).toHaveText('Coffee Shop');
      await expect(entry.cell('notes')).toHaveText('first note');
      await expect(entry.cell('payment')).toHaveText('12.34');
      // A creation has nothing to diff against, so it is the "Change type"
      // badge that says what happened.
      await expect(entry.badge).toHaveText('Added');
      await expect(entry.device).toHaveText('This device');
    });

    test('records editing a single field', async () => {
      await createTransaction();
      await stepPastGroupingWindow();
      await accountPage.editNthTransaction(0, { notes: 'second note' });

      const changeLog = await openChangeLog();
      const entry = changeLog.getNthEntry(0);

      await expect(entry.badge).toHaveText('Edited');

      // The changed cell carries the whole story: old value, then new.
      await expect(entry.oldValue('notes')).toHaveText('first note');
      await expect(entry.newValue('notes')).toHaveText('second note');

      // Everything else is unchanged, so it renders as a plain value with no
      // diff pair inside it.
      await expect(entry.cell('payee')).toHaveText('Coffee Shop');
      await expect(entry.oldValue('payee')).toHaveCount(0);
      await expect(entry.cell('payment')).toHaveText('12.34');
      await expect(entry.oldValue('payment')).toHaveCount(0);

      // The creation is still there, underneath.
      await expect(changeLog.getNthEntry(1).badge).toHaveText('Added');
    });

    test('renders tags in notes', async () => {
      await accountPage.createSingleTransaction({
        payee: 'Coffee Shop',
        notes: 'beans #groceries',
        debit: '12.34',
      });
      await accountPage.createSingleTransaction({
        payee: 'Coffee Shop',
        notes: 'plain note',
        debit: '1.00',
      });
      await stepPastGroupingWindow();
      // Edited from a note with no tag in it, because a tag pill is a button
      // and would swallow the click that opens the cell for editing.
      await accountPage.editNthTransaction(0, { notes: 'tea #dining' });

      const changeLog = await openChangeLog();

      // A note reads the same here as it does in the register it came from,
      // so both halves of a diff render their tags as pills rather than as
      // raw "#tag" text.
      const edit = changeLog.getNthEntry(0);
      await expect(edit.oldValue('notes')).toHaveText('plain note');
      await expect(
        edit.newValue('notes').getByRole('button', { name: '#dining' }),
      ).toBeVisible();

      // A note with no diff to show is formatted just the same.
      await changeLog.filterFor('beans');
      await expect(
        changeLog
          .getNthEntry(0)
          .cell('notes')
          .getByRole('button', { name: '#groceries' }),
      ).toBeVisible();
    });

    test('records editing several fields', async () => {
      // Two transactions on the same payee, so renaming one below does not
      // leave the payee unused -- that would raise the merge-payees offer,
      // which is a different feature and would sit over the sidebar.
      await createTransaction();
      await createTransaction();
      await stepPastGroupingWindow();
      await accountPage.editNthTransaction(0, {
        payee: 'Bakery',
        notes: 'second note',
        debit: '56.78',
      });

      const changeLog = await openChangeLog();

      // The register commits each field as it is left, and only writes landing
      // within the grouping window merge, so these edits legitimately arrive
      // as one entry or several. What has to hold either way is that the top
      // of the log is the finished transaction and the bottom is still the
      // creation, with every field accounted for in between. Grouping itself
      // is pinned down by the unit tests, which control the timing.
      const entryCount = await changeLog.entryRow.count();
      expect(entryCount).toBeGreaterThan(1);

      // A cell that changed in this entry reads `old -> new`, so assert on
      // the value it ended up at rather than on the cell's whole text.
      const newest = changeLog.getNthEntry(0);
      await expect(newest.cell('payee')).toContainText('Bakery');
      await expect(newest.cell('notes')).toContainText('second note');
      await expect(newest.cell('payment')).toContainText('56.78');

      const creation = changeLog.getNthEntry(entryCount - 1);
      await expect(creation.badge).toHaveText('Added');
      await expect(creation.cell('payee')).toHaveText('Coffee Shop');
      await expect(creation.cell('notes')).toHaveText('first note');
      await expect(creation.cell('payment')).toHaveText('12.34');
    });

    test('records deleting and restoring a transaction', async () => {
      await createTransaction();
      await stepPastGroupingWindow();

      await accountPage.selectNthTransaction(0);
      await accountPage.clickSelectAction('Delete');
      await page
        .getByRole('dialog')
        .getByRole('button', { name: 'Delete', exact: true })
        .click();
      await expect(accountPage.transactionTableRow).toHaveCount(0);

      const afterDelete = await openChangeLog();
      const deletion = afterDelete.getNthEntry(0);

      // A deletion has no after-state, so it shows the values it last held,
      // struck out, with "Deleted" as the change type.
      await expect(deletion.badge).toHaveText('Deleted');
      await expect(deletion.cell('payee')).toHaveText('Coffee Shop');
      await expect(deletion.cell('notes')).toHaveText('first note');

      // Undo puts the transaction back, which the log reports as a restore.
      accountPage = await navigation.goToAccountPage('Checking');
      await stepPastGroupingWindow();
      await page.keyboard.press('Control+z');
      await expect(accountPage.transactionTableRow).toHaveCount(1);

      const afterRestore = await openChangeLog();
      const restoration = afterRestore.getNthEntry(0);

      await expect(restoration.badge).toHaveText('Restored');
      await expect(restoration.cell('payee')).toHaveText('Coffee Shop');
      await expect(restoration.cell('notes')).toHaveText('first note');
    });

    test('filters the loaded changes', async () => {
      await createTransaction();

      const changeLog = await openChangeLog();
      await expect(changeLog.entryRow).toHaveCount(1);

      await changeLog.filterFor('Coffee');
      await expect(changeLog.entryRow).toHaveCount(1);

      await changeLog.filterFor('zzz-nothing-matches-this');
      await expect(changeLog.entryRow).toHaveCount(0);
      await expect(changeLog.noMatchState).toBeVisible();
    });

    test('checks the page visuals', async () => {
      await createTransaction();
      await stepPastGroupingWindow();
      await accountPage.editNthTransaction(0, { notes: 'second note' });

      const changeLog = await openChangeLog();
      await expect(changeLog.entryRow).toHaveCount(2);

      await expect(page).toMatchThemeScreenshots();
    });
  });
});
