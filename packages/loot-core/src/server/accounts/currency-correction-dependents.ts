import * as db from '#server/db';
import {
  accountEncoding,
  scheduleConditionAccount,
} from '#server/transactions/foreign-guard';
import * as monthUtils from '#shared/months';

/** A recorded encoding; null currency is the budget currency. */
export type CorrectionEncoding = { currency: string | null; precision: number };

export type Relationship = 'base' | 'same' | 'exchange';

type RuleCondition = { op?: string; field?: string; value?: unknown };
type RuleAction = {
  op?: string;
  field?: string;
  value?: unknown;
  options?: Record<string, unknown>;
};

export type ExternalRow = {
  id: string;
  acct: string;
  date: number;
  amount: number;
  transaction_amount: number | null;
  isParent: number;
  isChild: number;
  parent_id: string | null;
  transferred_id: string | null;
  schedule: string | null;
  tombstone: number;
  reconciled: number;
  category: string | null;
};

const EXTERNAL_COLUMNS = `id, acct, date, amount, transaction_amount,
  isParent, isChild, parent_id, transferred_id, schedule, tombstone,
  reconciled, category`;

/** The relationship a transfer has once A takes `target`. */
export function relationshipAfter(
  target: CorrectionEncoding,
  counterpart: { currency: string | null; precision: number | null },
): Relationship {
  if (target.currency === null && counterpart.currency === null) {
    return 'base';
  }
  return target.currency !== null &&
    target.currency === counterpart.currency &&
    target.precision === counterpart.precision
    ? 'same'
    : 'exchange';
}

async function encodingOf(account: string | null) {
  return accountEncoding(account);
}

function sameAs(
  target: CorrectionEncoding,
  encoding: { currency: string | null; precision: number | null },
) {
  return target.currency === null
    ? encoding.currency === null
    : encoding.currency === target.currency &&
        encoding.precision === target.precision;
}

const parse = <T>(json: string | null): T[] =>
  json ? (JSON.parse(json) as T[]) : [];

/** A live split's shape: MC-4's fee family, or an ordinary split. */
export function familyShape(
  children: Array<{ transferred_id: string | null }>,
) {
  const transfers = children.filter(c => c.transferred_id).length;
  return children.length === 2 && transfers === 1 ? 'fee' : 'ordinary';
}

export type Leg = {
  /** The leg in A. */
  id: string;
  counterpart: ExternalRow;
  counterpartEncoding: { currency: string | null; precision: number | null };
  relationship: Relationship;
  /** The counterpart's live family when it is a split child. */
  counterpartFamily: { parent: ExternalRow; children: ExternalRow[] } | null;
};

/**
 * The live transfer legs of A with their counterparts, rejecting broken
 * links and family shapes the target relationship cannot hold.
 */
export async function loadTransferLegs(
  accountId: string,
  target: CorrectionEncoding,
  rows: Array<{
    id: string;
    isChild: number;
    parent_id: string | null;
    tombstone: number;
    transferred_id: string | null;
  }>,
): Promise<Leg[]> {
  const ownLive = new Map(rows.filter(r => !r.tombstone).map(r => [r.id, r]));
  // Incoming links must point at a live leg that points back.
  const incoming = await db.all<{ id: string; transferred_id: string }>(
    `SELECT t.id, t.transferred_id FROM transactions t
       JOIN transactions a ON a.id = t.transferred_id
       WHERE a.acct = ? AND t.acct != ? AND t.tombstone = 0`,
    [accountId, accountId],
  );
  for (const link of incoming) {
    if (ownLive.get(link.transferred_id)?.transferred_id !== link.id) {
      throw new Error('correction-transfer-broken');
    }
  }

  // A transfer payee without a link (in either direction) is a broken
  // transfer the correction cannot carry.
  const unlinkedTransfer = await db.first(
    `SELECT 1 FROM transactions t
       JOIN payees p ON p.id = COALESCE(
         (SELECT targetId FROM payee_mapping WHERE id = t.description),
         t.description)
       WHERE t.tombstone = 0 AND t.transferred_id IS NULL
         AND ((p.transfer_acct = ? AND t.acct != ?)
           OR (t.acct = ? AND p.transfer_acct IS NOT NULL))
       LIMIT 1`,
    [accountId, accountId, accountId],
  );
  if (unlinkedTransfer) {
    throw new Error('correction-transfer-broken');
  }

  const legs: Leg[] = [];
  for (const row of ownLive.values()) {
    if (!row.transferred_id) continue;
    const counterpart = await db.first<ExternalRow>(
      `SELECT ${EXTERNAL_COLUMNS} FROM transactions WHERE id = ?`,
      [row.transferred_id],
    );
    if (
      !counterpart ||
      counterpart.tombstone ||
      counterpart.acct === accountId ||
      counterpart.transferred_id !== row.id
    ) {
      throw new Error('correction-transfer-broken');
    }
    const counterpartEncoding = await encodingOf(counterpart.acct);
    const relationship = relationshipAfter(target, counterpartEncoding);
    let counterpartFamily: Leg['counterpartFamily'] = null;
    if (counterpart.isChild && counterpart.parent_id) {
      const parent = await db.first<ExternalRow>(
        `SELECT ${EXTERNAL_COLUMNS} FROM transactions
           WHERE id = ? AND tombstone = 0`,
        [counterpart.parent_id],
      );
      if (parent) {
        const children = await db.all<ExternalRow>(
          `SELECT ${EXTERNAL_COLUMNS} FROM transactions
             WHERE parent_id = ? AND tombstone = 0 AND isChild = 1
             ORDER BY id`,
          [parent.id],
        );
        counterpartFamily = { parent, children };
      }
    }
    // A's own family, when the leg is a live split child.
    const ownParent =
      row.isChild && row.parent_id ? ownLive.get(row.parent_id) : undefined;
    const ownChildren = ownParent
      ? [...ownLive.values()].filter(r => r.parent_id === ownParent.id)
      : [];
    const shapes = [
      ownParent ? familyShape(ownChildren) : null,
      counterpartFamily ? familyShape(counterpartFamily.children) : null,
    ];
    if (relationship !== 'exchange' && shapes.includes('fee')) {
      throw new Error('correction-exchange-fee-unsupported');
    }
    if (relationship === 'exchange' && shapes.includes('ordinary')) {
      throw new Error('correction-split-transfer-unsupported');
    }
    legs.push({
      id: row.id,
      counterpart,
      counterpartEncoding,
      relationship,
      counterpartFamily,
    });
  }
  return legs;
}

export type ScheduleOfAccount = {
  id: string;
  rule: string;
  date: string;
  conditions: RuleCondition[];
  actions: RuleAction[];
};

export type RuleOfTransfer = {
  id: string;
  conditions: RuleCondition[];
  actions: RuleAction[];
};

/**
 * The payee ids a rule field can post to: a `set` action's value, an `is`
 * condition's value or a `oneOf` list. Exclusions (`isNot`, `notOneOf`)
 * and text matches reach no particular payee.
 */
function payeeIds(x: RuleCondition | RuleAction): unknown[] {
  if (x.field !== 'payee' && x.field !== 'description') return [];
  if ((x.op === 'set' || x.op === 'is') && !Array.isArray(x.value)) {
    return [x.value];
  }
  return x.op === 'oneOf' && Array.isArray(x.value) ? x.value : [];
}

/**
 * Rejects schedule and rule shapes a correction cannot carry, and returns
 * the schedules whose own rule names A alone, and the other schedule-linked
 * rules a correction changes the meaning of: auxiliary link rules on A, and
 * rules elsewhere posting transfers to A (all revalidated with A in the
 * target encoding).
 */
export async function correctionPreflight(accountId: string): Promise<{
  schedules: ScheduleOfAccount[];
  checkedRules: RuleOfTransfer[];
}> {
  const transferPayee = await db.first<{ id: string }>(
    'SELECT id FROM payees WHERE transfer_acct = ? AND tombstone = 0',
    [accountId],
  );
  const rules = await db.all<{
    id: string;
    conditions: string | null;
    actions: string | null;
    schedule_id: string | null;
  }>(
    `SELECT r.id, r.conditions, r.actions,
       (SELECT s.id FROM schedules s WHERE s.rule = r.id AND s.tombstone = 0)
         AS schedule_id
       FROM rules r WHERE r.tombstone = 0`,
  );
  const schedules: ScheduleOfAccount[] = [];
  const checkedRules: RuleOfTransfer[] = [];
  for (const rule of rules) {
    const conditions = parse<RuleCondition>(rule.conditions);
    const actions = parse<RuleAction>(rule.actions);
    const linksSchedule =
      !!rule.schedule_id || actions.some(a => a.op === 'link-schedule');
    if (!linksSchedule) continue;
    const accountConditions = conditions.filter(
      c => c.field === 'acct' || c.field === 'account',
    );
    const namesAccount = accountConditions.some(c =>
      Array.isArray(c.value) ? c.value.includes(accountId) : false,
    );
    const setsAccount = actions.some(
      a =>
        a.op === 'set' &&
        (a.field === 'account' || a.field === 'acct') &&
        a.value === accountId,
    );
    if (namesAccount || setsAccount) {
      throw new Error('account-currency-has-schedules');
    }
    const scheduleAccount = scheduleConditionAccount(conditions);
    if (scheduleAccount === accountId) {
      if (rule.schedule_id) {
        schedules.push({
          id: rule.schedule_id,
          rule: rule.id,
          date: await scheduleDate(rule.schedule_id, conditions),
          conditions,
          actions,
        });
      } else {
        // An auxiliary link rule on A stays base-valued, but its actions
        // must still be valid with A in the target encoding.
        checkedRules.push({ id: rule.id, conditions, actions });
      }
      continue;
    }
    // Elsewhere, a transfer to A may change kind with A's encoding.
    if (
      transferPayee &&
      [...conditions, ...actions].some(x =>
        payeeIds(x).includes(transferPayee.id),
      )
    ) {
      checkedRules.push({ id: rule.id, conditions, actions });
    }
  }
  return { schedules, checkedRules };
}

async function scheduleDate(scheduleId: string, conditions: RuleCondition[]) {
  // The schedule query's effective next date: the local date once it has
  // advanced past the synced base date.
  const next = await db.first<{ next_date: number | null }>(
    `SELECT CASE WHEN local_next_date_ts = base_next_date_ts
         THEN local_next_date ELSE base_next_date END AS next_date
       FROM schedules_next_date WHERE schedule_id = ? AND tombstone = 0`,
    [scheduleId],
  );
  if (next?.next_date) return db.fromDateRepr(next.next_date);
  const date = conditions.find(c => c.field === 'date')?.value;
  if (typeof date === 'string') return date;
  if (date && typeof date === 'object' && 'start' in date) {
    return String((date as { start: string }).start);
  }
  return monthUtils.currentDay();
}

/**
 * Rows whose schedule links become incompatible: rows of A (deleted ones
 * too, since the correction rewrites them) linked to other schedules in
 * another encoding than the target, and live rows elsewhere linked to A's
 * schedules in an account of another encoding.
 */
export async function incompatibleLinks(
  accountId: string,
  target: CorrectionEncoding,
  scheduleIds: Set<string>,
): Promise<ExternalRow[]> {
  const linked = await db.all<ExternalRow>(
    `SELECT ${EXTERNAL_COLUMNS} FROM transactions
       WHERE schedule IS NOT NULL
         AND (acct = ? OR (tombstone = 0 AND schedule IN (
           SELECT s.id FROM schedules s JOIN rules r ON r.id = s.rule
             WHERE r.tombstone = 0)))`,
    [accountId],
  );
  const result: ExternalRow[] = [];
  for (const row of linked) {
    if (row.acct === accountId) {
      if (scheduleIds.has(row.schedule!)) continue;
      const scheduleRule = await db.first<{ conditions: string | null }>(
        `SELECT r.conditions FROM schedules s JOIN rules r ON r.id = s.rule
           WHERE s.id = ?`,
        [row.schedule],
      );
      const encoding = await encodingOf(
        scheduleConditionAccount(
          parse<RuleCondition>(scheduleRule?.conditions ?? null),
        ),
      );
      if (!sameAs(target, encoding)) result.push(row);
    } else if (
      scheduleIds.has(row.schedule!) &&
      !sameAs(target, await encodingOf(row.acct))
    ) {
      result.push(row);
    }
  }
  return result;
}
