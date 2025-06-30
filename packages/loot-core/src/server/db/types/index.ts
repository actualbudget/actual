// These are the types that exactly match the database schema.
// The `Entity` types e.g. `TransactionEntity`, `AccountEntity`, etc
// are specific to the AQL query framework and does not necessarily
// match the actual database schema.

type JsonString = string;

export type DbAccount = {
  id: string;
  name: string;
  offbudget: 1 | 0;
  closed: 1 | 0;
  tombstone: 1 | 0;
  sort_order: number;
  account_id?: string | null;
  balance_current?: number | null;
  balance_available?: number | null;
  balance_limit?: number | null;
  mask?: string | null;
  official_name?: string | null;
  type?: string | null;
  subtype?: string | null;
  bank?: string | null;
  account_sync_source?: 'simpleFin' | 'goCardless' | null;
};

export type DbBank = {
  id: string;
  bank_id: string;
  name: string;
  tombstone: 1 | 0;
};

export type DbCategory = {
  id: string;
  name: string;
  is_income: 1 | 0;
  cat_group: DbCategoryGroup['id'];
  sort_order: number;
  hidden: 1 | 0;
  goal_def?: JsonString | null;
  tombstone: 1 | 0;
};

export type DbCategoryGroup = {
  id: string;
  name: string;
  is_income: 1 | 0;
  sort_order: number;
  hidden: 1 | 0;
  tombstone: 1 | 0;
};

export type DbCategoryMapping = {
  id: DbCategory['id'];
  transferId: DbCategory['id'];
};

export type DbKvCache = {
  key: string;
  value: string;
};

export type DbKvCacheKey = {
  id: number;
  key: number;
};

export type DbClockMessage = {
  id: string;
  clock: string;
};

export type DbCrdtMessage = {
  id: string;
  timestamp: string;
  dataset: string;
  row: string;
  column: string;
  value: Uint8Array;
};

export type DbNote = {
  id: string;
  note: string;
};

export type DbPayeeMapping = {
  id: DbPayee['id'];
  targetId: DbPayee['id'];
};

export type DbPayee = {
  id: string;
  name: string;
  transfer_acct?: DbAccount['id'] | null;
  favorite: 1 | 0;
  learn_categories: 1 | 0;
  tombstone: 1 | 0;
  // Unused in the codebase
  category?: string | null;
};

export type DbRule = {
  id: string;
  stage: string;
  conditions: JsonString;
  actions: JsonString;
  tombstone: 1 | 0;
  conditions_op: string;
};

export type DbSchedule = {
  id: string;
  name: string;
  rule: DbRule['id'];
  active: 1 | 0;
  completed: 1 | 0;
  posts_transaction: 1 | 0;
  tombstone: 1 | 0;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type DbScheduleJsonPath = {
  schedule_id: DbSchedule['id'];
  payee: string;
  account: string;
  amount: string;
  date: string;
};

export type DbScheduleNextDate = {
  id: string;
  schedule_id: DbSchedule['id'];
  local_next_date: number;
  local_next_date_ts: number;
  base_next_date: number;
  base_next_date_ts: number;
};

// This is unused in the codebase.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type DbPendingTransaction = {
  id: string;
  acct: number;
  amount: number;
  description: string;
  date: string;
};

export type DbTransaction = {
  id: string;
  isParent: 1 | 0;
  isChild: 1 | 0;
  date: number;
  acct: DbAccount['id'];
  amount: number;
  sort_order: number;
  parent_id?: DbTransaction['id'] | null;
  category?: DbCategory['id'] | null;
  description?: string | null;
  notes?: string | null;
  financial_id?: string | null;
  error?: string | null;
  imported_description?: string | null;
  transferred_id?: DbTransaction['id'] | null;
  schedule?: DbSchedule['id'] | null;
  starting_balance_flag: 1 | 0;
  tombstone: 1 | 0;
  cleared: 1 | 0;
  reconciled: 1 | 0;
  // Unused in the codebase
  pending?: 1 | 0 | null;
  location?: string | null;
  type?: string | null;
};

export type DbReflectBudget = {
  id: string;
  month: number;
  category: string;
  amount: number;
  carryover: number;
  goal: number;
  long_goal: number;
};

export type DbZeroBudgetMonth = {
  id: string;
  buffered: number;
};

export type DbZeroBudget = {
  id: string;
  month: number;
  category: string;
  amount: number;
  carryover: number;
  goal: number;
  long_goal: number;
};

export type DbTransactionFilter = {
  id: string;
  name: string;
  conditions: JsonString;
  conditions_op: string;
  tombstone: 1 | 0;
};

export type DbPreference = {
  id: string;
  value: string;
};

export type DbCustomReport = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  date_static: number;
  date_range: string;
  mode: string;
  group_by: string;
  balance_type: string;
  show_empty: 1 | 0;
  show_offbudget: 1 | 0;
  show_hidden: 1 | 0;
  show_uncateogorized: 1 | 0;
  selected_categories: string;
  graph_type: string;
  conditions: JsonString;
  conditions_op: string;
  metadata: JsonString;
  interval: string;
  color_scheme: string;
  include_current: 1 | 0;
  sort_by: string;
  tombstone: 1 | 0;
};

export type DbDashboard = {
  id: string;
  type: string;
  width: number;
  height: number;
  x: number;
  y: number;
  meta: JsonString;
  tombstone: 1 | 0;
};

export type DbViewTransactionInternal = {
  id: DbTransaction['id'];
  is_parent: DbTransaction['isParent'];
  is_child: DbTransaction['isChild'];
  date: DbTransaction['date'];
  account: DbAccount['id'];
  amount: DbTransaction['amount'];
  parent_id: DbTransaction['parent_id'] | null;
  category: DbCategory['id'] | null;
  payee: DbPayee['id'] | null;
  notes: DbTransaction['notes'] | null;
  imported_id: DbTransaction['financial_id'] | null;
  error: DbTransaction['error'] | null;
  imported_payee: DbTransaction['imported_description'] | null;
  starting_balance_flag: DbTransaction['starting_balance_flag'] | null;
  transfer_id: DbTransaction['transferred_id'] | null;
  schedule: DbSchedule['id'] | null;
  sort_order: DbTransaction['sort_order'];
  cleared: DbTransaction['cleared'];
  tombstone: DbTransaction['tombstone'];
  reconciled: DbTransaction['reconciled'];
};

export type DbViewTransactionInternalAlive = DbViewTransactionInternal;
export type DbViewTransaction = DbViewTransactionInternalAlive;

export type DbViewCategory = {
  id: DbCategory['id'];
  name: DbCategory['name'];
  is_income: DbCategory['is_income'];
  hidden: DbCategory['hidden'];
  group: DbCategoryGroup['id'];
  sort_order: DbCategory['sort_order'];
  tombstone: DbCategory['tombstone'];
};

export type DbViewCategoryWithGroupHidden = {
  id: DbCategory['id'];
  name: DbCategory['name'];
  is_income: DbCategory['is_income'];
  hidden: DbCategory['hidden'];
  group: DbCategoryGroup['id'];
  group_hidden: DbCategoryGroup['hidden'];
  sort_order: DbCategory['sort_order'];
  tombstone: DbCategory['tombstone'];
};

export type DbViewPayee = {
  id: DbPayee['id'];
  name: DbAccount['name'] | DbPayee['name'];
  transfer_acct: DbPayee['transfer_acct'];
  tombstone: DbPayee['tombstone'];
};

export type DbViewSchedule = {
  id: DbSchedule['id'];
  name: DbSchedule['name'];
  rule: DbSchedule['rule'];
  next_date:
    | DbScheduleNextDate['local_next_date_ts']
    | DbScheduleNextDate['local_next_date']
    | DbScheduleNextDate['base_next_date'];
  active: DbSchedule['active'];
  completed: DbSchedule['completed'];
  posts_transaction: DbSchedule['posts_transaction'];
  tombstone: DbSchedule['tombstone'];
  _payee: DbPayeeMapping['targetId'];
  _account: DbAccount['id'];
  _amount: number;
  _amountOp: string;
  _date: JsonString;
  _conditions: JsonString;
  _actions: JsonString;
};
