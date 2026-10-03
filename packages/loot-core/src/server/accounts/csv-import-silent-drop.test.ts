/**
 * Regression tests for: CSV import silently drops transactions when an
 * existing transaction in the same account has the same amount within
 * ±7 days (https://github.com/actualbudget/actual/issues/8464).
 *
 * These tests simulate the exact flow of the CSV import dialog
 * (ImportTransactionsModal):
 *   1. preview call  -> reconcileTransactions(..., isPreview = true)
 *   2. default toggle state assignment (onImportPreview onSuccess handler),
 *      including pinning each row's match decision (matchedTransactionId)
 *   3. final import  -> reconcileTransactions(..., isPreview = false),
 *      with forceAddTransaction and matchedTransactionId set per the
 *      modal's onImport rules.
 *
 * The import used to re-run the greedy fuzzy matching from scratch on the
 * (possibly smaller) set of rows the user left selected, so it could match
 * — and silently merge — rows the preview had shown as brand-new. Pinning
 * the preview's match decision makes the import honor what the user saw.
 */
import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import { loadRules } from '#server/transactions/transaction-rules';

import { reconcileTransactions } from './sync';
import type { ReconcileTransactionsResult } from './sync';

const emptyDatabase = (
  global as unknown as {
    emptyDatabase: () => () => Promise<void>;
  }
).emptyDatabase;

beforeEach(async () => {
  await emptyDatabase()();
  await loadMappings();
  await loadRules();
});

type UiRow = {
  trx_id: string;
  date: string;
  amount: number;
  payee_name: string;
  // UI state managed by the modal:
  existing?: boolean;
  ignored?: boolean;
  selected?: boolean;
  selected_merge?: boolean;
  matchedTransactionId?: string | null;
};

async function setupAccountWithExistingTransaction() {
  const acctId = await db.insertAccount({ id: 'chase', name: 'Chase Bank' });
  await db.insertPayee({
    id: 'transfer-' + acctId,
    name: '',
    transfer_acct: acctId,
  });

  const netflixPayeeId = await db.insertPayee({ name: 'Netflix' });
  // A manually-entered transaction already in the register: $8.99 on May 10
  await db.insertTransaction({
    id: 'existing-netflix',
    account: acctId,
    amount: -899,
    date: '2024-05-10',
    payee: netflixPayeeId,
    cleared: 1,
  });

  return acctId;
}

function getAllTransactions() {
  return db.all<db.DbViewTransactionInternal>(
    `SELECT * FROM v_transactions_internal ORDER BY date DESC, id`,
  );
}

/**
 * Mirrors ImportTransactionsModal.onImportPreview onSuccess: assigns the
 * default toggle state to each parsed CSV row based on the preview result,
 * and pins the preview's match decision on the row.
 */
function applyPreviewDefaults(
  rows: UiRow[],
  updatedPreview: ReconcileTransactionsResult['updatedPreview'],
): UiRow[] {
  const matchedUpdateMap = new Map(
    // trx_id is an extra field the modal attaches to each parsed row; it
    // survives normalization but isn't part of TransactionEntity (the modal
    // reads it the same way, via a ts-expect-error).
    updatedPreview.map(entry => [
      (entry.transaction as { trx_id?: string }).trx_id,
      entry,
    ]),
  );

  return rows.map(row => {
    const entry = matchedUpdateMap.get(row.trx_id);
    const existingTrx = entry?.existing;
    const existing = !!existingTrx;
    const ignored = entry?.ignored || false;
    return {
      ...row,
      existing,
      ignored,
      selected: !ignored,
      selected_merge: existing,
      matchedTransactionId: entry
        ? typeof existingTrx === 'object' && existingTrx !== null
          ? existingTrx.id
          : undefined
        : null,
    };
  });
}

/**
 * Mirrors ImportTransactionsModal.onImport: filters rows and sets
 * forceAddTransaction and matchedTransactionId according to the toggle
 * state and the preview's pinned match decision, producing the payload
 * sent to the non-preview 'transactions-import' call. reconcile = true.
 */
function buildImportPayload(rows: UiRow[]) {
  const finalTransactions = [];
  for (const row of rows) {
    if (!row.selected && !row.ignored) {
      // unselected transactions that are not ignored are skipped
      continue;
    }

    const {
      existing: _existing,
      ignored: _ignored,
      selected: _selected,
      selected_merge: _selected_merge,
      matchedTransactionId: _matchedTransactionId,
      trx_id: _trx_id,
      ...finalTransaction
    } = row;

    const forceAddTransaction =
      (row.ignored && row.selected) ||
      (row.existing && row.selected && !row.selected_merge);

    finalTransactions.push({
      ...finalTransaction,
      ...(forceAddTransaction ? { forceAddTransaction: true } : {}),
      ...(row.matchedTransactionId !== undefined
        ? { matchedTransactionId: row.matchedTransactionId }
        : {}),
    });
  }
  return finalTransactions;
}

describe('CSV import preview/import consistency', () => {
  test('a new same-amount transaction previewed as new is imported, not silently merged', async () => {
    const acctId = await setupAccountWithExistingTransaction();

    // CSV contains a true duplicate of the existing Netflix transaction AND a
    // genuinely new same-amount purchase.
    const csvRows: UiRow[] = [
      {
        trx_id: 'row-dup',
        date: '2024-05-10',
        payee_name: 'Netflix',
        amount: -899,
      },
      {
        trx_id: 'row-new',
        date: '2024-05-12',
        payee_name: 'Corner Coffee',
        amount: -899,
      },
    ];

    const preview = await reconcileTransactions(
      acctId,
      csvRows,
      false,
      true,
      true,
    );

    // In the preview, the duplicate row claims the match with the existing
    // transaction. The new row matches nothing: the dialog shows it as a
    // plain new transaction — checked, no merge indicator, no ignore flag.
    const previewIds = preview.updatedPreview.map(
      e => (e.transaction as { trx_id?: string }).trx_id,
    );
    expect(previewIds).toContain('row-dup');
    expect(previewIds).not.toContain('row-new');

    let uiRows = applyPreviewDefaults(csvRows, preview.updatedPreview);
    // The preview's decision is pinned on each row:
    expect(uiRows.find(r => r.trx_id === 'row-dup')?.matchedTransactionId).toBe(
      'existing-netflix',
    );
    expect(
      uiRows.find(r => r.trx_id === 'row-new')?.matchedTransactionId,
    ).toBeNull();

    // The user recognizes row-dup as a duplicate and unchecks it (clicking
    // the 3-state toggle until fully unselected). row-new stays checked.
    uiRows = uiRows.map(row =>
      row.trx_id === 'row-dup'
        ? { ...row, selected: false, selected_merge: false }
        : row,
    );

    const payload = buildImportPayload(uiRows);
    // Only the genuinely new row is sent to the import:
    expect(payload.map(t => t.payee_name)).toEqual(['Corner Coffee']);

    const result = await reconcileTransactions(
      acctId,
      payload,
      false,
      true,
      false,
    );

    // The import honors the preview: even though the existing Netflix
    // transaction is no longer claimed by the (deselected) duplicate row,
    // the new row was previewed as new and must be added, not merged.
    expect(result.added).toHaveLength(1);

    const transactions = await getAllTransactions();
    expect(transactions).toHaveLength(2);
    // The existing transaction was not touched:
    expect(
      transactions.find(t => t.id === 'existing-netflix')?.imported_payee,
    ).toBeNull();
  });

  test('the default merge toggle state merges into exactly the previewed transaction', async () => {
    // Note: this documents the *intended* dedup behavior of the default
    // "merge" toggle state — a fuzzy-matched row that the user leaves in its
    // default state is merged into the existing transaction it was previewed
    // against (and only that one), not imported as a new transaction. See
    // issue #8464 for discussion of making this state more visible in the UI.
    const acctId = await setupAccountWithExistingTransaction();

    // The CSV contains a different purchase that happens to have the same
    // amount ($8.99) two days later.
    const csvRows: UiRow[] = [
      {
        trx_id: 'row-1',
        date: '2024-05-12',
        payee_name: 'Corner Coffee',
        amount: -899,
      },
    ];

    // Step 1: the modal's preview call
    const preview = await reconcileTransactions(
      acctId,
      csvRows,
      false, // isBankSyncAccount
      true, // strictIdChecking
      true, // isPreview
    );

    // The CSV row fuzzy-matched the existing Netflix transaction purely on
    // amount + date proximity, and shows in the default "merge" state.
    expect(preview.updatedPreview).toHaveLength(1);
    expect(preview.updatedPreview[0].ignored).not.toBe(true);
    expect(preview.updatedPreview[0].existing).toBeTruthy();

    // Step 2 + 3: default toggle state, then the real import
    const uiRows = applyPreviewDefaults(csvRows, preview.updatedPreview);
    expect(uiRows[0]).toMatchObject({
      selected: true,
      ignored: false,
      selected_merge: true, // the default action for matched rows is MERGE
      matchedTransactionId: 'existing-netflix',
    });

    const result = await reconcileTransactions(
      acctId,
      buildImportPayload(uiRows),
      false,
      true,
      false, // real import
    );

    // Merged into the pinned existing transaction; nothing new is added.
    expect(result.added).toHaveLength(0);
    expect(result.updated).toEqual(['existing-netflix']);

    const transactions = await getAllTransactions();
    expect(transactions).toHaveLength(1);
    // The merge only fills blank fields of the existing transaction:
    expect(transactions[0].imported_payee).toBe('Corner Coffee');
  });

  test('a pinned match that no longer exists falls back to adding the transaction', async () => {
    const acctId = await setupAccountWithExistingTransaction();

    const csvRows: UiRow[] = [
      {
        trx_id: 'row-1',
        date: '2024-05-12',
        payee_name: 'Corner Coffee',
        amount: -899,
      },
    ];

    const preview = await reconcileTransactions(
      acctId,
      csvRows,
      false,
      true,
      true,
    );
    const uiRows = applyPreviewDefaults(csvRows, preview.updatedPreview);
    expect(uiRows[0].matchedTransactionId).toBe('existing-netflix');

    // The previewed match is deleted before the user hits Import (e.g. by a
    // sync from another device).
    await db.deleteTransaction({ id: 'existing-netflix' });

    const result = await reconcileTransactions(
      acctId,
      buildImportPayload(uiRows),
      false,
      true,
      false,
    );

    // The pinned transaction is gone, so the row is added as new instead of
    // being fuzzy-matched onto something else.
    expect(result.added).toHaveLength(1);
    expect(result.updated).toHaveLength(0);
  });

  test('callers that do not pin matches (e.g. the API) keep the fuzzy matching behavior', async () => {
    const acctId = await setupAccountWithExistingTransaction();

    // No preview, no matchedTransactionId — a same-amount transaction within
    // the ±7 day window is still deduplicated by merging, as before.
    const result = await reconcileTransactions(
      acctId,
      [
        {
          date: '2024-05-12',
          payee_name: 'Corner Coffee',
          amount: -899,
        },
      ],
      false,
      true,
      false,
    );

    expect(result.added).toHaveLength(0);
    expect(result.updated).toEqual(['existing-netflix']);
    expect(await getAllTransactions()).toHaveLength(1);
  });

  test('CONTROL: same amount but outside the ±7 day window imports fine', async () => {
    const acctId = await setupAccountWithExistingTransaction();

    const csvRows: UiRow[] = [
      {
        trx_id: 'row-1',
        date: '2024-05-20', // 10 days after the existing transaction
        payee_name: 'Corner Coffee',
        amount: -899,
      },
    ];

    const preview = await reconcileTransactions(
      acctId,
      csvRows,
      false,
      true,
      true,
    );
    expect(preview.updatedPreview).toHaveLength(0); // no match in preview

    const uiRows = applyPreviewDefaults(csvRows, preview.updatedPreview);
    // No preview entry means the row was shown as new, which pins "no match":
    expect(uiRows[0].matchedTransactionId).toBeNull();

    const result = await reconcileTransactions(
      acctId,
      buildImportPayload(uiRows),
      false,
      true,
      false,
    );

    expect(result.added).toHaveLength(1);
    expect(await getAllTransactions()).toHaveLength(2);
  });

  test('toggling a matched row to "add as new" forces the add', async () => {
    const acctId = await setupAccountWithExistingTransaction();

    const csvRows: UiRow[] = [
      {
        trx_id: 'row-1',
        date: '2024-05-12',
        payee_name: 'Corner Coffee',
        amount: -899,
      },
    ];

    const preview = await reconcileTransactions(
      acctId,
      csvRows,
      false,
      true,
      true,
    );
    let uiRows = applyPreviewDefaults(csvRows, preview.updatedPreview);

    // One click on the 3-state toggle: (selected + merge) -> (selected, no
    // merge) = "add as new transaction"
    uiRows = uiRows.map(row => ({ ...row, selected_merge: false }));

    const result = await reconcileTransactions(
      acctId,
      buildImportPayload(uiRows),
      false,
      true,
      false,
    );

    expect(result.added).toHaveLength(1);
    expect(await getAllTransactions()).toHaveLength(2);
  });
});
