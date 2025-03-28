/* eslint-disable rulesdir/typography */
import { and, Column, eq, isNotNull, isNull, or, sql } from 'drizzle-orm';
import {
  AnyPgColumn,
  bigint,
  boolean,
  customType,
  date,
  index,
  integer,
  jsonb,
  PgColumnBuilderBase,
  pgTable,
  pgView,
  text,
  varchar,
} from 'drizzle-orm/pg-core';

import {
  DbAccount,
  DbBank,
  DbCategory,
  DbCategoryGroup,
  DbCategoryMapping,
  DbClockMessage,
  DbCrdtMessage,
  DbCustomReport,
  DbDashboard,
  DbKvCache,
  DbKvCacheKey,
  DbNote,
  DbPayee,
  DbPayeeMapping,
  DbPreference,
  DbReflectBudget,
  DbRule,
  DbSchedule,
  DbScheduleJsonPath,
  DbScheduleNextDate,
  DbTransaction,
  DbTransactionFilter,
  DbViewCategory,
  DbViewPayee,
  DbViewSchedule,
  DbViewTransaction,
  DbViewTransactionInternal,
  DbViewTransactionInternalAlive,
  DbZeroBudget,
  DbZeroBudgetMonth,
} from '../types';

const bytea = customType<{
  // data: Buffer;
  data: Uint8Array;
  default: false;
}>({
  dataType() {
    return 'bytea';
  },
});

function isFalse(column: Column) {
  return sql`${column} IS FALSE`;
}

export const banksTable = pgTable<
  'banks',
  Record<keyof DbBank, PgColumnBuilderBase>
>(
  'banks',
  {
    id: varchar({ length: 36 }).primaryKey(),
    name: text(),
    bank_id: text(),
    tombstone: boolean().default(false),
  },
  table => [index().on(table.bank_id), index().on(table.tombstone)],
);

export const accountsTable = pgTable<
  'accounts',
  Record<keyof DbAccount, PgColumnBuilderBase>
>(
  'accounts',
  {
    id: varchar({ length: 36 }).primaryKey(),
    name: text(),
    offbudget: boolean().default(false),
    closed: boolean().default(false),
    sort_order: bigint({ mode: 'number' }),
    account_id: text(),
    balance_current: bigint({ mode: 'number' }),
    balance_available: bigint({ mode: 'number' }),
    balance_limit: bigint({ mode: 'number' }),
    mask: text(),
    official_name: text(),
    type: text(),
    subtype: text(),
    bank: varchar({ length: 36 }).references(() => banksTable.id),
    account_sync_source: text(),
    tombstone: boolean().default(false),
  },
  table => [
    index().on(table.bank),
    index().on(table.account_id),
    index().on(table.closed),
    index().on(table.offbudget),
    index().on(table.sort_order),
    index().on(table.tombstone),
  ],
);

export const categoryGroupsTable = pgTable<
  'category_groups',
  Record<keyof DbCategoryGroup, PgColumnBuilderBase>
>(
  'category_groups',
  {
    id: varchar({ length: 36 }).primaryKey(),
    name: text(),
    is_income: boolean().default(false),
    sort_order: bigint({ mode: 'number' }),
    hidden: boolean().default(false),
    tombstone: boolean().default(false),
  },
  table => [
    index().on(table.is_income),
    index().on(table.hidden),
    index().on(table.sort_order),
    index().on(table.tombstone),
  ],
);

export const categoriesTable = pgTable<
  'categories',
  Record<keyof DbCategory, PgColumnBuilderBase>
>(
  'categories',
  {
    id: varchar({ length: 36 }).primaryKey(),
    name: text(),
    is_income: boolean().default(false),
    cat_group: varchar({ length: 36 }).references(() => categoryGroupsTable.id),
    sort_order: bigint({ mode: 'number' }),
    hidden: boolean().default(false),
    goal_def: jsonb(),
    tombstone: boolean().default(false),
  },
  table => [
    index().on(table.cat_group),
    index().on(table.is_income),
    index().on(table.hidden),
    index().on(table.sort_order),
    index().on(table.tombstone),
  ],
);

export const categoryMappingTable = pgTable<
  'category_mapping',
  Record<keyof DbCategoryMapping, PgColumnBuilderBase>
>(
  'category_mapping',
  {
    id: varchar({ length: 36 })
      .primaryKey()
      .references(() => categoriesTable.id),
    transferId: varchar({ length: 36 }).references(() => categoriesTable.id),
  },
  table => [index().on(table.transferId)],
);

export const kvCacheTable = pgTable<
  'kv_cache',
  Record<keyof DbKvCache, PgColumnBuilderBase>
>('kv_cache', {
  key: text().primaryKey(),
  value: text(),
});

export const kvCacheKeyTable = pgTable<
  'kv_cache_key',
  Record<keyof DbKvCacheKey, PgColumnBuilderBase>
>(
  'kv_cache_key',
  {
    id: varchar({ length: 36 }).primaryKey(),
    key: text().references(() => kvCacheTable.key),
  },
  table => [index().on(table.key)],
);

export const messagesClockTable = pgTable<
  'messages_clock',
  Record<keyof DbClockMessage, PgColumnBuilderBase>
>('messages_clock', {
  id: varchar({ length: 36 }).primaryKey(),
  clock: jsonb(),
});

export const messagesCrdtTable = pgTable<
  'messages_crdt',
  Record<keyof DbCrdtMessage, PgColumnBuilderBase>
>(
  'messages_crdt',
  {
    id: varchar({ length: 36 }).primaryKey(),
    timestamp: text(),
    dataset: text(),
    row: varchar({ length: 36 }),
    column: text(),
    value: bytea(),
  },
  table => [
    index().on(table.dataset),
    index().on(table.row),
    index().on(table.column),
    index().on(table.timestamp),
  ],
);

export const notesTable = pgTable<
  'notes',
  Record<keyof DbNote, PgColumnBuilderBase>
>('notes', {
  id: varchar({ length: 36 }).primaryKey(),
  note: text(),
});

export const payeesTable = pgTable<
  'payees',
  Record<keyof DbPayee, PgColumnBuilderBase>
>(
  'payees',
  {
    id: varchar({ length: 36 }).primaryKey(),
    name: text(),
    transfer_acct: varchar({ length: 36 }).references(() => accountsTable.id),
    favorite: boolean().default(false),
    learn_categories: boolean().default(true),
    tombstone: boolean().default(false),
    // Unused in codebase. Can this be removed?
    category: text(),
  },
  table => [
    index().on(table.transfer_acct),
    index().on(table.favorite),
    index().on(table.learn_categories),
    index().on(table.tombstone),
  ],
);

export const payeeMappingTable = pgTable<
  'payee_mapping',
  Record<keyof DbPayeeMapping, PgColumnBuilderBase>
>(
  'payee_mapping',
  {
    id: varchar({ length: 36 })
      .primaryKey()
      .references(() => payeesTable.id),
    targetId: varchar({ length: 36 }).references(() => payeesTable.id),
  },
  table => [index().on(table.targetId)],
);

export const rulesTable = pgTable<
  'rules',
  Record<keyof DbRule, PgColumnBuilderBase>
>(
  'rules',
  {
    id: varchar({ length: 36 }).primaryKey(),
    stage: text({ enum: ['pre', 'post'] }),
    // Consider indexing in the future.
    conditions: jsonb(),
    // Consider indexing in the future.
    actions: jsonb(),
    tombstone: boolean().default(false),
    conditions_op: text({ enum: ['and', 'or'] }),
  },
  table => [index().on(table.tombstone)],
);

export const schedulesTable = pgTable<
  'schedules',
  Record<keyof DbSchedule, PgColumnBuilderBase>
>(
  'schedules',
  {
    id: varchar({ length: 36 }).primaryKey(),
    name: text(),
    rule: varchar({ length: 36 }).references(() => rulesTable.id),
    active: boolean().default(false),
    completed: boolean().default(false),
    posts_transaction: boolean().default(false),
    tombstone: boolean().default(false),
  },
  table => [index().on(table.rule), index().on(table.tombstone)],
);

/**
 * This may no longer be needed since postgresql natively
 * supports querying jsonb columns.
 */
export const schedulesJsonPathTable = pgTable<
  'schedules_json_paths',
  Record<keyof DbScheduleJsonPath, PgColumnBuilderBase>
>('schedules_json_paths', {
  schedule_id: varchar({ length: 36 })
    .primaryKey()
    .references(() => schedulesTable.id),
  payee: text(),
  account: text(),
  amount: text(),
  date: text(),
});

export const schedulesNextDateTable = pgTable<
  'schedules_next_date',
  Record<keyof DbScheduleNextDate, PgColumnBuilderBase>
>(
  'schedules_next_date',
  {
    id: varchar({ length: 36 }).primaryKey(),
    schedule_id: varchar({ length: 36 })
      .unique()
      .references(() => schedulesTable.id),
    local_next_date: date(),
    local_next_date_ts: bigint({ mode: 'number' }),
    base_next_date: date(),
    base_next_date_ts: bigint({ mode: 'number' }),
    tombstone: boolean().default(false),
  },
  table => [index().on(table.tombstone)],
);

export const transactionsTable = pgTable<
  'transactions',
  Record<keyof DbTransaction, PgColumnBuilderBase>
>(
  'transactions',
  {
    id: varchar({ length: 36 }).primaryKey(),
    isParent: boolean().default(false),
    isChild: boolean().default(false),
    acct: varchar({ length: 36 }).references(() => accountsTable.id),
    category: varchar({ length: 36 }).references(() => categoriesTable.id),
    amount: bigint({ mode: 'number' }),
    description: varchar({ length: 36 }),
    notes: text(),
    date: date(),
    // Need to add AnyPgColumn when self-referencing
    // https://orm.drizzle.team/docs/indexes-constraints#foreign-key
    parent_id: varchar({ length: 36 }).references(
      (): AnyPgColumn => transactionsTable.id,
    ),
    financial_id: text(),
    error: jsonb(),
    imported_description: text(),
    // Need to add AnyPgColumn when self-referencing
    // https://orm.drizzle.team/docs/indexes-constraints#foreign-key
    transferred_id: varchar({ length: 36 }).references(
      (): AnyPgColumn => transactionsTable.id,
    ),
    schedule: varchar({ length: 36 }).references(() => schedulesTable.id),
    sort_order: bigint({ mode: 'number' }),
    starting_balance_flag: boolean().default(false),
    tombstone: boolean().default(false),
    cleared: boolean().default(true),
    reconciled: boolean().default(false),
    // Unused in codebase. Can this be removed?
    pending: boolean(),
    location: text(),
    type: text(),
  },
  table => [
    index().on(table.isParent),
    index().on(table.isChild),
    index().on(table.acct),
    index().on(table.category),
    index().on(table.amount),
    index().on(table.description),
    index().on(table.notes),
    index().on(table.date),
    index().on(table.parent_id),
    index().on(table.financial_id),
    index().on(table.transferred_id),
    index().on(table.schedule),
    index().on(table.sort_order),
    index().on(table.starting_balance_flag),
    index().on(table.cleared),
    index().on(table.reconciled),
    index().on(table.tombstone),
  ],
);

export const reflectBudgetsTable = pgTable<
  'reflect_budgets',
  Record<keyof DbReflectBudget, PgColumnBuilderBase>
>(
  'reflect_budgets',
  {
    id: text().primaryKey(),
    month: date(),
    category: varchar({ length: 36 }).references(() => categoriesTable.id),
    amount: bigint({ mode: 'number' }),
    carryover: boolean().default(false),
    goal: bigint({ mode: 'number' }),
    long_goal: bigint({ mode: 'number' }),
  },
  table => [index().on(table.month), index().on(table.category)],
);

export const zeroBudgetsTable = pgTable<
  'zero_budgets',
  Record<keyof DbZeroBudget, PgColumnBuilderBase>
>(
  'zero_budgets',
  {
    id: text().primaryKey(),
    month: date(),
    category: varchar({ length: 36 }).references(() => categoriesTable.id),
    amount: bigint({ mode: 'number' }),
    carryover: boolean().default(false),
    goal: bigint({ mode: 'number' }),
    long_goal: bigint({ mode: 'number' }),
  },
  table => [index().on(table.month), index().on(table.category)],
);

export const zeroBudgetMonthsTable = pgTable<
  'zero_budget_months',
  Record<keyof DbZeroBudgetMonth, PgColumnBuilderBase>
>('zero_budget_months', {
  id: text().primaryKey(),
  buffered: bigint({ mode: 'number' }),
});

export const transactionFiltersTable = pgTable<
  'transaction_filters',
  Record<keyof DbTransactionFilter, PgColumnBuilderBase>
>(
  'transaction_filters',
  {
    id: varchar({ length: 36 }).primaryKey(),
    name: text(),
    // Consider indexing in the future.
    conditions: jsonb(),
    conditions_op: text({ enum: ['and', 'or'] }),
    tombstone: boolean().default(false),
  },
  table => [index().on(table.tombstone)],
);

export const preferencesTable = pgTable<
  'preferences',
  Record<keyof DbPreference, PgColumnBuilderBase>
>('preferences', {
  id: text().primaryKey(),
  value: text(),
});

export const customReportsTable = pgTable<
  'custom_reports',
  Record<keyof DbCustomReport, PgColumnBuilderBase>
>(
  'custom_reports',
  {
    id: varchar({ length: 36 }).primaryKey(),
    name: text(),
    start_date: date(),
    end_date: date(),
    date_static: bigint({ mode: 'number' }),
    date_range: text(),
    mode: text(),
    group_by: text(),
    balance_type: text(),
    show_empty: boolean().default(false),
    show_offbudget: boolean().default(false),
    show_hidden: boolean().default(false),
    show_uncateogorized: boolean().default(false),
    selected_categories: text(),
    graph_type: text(),
    // Consider indexing in the future.
    conditions: jsonb(),
    conditions_op: text({ enum: ['and', 'or'] }),
    metadata: jsonb(),
    interval: text(),
    color_scheme: text(),
    include_current: boolean().default(false),
    sort_by: text(),
    tombstone: boolean().default(false),
  },
  table => [index().on(table.tombstone)],
);

export const dashboardTable = pgTable<
  'dashboard',
  Record<keyof DbDashboard, PgColumnBuilderBase>
>(
  'dashboard',
  {
    id: varchar({ length: 36 }).primaryKey(),
    type: text(),
    width: integer(),
    height: integer(),
    x: integer(),
    y: integer(),
    meta: jsonb(),
    tombstone: boolean().default(false),
  },
  table => [index().on(table.tombstone)],
);

const transactionsInternalViewColumns = {
  id: varchar({ length: 36 }),
  is_parent: boolean(),
  is_child: boolean(),
  parent_id: varchar({ length: 36 }),
  account: varchar({ length: 36 }),
  category: varchar({ length: 36 }),
  amount: bigint({ mode: 'number' }),
  payee: varchar({ length: 36 }),
  notes: text(),
  date: date(),
  imported_id: text(),
  error: jsonb(),
  imported_payee: text(),
  starting_balance_flag: boolean(),
  transfer_id: varchar({ length: 36 }),
  schedule: varchar({ length: 36 }),
  cleared: boolean(),
  reconciled: boolean(),
  tombstone: boolean(),
  sort_order: bigint({ mode: 'number' }),
};

export const transactionsInternalView = pgView(
  'v_transactions_internal',
  transactionsInternalViewColumns satisfies Record<
    keyof DbViewTransactionInternal,
    PgColumnBuilderBase
  >,
).as(
  sql`
    SELECT
      ${transactionsTable.id},
      ${transactionsTable.isParent} AS is_parent,
      ${transactionsTable.isChild} AS is_child,
      CASE WHEN ${transactionsTable.isChild} IS FALSE THEN NULL ELSE ${transactionsTable.parent_id} END AS parent_id,
      ${transactionsTable.acct} AS account,
      CASE WHEN ${transactionsTable.isParent} IS TRUE THEN NULL ELSE ${categoryMappingTable.transferId} END AS category,
      COALESCE(${transactionsTable.amount}, 0) AS amount,
      ${payeeMappingTable.targetId} AS payee,
      ${transactionsTable.notes},
      ${transactionsTable.date},
      ${transactionsTable.financial_id} AS imported_id,
      ${transactionsTable.error},
      ${transactionsTable.imported_description} AS imported_payee,
      ${transactionsTable.starting_balance_flag},
      ${transactionsTable.transferred_id} AS transfer_id,
      ${transactionsTable.schedule},
      ${transactionsTable.cleared},
      ${transactionsTable.reconciled},
      ${transactionsTable.tombstone},
      ${transactionsTable.sort_order}
    FROM
      ${transactionsTable}
    LEFT JOIN
      ${categoryMappingTable}
        ON ${transactionsTable.category} = ${categoryMappingTable.id}
    LEFT JOIN
      ${payeeMappingTable}
        ON ${transactionsTable.description} = ${payeeMappingTable.id}
    WHERE
      ${transactionsTable.date} IS NOT NULL
      AND ${transactionsTable.acct} IS NOT NULL
      AND (${transactionsTable.isChild} IS FALSE OR ${transactionsTable.parent_id} IS NOT NULL)
  `,
);

export const transactionsInternalViewAlive = pgView(
  'v_transactions_internal_alive',
  transactionsInternalViewColumns satisfies Record<
    keyof DbViewTransactionInternalAlive,
    PgColumnBuilderBase
  >,
).as(
  sql`
    SELECT
      ${transactionsInternalView}.*
    FROM
      ${transactionsInternalView}
    LEFT JOIN
      ${transactionsTable}
        ON (${transactionsTable.isChild} IS TRUE
        AND ${transactionsTable.id} = ${transactionsInternalView.parent_id})
    WHERE
      COALESCE(${transactionsTable.tombstone}, FALSE) IS FALSE
      AND (${transactionsInternalView.is_child} IS FALSE OR ${transactionsTable.tombstone} IS FALSE)
  `,
);

export const transactionsView = pgView(
  'v_transactions',
  transactionsInternalViewColumns satisfies Record<
    keyof DbViewTransaction,
    PgColumnBuilderBase
  >,
).as(
  sql`
    SELECT
      ${transactionsInternalViewAlive.id},
      ${transactionsInternalViewAlive.is_parent},
      ${transactionsInternalViewAlive.is_child},
      ${transactionsInternalViewAlive.parent_id},
      ${accountsTable.id} AS account,
      ${categoriesTable.id} AS category,
      ${transactionsInternalViewAlive.amount},
      ${payeesTable.id} AS payee,
      ${transactionsInternalViewAlive.notes},
      ${transactionsInternalViewAlive.date},
      ${transactionsInternalViewAlive.imported_id},
      ${transactionsInternalViewAlive.error},
      ${transactionsInternalViewAlive.imported_payee},
      ${transactionsInternalViewAlive.starting_balance_flag},
      ${transactionsInternalViewAlive.transfer_id},
      ${transactionsInternalViewAlive.sort_order},
      ${transactionsInternalViewAlive.cleared},
      ${transactionsInternalViewAlive.reconciled},
      ${transactionsInternalViewAlive.tombstone},
      ${transactionsInternalViewAlive.schedule}
    FROM
      ${transactionsInternalViewAlive}
    LEFT JOIN
      ${payeesTable}
        ON (${payeesTable.id} = ${transactionsInternalViewAlive.payee}
        AND ${payeesTable.tombstone} IS FALSE)
    LEFT JOIN
      ${categoriesTable}
        ON (${categoriesTable.id} = ${transactionsInternalViewAlive.category}
        AND ${categoriesTable.tombstone} IS FALSE)
    LEFT JOIN
      ${accountsTable}
        ON (${accountsTable.id} = ${transactionsInternalViewAlive.account}
        AND ${accountsTable.tombstone} IS FALSE)
    ORDER BY
      ${transactionsInternalViewAlive.date} DESC,
      ${transactionsInternalViewAlive.starting_balance_flag},
      ${transactionsInternalViewAlive.sort_order} DESC,
      ${transactionsInternalViewAlive.id}
  `,
);

export const categoriesView = pgView('v_categories').as(qb =>
  qb
    .select({
      id: categoriesTable.id,
      name: categoriesTable.name,
      is_income: categoriesTable.is_income,
      hidden: categoriesTable.hidden,
      group: sql`${categoriesTable.cat_group}`.as('group'),
      sort_order: categoriesTable.sort_order,
      tombstone: categoriesTable.tombstone,
    } satisfies Record<keyof DbViewCategory, unknown>)
    .from(categoriesTable),
);

export const payeesView = pgView('v_payees').as(qb =>
  qb
    .select({
      id: payeesTable.id,
      name: sql`COALESCE(${accountsTable.name}, ${payeesTable.name})`.as(
        'name',
      ),
      transfer_acct: payeesTable.transfer_acct,
      favorite: payeesTable.favorite,
      learn_categories: payeesTable.learn_categories,
      tombstone: payeesTable.tombstone,
    } satisfies Record<keyof DbViewPayee, unknown>)
    .from(payeesTable)
    .leftJoin(
      accountsTable,
      and(
        eq(payeesTable.transfer_acct, accountsTable.id),
        isFalse(accountsTable.tombstone),
      ),
    )
    // We never want to show transfer payees that are pointing to deleted accounts.
    // Either this is not a transfer payee, if the account exists
    .where(or(isNull(payeesTable.transfer_acct), isNotNull(accountsTable.id))),
);

export const schedulesView = pgView('v_schedules', {
  id: varchar({ length: 36 }),
  name: text(),
  rule: varchar({ length: 36 }),
  next_date: date(),
  completed: boolean(),
  posts_transaction: boolean(),
  active: boolean(),
  tombstone: boolean(),
  _payee: varchar({ length: 36 }),
  _account: varchar({ length: 36 }),
  _amount: text(),
  _amountOp: text(),
  _date: jsonb(),
  _conditions: jsonb(),
  _actions: jsonb(),
} satisfies Record<keyof DbViewSchedule, PgColumnBuilderBase>).as(
  sql`
    WITH parsed_rule_conditions AS (
      SELECT
        ${rulesTable.id} AS rule_id,
        jsonb_extract_path_text(condition, 'value') AS value,
        condition ->> 'field' AS field,
        condition ->> 'op' AS op
      FROM
        ${rulesTable}
      CROSS JOIN
        jsonb_array_elements(${rulesTable.conditions}::jsonb) AS condition
    )
    SELECT
        ${schedulesTable.id},
        ${schedulesTable.name},
        ${schedulesTable.rule},
        CASE
            WHEN ${schedulesNextDateTable.local_next_date_ts} = ${schedulesNextDateTable.base_next_date_ts} THEN ${schedulesNextDateTable.local_next_date}
            ELSE ${schedulesNextDateTable.base_next_date}
        END AS next_date,
        ${schedulesTable.completed},
        ${schedulesTable.posts_transaction},
        ${schedulesTable.tombstone},
        ${payeeMappingTable.targetId} AS _payee,
        account_condition.value AS _account,
        amount_condition.value AS _amount,
        amount_condition.op AS _amountOp,
        date_condition.value AS _date,
        ${rulesTable.conditions} AS _conditions,
        ${rulesTable.actions} AS _actions
    FROM
        ${schedulesTable}
    LEFT JOIN
        ${schedulesNextDateTable} ON ${schedulesNextDateTable.schedule_id} = ${schedulesTable.id}
    LEFT JOIN
        ${rulesTable} ON ${rulesTable.id} = ${schedulesTable.rule}
    LEFT JOIN
        parsed_rule_conditions payee_condition
          ON payee_condition.rule_id = ${rulesTable.id}
            AND payee_condition.field = 'payee'
    LEFT JOIN
        ${payeeMappingTable} ON ${payeeMappingTable.id} = payee_condition.value
    LEFT JOIN
        parsed_rule_conditions account_condition
          ON account_condition.rule_id = ${rulesTable.id}
            AND account_condition.field = 'account'
    LEFT JOIN
        parsed_rule_conditions amount_condition
          ON amount_condition.rule_id = ${rulesTable.id}
            AND amount_condition.field = 'amount'
    LEFT JOIN
        parsed_rule_conditions date_condition
          ON date_condition.rule_id = ${rulesTable.id}
            AND date_condition.field = 'date'
  `,
);
