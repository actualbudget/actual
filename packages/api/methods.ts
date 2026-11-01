import { send } from '@actual-app/core/platform/client/connection';
import type {
  AmountFormat,
  AmountFormatOptions,
  AmountInput,
  APIAccountCreateEntity,
  APIAccountEntity,
  APIAccountGroupEntity,
  APIAccountUpdateFields,
  APIBudgetMonth,
  APICategoryEntity,
  APICategoryGroupEntity,
  APIFileEntity,
  APIImportTransactionInput,
  APIMoneyTransactionEntity,
  APIPayeeEntity,
  APIRuleEntity,
  APIScheduleEntity,
  APITagEntity,
  APITransactionUpdateFields,
} from '@actual-app/core/server/api-models';
import type { ImportableBudgetType } from '@actual-app/core/server/importers/index';
import type { Money } from '@actual-app/core/shared/money';
import type { Query } from '@actual-app/core/shared/query';
import type { ImportTransactionsOpts } from '@actual-app/core/types/api-handlers';
import type {
  NoteEntity,
  RuleEntity,
  TransactionEntity,
} from '@actual-app/core/types/models';
import type { SyncedPrefs } from '@actual-app/core/types/prefs';

export { q } from './app/query';

export async function runImport(
  budgetName: APIFileEntity['name'],
  func: () => Promise<void>,
) {
  await send('api/start-import', { budgetName });
  try {
    await func();
  } catch (e) {
    await send('api/abort-import');
    throw e;
  }
  await send('api/finish-import');
}

export async function loadBudget(budgetId: string) {
  return send('api/load-budget', { id: budgetId });
}

export async function downloadBudget(
  syncId: string,
  { password }: { password?: string } = {},
) {
  return send('api/download-budget', { syncId, password });
}

export async function getBudgets() {
  return send('api/get-budgets');
}

/**
 * Import a budget from an exported file — an Actual `.zip` export, or a
 * YNAB4/YNAB5 export. Accepts either a path to the file on the engine's
 * filesystem, or the raw file contents. Loads the imported budget and
 * returns its id.
 */
export async function importBudget(
  input: string | ArrayBuffer | Uint8Array,
  {
    type = 'actual',
    filename,
  }: { type?: ImportableBudgetType; filename?: string } = {},
): Promise<{ id: string }> {
  const result =
    typeof input === 'string'
      ? await send('import-budget', { filepath: input, type })
      : await send('import-budget', {
          buffer: toArrayBuffer(input),
          filename,
          type,
        });

  if (result.error) {
    throw new Error(`Error importing budget: ${result.error}`);
  }
  if (!result.id) {
    throw new Error('Error importing budget: no budget was loaded');
  }
  return { id: result.id };
}

/** Export the currently-loaded budget as a zip buffer. */
export async function exportBudget(): Promise<Uint8Array> {
  const result = await send('export-budget');

  if ('error' in result) {
    throw new Error(`Error exporting budget: ${result.error}`);
  }
  if (!result.data) {
    throw new Error('Error exporting budget: no data was returned');
  }
  return new Uint8Array(result.data);
}

function toArrayBuffer(data: ArrayBuffer | Uint8Array): ArrayBuffer {
  if (data instanceof Uint8Array) {
    // Copy into a fresh ArrayBuffer so that views into a larger (possibly
    // shared) buffer are not sent across the worker boundary as-is.
    const copy = new Uint8Array(data.byteLength);
    copy.set(data);
    return copy.buffer;
  }
  return data;
}

export async function sync() {
  return send('api/sync');
}

/**
 * Run bank sync for one account, or for every linked account when no
 * `accountId` is given. Resolves with the ids of the transactions the sync
 * reconciled, so callers can tell an idle sync from one that imported
 * something without querying the transaction table themselves.
 */
export async function runBankSync(args?: {
  accountId: APIAccountEntity['id'];
}) {
  return send('api/bank-sync', args);
}

export async function batchBudgetUpdates(func: () => Promise<void>) {
  await send('api/batch-budget-start');
  try {
    await func();
  } finally {
    await send('api/batch-budget-end');
  }
}

/**
 * @deprecated Please use `aqlQuery` instead.
 * This function will be removed in a future release.
 */
export function runQuery(query: Query) {
  return send('api/query', { query: query.serialize() });
}

export function aqlQuery(query: Query) {
  return send('api/query', { query: query.serialize() });
}

export function getBudgetMonths() {
  return send('api/budget-months');
}

/**
 * Amounts are budget-currency integers. Pass `{ amountFormat: 'money' }` to
 * receive Money values in the budget currency.
 * Raw integers are the default during dual support; raw-integer responses
 * will be removed 12 months after Money support ships.
 */
export function getBudgetMonth(
  month: string,
  options?: { amountFormat?: 'raw' },
): Promise<APIBudgetMonth>;
export function getBudgetMonth(
  month: string,
  options: { amountFormat: 'money' },
): Promise<APIBudgetMonth<Money>>;
export function getBudgetMonth(
  month: string,
  options?: AmountFormatOptions,
): Promise<APIBudgetMonth | APIBudgetMonth<Money>>;
export function getBudgetMonth(
  month: string,
  options?: { amountFormat?: AmountFormat },
) {
  return send('api/budget-month', { month, options });
}

/**
 * `value` is a budget-currency integer or Money in the budget currency.
 * Raw integers are accepted during dual support; raw-integer support will
 * be removed 12 months after Money support ships.
 */
export function setBudgetAmount(
  month: string,
  categoryId: APICategoryEntity['id'],
  value: AmountInput,
) {
  return send('api/budget-set-amount', { month, categoryId, amount: value });
}

/** Adds a currency pocket to an expense category, or returns its slot. */
export function createPocket(
  categoryId: APICategoryEntity['id'],
  currency: string,
) {
  return send('api/pocket-create', { categoryId, currency });
}

/** Hides, shows or orders a currency slot; it changes no amount. */
export function updatePocket(
  id: string,
  fields: { hidden?: boolean; sortOrder?: number | null },
) {
  return send('api/pocket-update', { id, ...fields });
}

/**
 * Sets a currency slot's displayed budget for a month. `amount` is an
 * integer at `encoding` (`CUR.precision`), such as the pocket's reported
 * `currency` and `precision`; a different currency or an unsupported
 * precision returns `{ status: 'encoding-mismatch' }` and writes nothing.
 * `baseAmount` freezes the written cell's budget-currency equivalent.
 */
export function setPocketBudget(
  month: string,
  pocketId: string,
  amount: number,
  encoding: string,
  baseAmount?: number,
) {
  return send('api/pocket-budget-set', {
    month,
    pocketId,
    amount,
    encoding,
    ...(baseAmount !== undefined && { baseAmount }),
  });
}

/**
 * Finalizes pending budget-currency equivalents of named pocket cells, with
 * a supplied base or the entry rate on each cell's capture date.
 */
export function finalizePockets(
  cells: Array<{ month: string; laneId: string; baseAmount?: number }>,
) {
  return send('api/pockets-finalize', { cells });
}

/**
 * Deletes a currency pocket. A pocket with history needs a destination
 * category: its history moves to that category's pocket in the same
 * currency, so no budget figure changes. An empty pocket is removed.
 */
export function deletePocket(id: string, transferCategoryId?: string) {
  return send('api/pocket-delete', { id, transferCategoryId });
}

/**
 * Deletes a category's budget-currency child. Its history moves to the
 * destination category's base budget and the category keeps its currency
 * pockets, with an empty new base budget.
 */
export function deleteBaseChild(
  categoryId: APICategoryEntity['id'],
  transferCategoryId?: APICategoryEntity['id'],
) {
  return send('api/base-child-delete', { categoryId, transferCategoryId });
}

/**
 * Routes transactions to the budget pockets of their shown category, or of
 * `categoryId`, as if they were entered there now.
 */
export function routeToPockets(
  transactionIds: string[],
  categoryId?: APICategoryEntity['id'],
) {
  return send('api/route-to-pockets', { transactionIds, categoryId });
}

export function setBudgetCarryover(
  month: string,
  categoryId: APICategoryEntity['id'],
  flag: boolean,
) {
  return send('api/budget-set-carryover', { month, categoryId, flag });
}

/**
 * `amount` is a budget-base integer or Money in the budget currency.
 * Foreign-currency accounts also require `transaction_amount`, an
 * account-native integer or Money in the account currency.
 * Raw integers are accepted during dual support; raw-integer support will
 * be removed 12 months after Money support ships.
 */
export function addTransactions(
  accountId: APIAccountEntity['id'],
  transactions: Omit<APIImportTransactionInput, 'account'>[],
  {
    learnCategories = false,
    runTransfers = false,
  }: { learnCategories?: boolean; runTransfers?: boolean } = {},
) {
  return send('api/transactions-add', {
    accountId,
    transactions,
    learnCategories,
    runTransfers,
  });
}

/**
 * `amount` is a budget-base integer or Money in the budget currency.
 * Foreign-currency accounts also require `transaction_amount`, an
 * account-native integer or Money in the account currency. For those
 * accounts `amount` may be omitted: it is converted at the saved rate for
 * each transaction's date, and the import fails listing any dates without a
 * rate. A supplied `amount` is kept as given. Split transactions cannot be
 * imported into foreign-currency accounts yet.
 * Raw integers are accepted during dual support; raw-integer support will
 * be removed 12 months after Money support ships.
 */
export function importTransactions(
  accountId: APIAccountEntity['id'],
  transactions: APIImportTransactionInput[],
  opts: ImportTransactionsOpts = {
    defaultCleared: true,
    dryRun: false,
  },
) {
  return send('api/transactions-import', {
    accountId,
    transactions,
    isPreview: opts.dryRun,
    opts,
  });
}

/**
 * `amount` is a budget-base integer and `transaction_amount` an account-native
 * integer (foreign-currency accounts only). Pass `{ amountFormat: 'money' }`
 * to receive Money in the budget and account currency respectively.
 * Raw integers are the default during dual support; raw-integer responses
 * will be removed 12 months after Money support ships.
 */
export function getTransactions(
  accountId: APIAccountEntity['id'],
  startDate: string,
  endDate: string,
  options?: { amountFormat?: 'raw' },
): Promise<TransactionEntity[]>;
export function getTransactions(
  accountId: APIAccountEntity['id'],
  startDate: string,
  endDate: string,
  options: { amountFormat: 'money' },
): Promise<APIMoneyTransactionEntity[]>;
export function getTransactions(
  accountId: APIAccountEntity['id'],
  startDate: string,
  endDate: string,
  options?: AmountFormatOptions,
): Promise<TransactionEntity[] | APIMoneyTransactionEntity[]>;
export function getTransactions(
  accountId: APIAccountEntity['id'],
  startDate: string,
  endDate: string,
  options?: { amountFormat?: AmountFormat },
) {
  return send('api/transactions-get', {
    accountId,
    startDate,
    endDate,
    options,
  });
}

/**
 * `amount` is a budget-base integer or Money in the budget currency;
 * `transaction_amount` is account-native. Amounts of transactions in
 * foreign-currency accounts cannot change yet; other fields can.
 * Raw integers are accepted during dual support; raw-integer support will
 * be removed 12 months after Money support ships.
 */
export function updateTransaction(
  id: TransactionEntity['id'],
  fields: APITransactionUpdateFields,
) {
  return send('api/transaction-update', { id, fields });
}

export function deleteTransaction(id: TransactionEntity['id']) {
  return send('api/transaction-delete', { id });
}

export function mergeTransactions(
  ids: [TransactionEntity['id'], TransactionEntity['id']],
) {
  return send('api/transactions-merge', { ids });
}

export function getAccounts() {
  return send('api/accounts-get');
}

/**
 * Omit `currency` to inherit the budget currency. `initialBalance` is an
 * account-native integer or Money in the account currency.
 * Raw integers are accepted during dual support; raw-integer support will
 * be removed 12 months after Money support ships.
 */
export function createAccount(
  account: APIAccountCreateEntity,
  initialBalance?: AmountInput,
) {
  return send('api/account-create', { account, initialBalance });
}

export function updateAccount(
  id: APIAccountEntity['id'],
  fields: APIAccountUpdateFields,
) {
  return send('api/account-update', { id, fields });
}

export function closeAccount(
  id: APIAccountEntity['id'],
  transferAccountId?: APIAccountEntity['id'],
  transferCategoryId?: APICategoryEntity['id'],
) {
  return send('api/account-close', {
    id,
    transferAccountId,
    transferCategoryId,
  });
}

export function reopenAccount(id: APIAccountEntity['id']) {
  return send('api/account-reopen', { id });
}

export function deleteAccount(id: APIAccountEntity['id']) {
  return send('api/account-delete', { id });
}

/**
 * The balance is an account-native integer. Pass `{ amountFormat: 'money' }`
 * to receive Money in the account currency.
 * Raw integers are the default during dual support; raw-integer responses
 * will be removed 12 months after Money support ships.
 */
export function getAccountBalance(
  id: APIAccountEntity['id'],
  cutoff?: Date,
  options?: { amountFormat?: 'raw' },
): Promise<number>;
export function getAccountBalance(
  id: APIAccountEntity['id'],
  cutoff: Date | undefined,
  options: { amountFormat: 'money' },
): Promise<Money>;
export function getAccountBalance(
  id: APIAccountEntity['id'],
  cutoff?: Date,
  options?: AmountFormatOptions,
): Promise<number | Money>;
export function getAccountBalance(
  id: APIAccountEntity['id'],
  cutoff?: Date,
  options?: { amountFormat?: AmountFormat },
) {
  return send('api/account-balance', { id, cutoff, options });
}

export function getAccountGroups() {
  return send('api/account-groups-get');
}

export function createAccountGroup(group: Omit<APIAccountGroupEntity, 'id'>) {
  return send('api/account-group-create', { group });
}

export function updateAccountGroup(
  id: APIAccountGroupEntity['id'],
  fields: Partial<Omit<APIAccountGroupEntity, 'id'>>,
) {
  return send('api/account-group-update', { id, fields });
}

export function deleteAccountGroup(id: APIAccountGroupEntity['id']) {
  return send('api/account-group-delete', { id });
}

export function getCategoryGroups(options: { hidden?: boolean } = {}) {
  return send('api/category-groups-get', options);
}

export function createCategoryGroup(group: Omit<APICategoryGroupEntity, 'id'>) {
  return send('api/category-group-create', { group });
}

export function updateCategoryGroup(
  id: APICategoryGroupEntity['id'],
  fields: Partial<APICategoryGroupEntity>,
) {
  return send('api/category-group-update', { id, fields });
}

export function deleteCategoryGroup(
  id: APICategoryGroupEntity['id'],
  transferCategoryId?: APICategoryEntity['id'],
) {
  return send('api/category-group-delete', { id, transferCategoryId });
}

export function getCategories(options: { hidden?: boolean } = {}) {
  return send('api/categories-get', options);
}

export function createCategory(category: Omit<APICategoryEntity, 'id'>) {
  return send('api/category-create', { category });
}

export function updateCategory(
  id: APICategoryEntity['id'],
  fields: Partial<APICategoryEntity>,
) {
  return send('api/category-update', { id, fields });
}

export function deleteCategory(
  id: APICategoryEntity['id'],
  transferCategoryId?: APICategoryEntity['id'],
) {
  return send('api/category-delete', { id, transferCategoryId });
}

export function getNote(id: NoteEntity['id']) {
  return send('api/note-get', { id });
}

export function updateNote(id: NoteEntity['id'], note: NoteEntity['note']) {
  return send('api/note-update', { id, note });
}

export function getCommonPayees() {
  return send('api/common-payees-get');
}

export function getPayees() {
  return send('api/payees-get');
}

export function createPayee(payee: Omit<APIPayeeEntity, 'id'>) {
  return send('api/payee-create', { payee });
}

export function updatePayee(
  id: APIPayeeEntity['id'],
  fields: Partial<APIPayeeEntity>,
) {
  return send('api/payee-update', { id, fields });
}

export function deletePayee(id: APIPayeeEntity['id']) {
  return send('api/payee-delete', { id });
}

export function getTags() {
  return send('api/tags-get');
}

export function createTag(tag: Omit<APITagEntity, 'id'>) {
  return send('api/tag-create', { tag });
}

export function updateTag(
  id: APITagEntity['id'],
  fields: Partial<Omit<APITagEntity, 'id'>>,
) {
  return send('api/tag-update', { id, fields });
}

export function deleteTag(id: APITagEntity['id']) {
  return send('api/tag-delete', { id });
}

export function mergePayees(
  targetId: APIPayeeEntity['id'],
  mergeIds: APIPayeeEntity['id'][],
) {
  return send('api/payees-merge', { targetId, mergeIds });
}

export function getRules() {
  return send('api/rules-get');
}

export function getPayeeRules(id: RuleEntity['id']) {
  return send('api/payee-rules-get', { id });
}

export function createRule(rule: Omit<APIRuleEntity, 'id'>) {
  return send('api/rule-create', { rule });
}

export function updateRule(rule: APIRuleEntity) {
  return send('api/rule-update', { rule });
}

export function deleteRule(id: RuleEntity['id']) {
  return send('api/rule-delete', id);
}

export function holdBudgetForNextMonth(month: string, amount: number) {
  return send('api/budget-hold-for-next-month', { month, amount });
}

export function resetBudgetHold(month: string) {
  return send('api/budget-reset-hold', { month });
}

export function createSchedule(schedule: Omit<APIScheduleEntity, 'id'>) {
  return send('api/schedule-create', schedule);
}

export function updateSchedule(
  id: APIScheduleEntity['id'],
  fields: Partial<APIScheduleEntity>,
  resetNextDate?: boolean,
) {
  return send('api/schedule-update', {
    id,
    fields,
    resetNextDate,
  });
}

export function deleteSchedule(scheduleId: APIScheduleEntity['id']) {
  return send('api/schedule-delete', scheduleId);
}

export function getSchedules() {
  return send('api/schedules-get');
}

export function getScheduleDates(
  date: APIScheduleEntity['date'],
  options: { start?: string; end?: string; count?: number } = {},
) {
  return send('api/schedule-dates-get', { date, ...options });
}

export function getIDByName(
  type: 'accounts' | 'schedules' | 'categories' | 'payees',
  name: string,
) {
  return send('api/get-id-by-name', { type, name });
}

export function getServerVersion() {
  return send('api/get-server-version');
}

/** Read the budget's synced preferences (number format, currency, etc.). */
export function getPreferences(): Promise<SyncedPrefs> {
  return send('preferences/get');
}

export function setPreference<T extends keyof SyncedPrefs>(
  id: T,
  value: SyncedPrefs[T] | undefined,
): Promise<void> {
  return send('preferences/save', { id, value });
}
