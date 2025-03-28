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
  pgTable,
  pgView,
  QueryBuilder,
  serial,
  text,
  varchar,
} from 'drizzle-orm/pg-core';

import drizzleConfig from '../../../../drizzle.config';

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

export function excluded(column: Column | string) {
  if (typeof column === 'string') {
    return sql`excluded.${sql.identifier(column)}`;
  }
  return sql`excluded.${column}`;
}

export const banksTable = pgTable(
  'banks',
  {
    id: varchar({ length: 36 }).primaryKey(),
    name: text(),
    bankId: text(),
    tombstone: boolean().default(false),
  },
  table => [index().on(table.bankId).where(isFalse(table.tombstone))],
);

export const accountsTable = pgTable(
  'accounts',
  {
    id: varchar({ length: 36 }).primaryKey(),
    name: text(),
    offbudget: boolean().default(false),
    closed: boolean().default(false),
    sortOrder: bigint({ mode: 'number' }),
    accountId: text(),
    balanceCurrent: bigint({ mode: 'number' }),
    balanceAvailable: bigint({ mode: 'number' }),
    balanceLimit: bigint({ mode: 'number' }),
    mask: text(),
    officialName: text(),
    type: text(),
    subtype: text(),
    bank: varchar({ length: 36 }).references(() => banksTable.id),
    accountSyncSource: text(),
    tombstone: boolean().default(false),
  },
  table => [
    index().on(table.name).where(isFalse(table.tombstone)),
    index().on(table.bank).where(isFalse(table.tombstone)),
    // Sorting indeces
    index().on(table.sortOrder, table.name),
  ],
);

export const categoryGroupsTable = pgTable(
  'category_groups',
  {
    id: varchar({ length: 36 }).primaryKey(),
    name: text(),
    isIncome: boolean().default(false),
    sortOrder: bigint({ mode: 'number' }),
    hidden: boolean().default(false),
    tombstone: boolean().default(false),
  },
  table => [
    index().on(table.name).where(isFalse(table.tombstone)),
    // Sorting indeces
    index().on(table.isIncome, table.sortOrder, table.id),
    index().on(table.sortOrder, table.id),
  ],
);

export const categoriesTable = pgTable(
  'categories',
  {
    id: varchar({ length: 36 }).primaryKey(),
    name: text(),
    isIncome: boolean().default(false),
    catGroup: varchar({ length: 36 }).references(() => categoryGroupsTable.id),
    sortOrder: bigint({ mode: 'number' }),
    hidden: boolean().default(false),
    goalDef: jsonb(),
    tombstone: boolean().default(false),
  },
  table => [
    index().on(table.name).where(isFalse(table.tombstone)),
    index().on(table.catGroup).where(isFalse(table.tombstone)),
    // Sorting indeces
    index().on(table.sortOrder, table.id),
    index().on(table.goalDef.nullsFirst()),
  ],
);

export const categoryMappingTable = pgTable(
  'category_mapping',
  {
    id: varchar({ length: 36 })
      .primaryKey()
      .references(() => categoriesTable.id),
    // This column is camelCase in sqlite. Let's use snake_case in pglite for consistency.
    transferId: varchar({ length: 36 }).references(() => categoriesTable.id),
  },
  table => [index().on(table.transferId)],
);

export const kvCacheTable = pgTable('kv_cache', {
  key: text().primaryKey(),
  value: text(),
});

export const kvCacheKeyTable = pgTable(
  'kv_cache_key',
  {
    id: varchar({ length: 36 }).primaryKey(),
    key: text().references(() => kvCacheTable.key),
  },
  table => [index().on(table.key)],
);

export const messagesClockTable = pgTable(
  'messages_clock',
  {
    id: integer().primaryKey(),
    clock: jsonb(),
  },
  table => [index().using('gin', table.clock)],
);

export const messagesCrdtTable = pgTable(
  'messages_crdt',
  {
    id: serial().primaryKey(),
    timestamp: text(),
    dataset: text(),
    row: varchar({ length: 36 }),
    column: text(),
    value: bytea(),
  },
  table => [
    index().on(table.timestamp),
    index().on(table.dataset, table.row, table.column, table.timestamp),
  ],
);

export const notesTable = pgTable('notes', {
  id: varchar({ length: 36 }).primaryKey(),
  note: text(),
});

export const payeesTable = pgTable(
  'payees',
  {
    id: varchar({ length: 36 }).primaryKey(),
    name: text(),
    transferAcct: varchar({ length: 36 }).references(() => accountsTable.id),
    favorite: boolean().default(false),
    learnCategories: boolean().default(true),
    tombstone: boolean().default(false),
    // Unused in codebase. Can this be removed?
    category: text(),
  },
  table => [
    index().on(table.name).where(isFalse(table.tombstone)),
    index().on(table.transferAcct.nullsFirst()).where(isFalse(table.tombstone)),
  ],
);

export const payeeMappingTable = pgTable(
  'payee_mapping',
  {
    id: varchar({ length: 36 })
      .primaryKey()
      .references(() => payeesTable.id),
    // This column is camelCase in sqlite. Let's use snake_case in pglite for consistency.
    targetId: varchar({ length: 36 }).references(() => payeesTable.id),
  },
  table => [index().on(table.targetId)],
);

export const rulesTable = pgTable(
  'rules',
  {
    id: varchar({ length: 36 }).primaryKey(),
    stage: text({ enum: ['pre', 'post'] }),
    conditions: jsonb(),
    actions: jsonb(),
    tombstone: boolean().default(false),
    conditionsOp: text({ enum: ['and', 'or'] }),
  },
  table => [
    index().on(table.stage).where(isFalse(table.tombstone)),
    index().using('gin', table.conditions),
    index().using('gin', table.actions),
  ],
);

export const schedulesTable = pgTable(
  'schedules',
  {
    id: varchar({ length: 36 }).primaryKey(),
    name: text(),
    rule: varchar({ length: 36 }).references(() => rulesTable.id),
    active: boolean().default(false),
    completed: boolean().default(false),
    postsTransaction: boolean().default(false),
    tombstone: boolean().default(false),
  },
  table => [
    index().on(table.name).where(isFalse(table.tombstone)),
    index().on(table.rule).where(isFalse(table.tombstone)),
    index().on(table.completed).where(isFalse(table.tombstone)),
  ],
);

/**
 * This may no longer be needed since postgresql natively
 * supports querying jsonb columns.
 */
export const schedulesJsonPathTable = pgTable('schedules_json_paths', {
  scheduleId: varchar({ length: 36 })
    .primaryKey()
    .references(() => schedulesTable.id),
  payee: text(),
  account: text(),
  amount: text(),
  date: text(),
});

export const schedulesNextDateTable = pgTable('schedules_next_date', {
  id: varchar({ length: 36 }).primaryKey(),
  scheduleId: varchar({ length: 36 })
    .unique()
    .references(() => schedulesTable.id),
  localNextDate: date(),
  localNextDateTs: bigint({ mode: 'number' }),
  baseNextDate: date(),
  baseNextDateTs: bigint({ mode: 'number' }),
  tombstone: boolean().default(false),
});

export const transactionsTable = pgTable(
  'transactions',
  {
    id: varchar({ length: 36 }).primaryKey(),
    // This column is camelCase in sqlite. Let's use snake_case in pglite for consistency.
    isParent: boolean().default(false),
    // This column is camelCase in sqlite. Let's use snake_case in pglite for consistency.
    isChild: boolean().default(false),
    acct: varchar({ length: 36 }).references(() => accountsTable.id),
    category: varchar({ length: 36 }).references(() => categoriesTable.id),
    amount: bigint({ mode: 'number' }),
    description: varchar({ length: 36 }),
    notes: text(),
    date: date(),
    // Need to add AnyPgColumn when self-referencing
    // https://orm.drizzle.team/docs/indexes-constraints#foreign-key
    parentId: varchar({ length: 36 }).references(
      (): AnyPgColumn => transactionsTable.id,
    ),
    financialId: text(),
    error: jsonb(),
    importedDescription: text(),
    // Need to add AnyPgColumn when self-referencing
    // https://orm.drizzle.team/docs/indexes-constraints#foreign-key
    transferredId: varchar({ length: 36 }).references(
      (): AnyPgColumn => transactionsTable.id,
    ),
    schedule: varchar({ length: 36 }).references(() => schedulesTable.id),
    sortOrder: bigint({ mode: 'number' }),
    startingBalanceFlag: boolean().default(false),
    tombstone: boolean().default(false),
    cleared: boolean().default(true),
    reconciled: boolean().default(false),
    // Unused in codebase. Can this be removed?
    pending: boolean(),
    location: text(),
    type: text(),
  },
  table => [
    index().on(table.category, table.date).where(isFalse(table.tombstone)),
    index().on(table.acct).where(isFalse(table.tombstone)),
    index().on(table.parentId).where(isFalse(table.tombstone)),
    // Sorting indeces
    index().on(
      table.date.desc(),
      table.startingBalanceFlag,
      table.sortOrder.desc(),
      table.id,
    ),
  ],
);

export const reflectBudgetsTable = pgTable(
  'reflect_budgets',
  {
    id: text().primaryKey(),
    month: date(),
    category: varchar({ length: 36 }).references(() => categoriesTable.id),
    amount: bigint({ mode: 'number' }),
    carryover: boolean().default(false),
    goal: bigint({ mode: 'number' }),
    longGoal: bigint({ mode: 'number' }),
  },
  table => [index().on(table.month, table.category)],
);

export const zeroBudgetsTable = pgTable(
  'zero_budgets',
  {
    id: text().primaryKey(),
    month: date(),
    category: varchar({ length: 36 }).references(() => categoriesTable.id),
    amount: bigint({ mode: 'number' }),
    carryover: boolean().default(false),
    goal: bigint({ mode: 'number' }),
    longGoal: bigint({ mode: 'number' }),
  },
  table => [index().on(table.month, table.category)],
);

export const zeroBudgetMonthsTable = pgTable('zero_budget_months', {
  id: text().primaryKey(),
  buffered: bigint({ mode: 'number' }),
});

export const transactionFiltersTable = pgTable(
  'transaction_filters',
  {
    id: varchar({ length: 36 }).primaryKey(),
    name: text(),
    // Consider indexing in the future.
    conditions: jsonb(),
    conditionsOp: text({ enum: ['and', 'or'] }),
    tombstone: boolean().default(false),
  },
  table => [
    index().on(table.name).where(isFalse(table.tombstone)),
    index().using('gin', table.conditions).where(isFalse(table.tombstone)),
  ],
);

export const preferencesTable = pgTable('preferences', {
  id: text().primaryKey(),
  value: text(),
});

export const customReportsTable = pgTable(
  'custom_reports',
  {
    id: varchar({ length: 36 }).primaryKey(),
    name: text(),
    startDate: date(),
    endDate: date(),
    dateStatic: bigint({ mode: 'number' }),
    dateRange: text(),
    mode: text(),
    groupBy: text(),
    balanceType: text(),
    showEmpty: boolean().default(false),
    showOffbudget: boolean().default(false),
    showHidden: boolean().default(false),
    showUncategorized: boolean().default(false),
    selectedCategories: text(),
    graphType: text(),
    // Consider indexing in the future.
    conditions: jsonb(),
    conditionsOp: text({ enum: ['and', 'or'] }),
    metadata: jsonb(),
    interval: text(),
    colorScheme: text(),
    includeCurrent: boolean().default(false),
    sortBy: text(),
    tombstone: boolean().default(false),
  },
  table => [
    index().on(table.name).where(isFalse(table.tombstone)),
    index().using('gin', table.conditions).where(isFalse(table.tombstone)),
  ],
);

export const dashboardTable = pgTable(
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
  table => [
    // Sorting indeces
    index().on(table.y.desc(), table.x.desc()).where(isFalse(table.tombstone)),
  ],
);

const transactionsInternalViewColumns = {
  id: varchar({ length: 36 }),
  isParent: boolean(),
  isChild: boolean(),
  parentId: varchar({ length: 36 }),
  account: varchar({ length: 36 }),
  category: varchar({ length: 36 }),
  amount: bigint({ mode: 'number' }),
  payee: varchar({ length: 36 }),
  notes: text(),
  date: date(),
  importedId: text(),
  error: jsonb(),
  importedPayee: text(),
  startingBalanceFlag: boolean(),
  transferId: varchar({ length: 36 }),
  schedule: varchar({ length: 36 }),
  cleared: boolean(),
  reconciled: boolean(),
  tombstone: boolean(),
  sortOrder: bigint({ mode: 'number' }),
};

export const transactionsInternalView = pgView(
  'v_transactions_internal',
  transactionsInternalViewColumns,
).as(
  sql`
    SELECT
      ${transactionsTable.id},
      ${transactionsTable.isParent},
      ${transactionsTable.isChild},
      CASE WHEN ${transactionsTable.isChild} IS FALSE THEN NULL ELSE ${transactionsTable.parentId} END AS parent_id,
      ${transactionsTable.acct} AS account,
      CASE WHEN ${transactionsTable.isParent} IS TRUE THEN NULL ELSE ${categoryMappingTable.transferId} END AS category,
      COALESCE(${transactionsTable.amount}, 0) AS amount,
      ${payeeMappingTable.targetId} AS payee,
      ${transactionsTable.notes},
      ${transactionsTable.date},
      ${transactionsTable.financialId} AS imported_id,
      ${transactionsTable.error},
      ${transactionsTable.importedDescription} AS imported_payee,
      ${transactionsTable.startingBalanceFlag},
      ${transactionsTable.transferredId} AS transfer_id,
      ${transactionsTable.schedule},
      ${transactionsTable.cleared},
      ${transactionsTable.reconciled},
      ${transactionsTable.tombstone},
      ${transactionsTable.sortOrder}
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
      AND (${transactionsTable.isChild} IS FALSE OR ${transactionsTable.parentId} IS NOT NULL)
  `,
);

export const transactionsInternalViewAlive = pgView(
  'v_transactions_internal_alive',
  transactionsInternalViewColumns,
).as(
  sql`
    SELECT
      ${transactionsInternalView}.*
    FROM
      ${transactionsInternalView}
    LEFT JOIN
      ${transactionsTable}
        ON (${transactionsTable.isChild} IS TRUE
        AND ${transactionsTable.id} = ${transactionsInternalView.parentId})
    WHERE
      COALESCE(${transactionsTable.tombstone}, FALSE) IS FALSE
      AND (${transactionsInternalView.isChild} IS FALSE OR ${transactionsTable.tombstone} IS FALSE)
  `,
);

export const transactionsView = pgView(
  'v_transactions',
  transactionsInternalViewColumns,
).as(
  sql`
    SELECT
      ${transactionsInternalViewAlive.id},
      ${transactionsInternalViewAlive.isParent},
      ${transactionsInternalViewAlive.isChild},
      ${transactionsInternalViewAlive.parentId},
      ${accountsTable.id} AS account,
      ${categoriesTable.id} AS category,
      ${transactionsInternalViewAlive.amount},
      ${payeesTable.id} AS payee,
      ${transactionsInternalViewAlive.notes},
      ${transactionsInternalViewAlive.date},
      ${transactionsInternalViewAlive.importedId},
      ${transactionsInternalViewAlive.error},
      ${transactionsInternalViewAlive.importedPayee},
      ${transactionsInternalViewAlive.startingBalanceFlag},
      ${transactionsInternalViewAlive.transferId},
      ${transactionsInternalViewAlive.sortOrder},
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
      ${transactionsInternalViewAlive.startingBalanceFlag},
      ${transactionsInternalViewAlive.sortOrder} DESC,
      ${transactionsInternalViewAlive.id}
  `,
);

// https://github.com/drizzle-team/drizzle-orm/issues/3332
const snakeCaseQueryBuilder = new QueryBuilder({
  casing: drizzleConfig.casing,
});

export const categoriesView = pgView('v_categories').as(
  snakeCaseQueryBuilder
    .select({
      id: categoriesTable.id,
      name: categoriesTable.name,
      isIncome: categoriesTable.isIncome,
      hidden: categoriesTable.hidden,
      group: sql`${categoriesTable.catGroup}`.as('group'),
      sortOrder: categoriesTable.sortOrder,
      tombstone: categoriesTable.tombstone,
    })
    .from(categoriesTable),
);

export const payeesView = pgView('v_payees').as(
  snakeCaseQueryBuilder
    .select({
      id: payeesTable.id,
      name: sql`COALESCE(${accountsTable.name}, ${payeesTable.name})`.as(
        'name',
      ),
      transferAcct: payeesTable.transferAcct,
      favorite: payeesTable.favorite,
      learnCategories: payeesTable.learnCategories,
      tombstone: payeesTable.tombstone,
    })
    .from(payeesTable)
    .leftJoin(
      accountsTable,
      and(
        eq(payeesTable.transferAcct, accountsTable.id),
        isFalse(accountsTable.tombstone),
      ),
    )
    // We never want to show transfer payees that are pointing to deleted accounts.
    // Either this is not a transfer payee, if the account exists
    .where(or(isNull(payeesTable.transferAcct), isNotNull(accountsTable.id))),
);

export const schedulesView = pgView('v_schedules', {
  id: varchar({ length: 36 }),
  name: text(),
  rule: varchar({ length: 36 }),
  nextDate: date(),
  completed: boolean(),
  postsTransaction: boolean(),
  active: boolean(),
  tombstone: boolean(),
  _payee: varchar({ length: 36 }),
  _account: varchar({ length: 36 }),
  _amount: text(),
  _amountOp: text(),
  _date: jsonb(),
  _conditions: jsonb(),
  _actions: jsonb(),
}).as(
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
            WHEN ${schedulesNextDateTable.localNextDateTs} = ${schedulesNextDateTable.baseNextDateTs} THEN ${schedulesNextDateTable.localNextDate}
            ELSE ${schedulesNextDateTable.baseNextDate}
        END AS next_date,
        ${schedulesTable.completed},
        ${schedulesTable.postsTransaction},
        ${schedulesTable.tombstone},
        ${payeeMappingTable.targetId} AS _payee,
        account_condition.value AS _account,
        amount_condition.value AS _amount,
        amount_condition.op AS _amount_op,
        date_condition.value AS _date,
        ${rulesTable.conditions} AS _conditions,
        ${rulesTable.actions} AS _actions
    FROM
        ${schedulesTable}
    LEFT JOIN
        ${schedulesNextDateTable} ON ${schedulesNextDateTable.scheduleId} = ${schedulesTable.id}
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
