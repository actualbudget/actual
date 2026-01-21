// @ts-strict-ignore
import * as d from 'date-fns';
import deepEqual from 'deep-equal';
import { v4 as uuidv4 } from 'uuid';

import { captureBreadcrumb } from '../../platform/exceptions';
import * as connection from '../../platform/server/connection';
import { logger } from '../../platform/server/log';
import {
  addDays,
  currentDay,
  dayFromDate,
  parseDate,
} from '../../shared/months';
import { q } from '../../shared/query';
import {
  extractScheduleConds,
  getDateWithSkippedWeekend,
  getHasTransactionsQuery,
  getNextDate,
  getScheduledAmount,
  getStatus,
  getUpcomingDays,
  recurConfigToRSchedule,
  scheduleIsRecurring,
} from '../../shared/schedules';
import { type ScheduleEntity } from '../../types/models';
import { addTransactions } from '../accounts/sync';
import { createApp } from '../app';
import { aqlQuery } from '../aql';
import * as db from '../db';
import { toDateRepr } from '../models';
import { mutator, runMutator } from '../mutators';
import * as prefs from '../prefs';
import { Rule } from '../rules';
import { addSyncListener, batchMessages } from '../sync';
import {
  getRules,
  insertRule,
  ruleModel,
  updateRule,
} from '../transactions/transaction-rules';
import { undoable } from '../undo';
import { RSchedule } from '../util/rschedule';

import { findSchedules } from './find-schedules';

// Utilities

function zip(arr1, arr2) {
  const result = [];
  for (let i = 0; i < arr1.length; i++) {
    result.push([arr1[i], arr2[i]]);
  }
  return result;
}

export function updateConditions(conditions, newConditions) {
  const scheduleConds = extractScheduleConds(conditions);
  const newScheduleConds = extractScheduleConds(newConditions);

  const replacements = zip(
    Object.values(scheduleConds),
    Object.values(newScheduleConds),
  );

  const updated = conditions.map(cond => {
    const r = replacements.find(r => cond === r[0]);
    return r && r[1] ? r[1] : cond;
  });

  const added = replacements
    .filter(x => x[0] == null && x[1] != null)
    .map(x => x[1]);

  return updated.concat(added);
}

export async function getRuleForSchedule(id: string | null): Promise<Rule> {
  if (id == null) {
    throw new Error('Schedule not attached to a rule');
  }

  const { data: ruleId } = await aqlQuery(
    q('schedules').filter({ id }).calculate('rule'),
  );
  return getRules().find(rule => rule.id === ruleId);
}

async function fixRuleForSchedule(id) {
  const { data: ruleId } = await aqlQuery(
    q('schedules').filter({ id }).calculate('rule'),
  );

  if (ruleId) {
    // Take the bad rule out of the system so it never causes problems
    // in the future
    await db.delete_('rules', ruleId);
  }

  const newId = await insertRule({
    stage: null,
    conditionsOp: 'and',
    conditions: [
      { op: 'isapprox', field: 'date', value: currentDay() },
      { op: 'isapprox', field: 'amount', value: 0 },
    ],
    actions: [{ op: 'link-schedule', value: id }],
  });

  await db.updateWithSchema('schedules', { id, rule: newId });

  return getRules().find(rule => rule.id === newId);
}

export async function setNextDate({
  id,
  start,
  conditions,
  reset,
}: {
  id: string;
  start?;
  conditions?;
  reset?: boolean;
}) {
  if (conditions == null) {
    const rule = await getRuleForSchedule(id);
    if (rule == null) {
      throw new Error('No rule found for schedule');
    }
    conditions = rule.serialize().conditions;
  }

  const { date: dateCond } = extractScheduleConds(conditions);

  const { data: nextDate } = await aqlQuery(
    q('schedules').filter({ id }).calculate('next_date'),
  );

  // Only do this if a date condition exists
  if (dateCond) {
    const newNextDate = getNextDate(
      dateCond,
      start ? start(nextDate) : new Date(),
    );

    if (newNextDate !== nextDate) {
      // Our `update` functon requires the id of the item and we don't
      // have it, so we need to query it
      const nd = await db.first<
        Pick<db.DbScheduleNextDate, 'id' | 'base_next_date_ts'>
      >(
        'SELECT id, base_next_date_ts FROM schedules_next_date WHERE schedule_id = ?',
        [id],
      );

      await db.update(
        'schedules_next_date',
        reset
          ? {
              id: nd.id,
              base_next_date: toDateRepr(newNextDate),
              base_next_date_ts: Date.now(),
            }
          : {
              id: nd.id,
              local_next_date: toDateRepr(newNextDate),
              local_next_date_ts: nd.base_next_date_ts,
            },
      );
    }
  }
}

// Methods

async function checkIfScheduleExists(name, scheduleId) {
  const idForName = await db.first<Pick<db.DbSchedule, 'id'>>(
    'SELECT id from schedules WHERE tombstone = 0 AND name = ?',
    [name],
  );

  if (idForName == null) {
    return false;
  }
  if (scheduleId) {
    return idForName['id'] !== scheduleId;
  }
  return true;
}

export async function createSchedule({
  schedule = null,
  conditions = [],
} = {}): Promise<ScheduleEntity['id']> {
  const scheduleId = schedule?.id || uuidv4();

  const { date: dateCond } = extractScheduleConds(conditions);
  if (dateCond == null) {
    throw new Error('A date condition is required to create a schedule');
  }
  if (dateCond.value == null) {
    throw new Error('Date is required');
  }

  const nextDate = getNextDate(dateCond);
  const nextDateRepr = nextDate ? toDateRepr(nextDate) : null;
  if (schedule) {
    if (schedule.name) {
      if (await checkIfScheduleExists(schedule.name, scheduleId)) {
        throw new Error('Cannot create schedules with the same name');
      }
    } else {
      schedule.name = null;
    }
  }

  // Create the rule here based on the info
  const ruleId = await insertRule({
    stage: null,
    conditionsOp: 'and',
    conditions,
    actions: [{ op: 'link-schedule', value: scheduleId }],
  });

  const now = Date.now();
  await db.insertWithUUID('schedules_next_date', {
    schedule_id: scheduleId,
    local_next_date: nextDateRepr,
    local_next_date_ts: now,
    base_next_date: nextDateRepr,
    base_next_date_ts: now,
  });

  await db.insertWithSchema('schedules', {
    ...schedule,
    id: scheduleId,
    rule: ruleId,
  });

  return scheduleId;
}

// TODO: don't allow deleting rules that link schedules

export async function updateSchedule({
  schedule,
  conditions,
  resetNextDate,
}: {
  schedule;
  conditions?;
  resetNextDate?: boolean;
}) {
  if (schedule.rule) {
    throw new Error('You cannot change the rule of a schedule');
  }
  let rule;

  // This must be outside the `batchMessages` call because we change
  // and then read data
  if (conditions) {
    const { date: dateCond } = extractScheduleConds(conditions);
    if (dateCond && dateCond.value == null) {
      throw new Error('Date is required');
    }

    // We need to get the full rule to merge in the updated
    // conditions
    rule = await getRuleForSchedule(schedule.id);

    if (rule == null) {
      // In the edge case that a rule gets corrupted (either by a bug in
      // the system or user messing with their data), don't crash. We
      // generate a new rule because schedules have to have a rule
      // attached to them.
      rule = await fixRuleForSchedule(schedule.id);
    }
  }

  await batchMessages(async () => {
    if (conditions) {
      const oldConditions = rule.serialize().conditions;
      const newConditions = updateConditions(oldConditions, conditions);

      await updateRule({ id: rule.id, conditions: newConditions });

      // Annoyingly, sometimes it has `type` and sometimes it doesn't
      const stripType = ({ type: _type, ...fields }) => fields;

      // Update `next_date` if the user forced it, or if the account
      // or date changed. We check account because we don't update
      // schedules automatically for closed account, and the user
      // might switch accounts from a closed one
      if (
        resetNextDate ||
        !deepEqual(
          oldConditions.find(c => c.field === 'account'),
          oldConditions.find(c => c.field === 'account'),
        ) ||
        !deepEqual(
          stripType(oldConditions.find(c => c.field === 'date') || {}),
          stripType(newConditions.find(c => c.field === 'date') || {}),
        )
      ) {
        await setNextDate({
          id: schedule.id,
          conditions: newConditions,
          reset: true,
        });
      }
    } else if (resetNextDate) {
      await setNextDate({ id: schedule.id, reset: true });
    }

    await db.updateWithSchema('schedules', schedule);
  });

  return schedule.id;
}

export async function deleteSchedule({ id }) {
  const { data: ruleId } = await aqlQuery(
    q('schedules').filter({ id }).calculate('rule'),
  );

  await batchMessages(async () => {
    await db.delete_('rules', ruleId);
    await db.delete_('schedules', id);
  });
}

async function skipNextDate({ id }) {
  return setNextDate({
    id,
    start: nextDate => {
      return d.addDays(parseDate(nextDate), 1);
    },
  });
}

function discoverSchedules() {
  return findSchedules();
}

async function getUpcomingDates({ config, count }) {
  const rules = recurConfigToRSchedule(config);

  try {
    const schedule = new RSchedule({ rrules: rules });

    return schedule
      .occurrences({ start: d.startOfDay(new Date()), take: count })
      .toArray()
      .map(date =>
        config.skipWeekend
          ? getDateWithSkippedWeekend(date.date, config.weekendSolveMode)
          : date.date,
      )
      .map(date => dayFromDate(date));
  } catch (err) {
    captureBreadcrumb(config);
    throw err;
  }
}

// Services

function onRuleUpdate(rule) {
  const { actions, conditions } =
    rule instanceof Rule ? rule.serialize() : ruleModel.toJS(rule);

  if (actions && actions.find(a => a.op === 'link-schedule')) {
    const scheduleId = actions.find(a => a.op === 'link-schedule').value;

    if (scheduleId) {
      const conds = extractScheduleConds(conditions);

      const payeeIdx = conditions.findIndex(c => c === conds.payee);
      const accountIdx = conditions.findIndex(c => c === conds.account);
      const amountIdx = conditions.findIndex(c => c === conds.amount);
      const dateIdx = conditions.findIndex(c => c === conds.date);

      db.runQuery(
        'INSERT OR REPLACE INTO schedules_json_paths (schedule_id, payee, account, amount, date) VALUES (?, ?, ?, ?, ?)',
        [
          scheduleId,
          payeeIdx === -1 ? null : `$[${payeeIdx}]`,
          accountIdx === -1 ? null : `$[${accountIdx}]`,
          amountIdx === -1 ? null : `$[${amountIdx}]`,
          dateIdx === -1 ? null : `$[${dateIdx}]`,
        ],
      );
    }
  }
}

function trackJSONPaths() {
  // Populate the table
  db.transaction(() => {
    getRules().forEach(rule => {
      onRuleUpdate(rule);
    });
  });

  return addSyncListener(onApplySync);
}

function onApplySync(oldValues, newValues) {
  newValues.forEach((items, table) => {
    if (table === 'rules') {
      items.forEach(newValue => {
        onRuleUpdate(newValue);
      });
    }
  });
}

// This is the service that move schedules forward automatically and
// posts transactions

async function postTransactionForSchedule({
  id,
  today,
}: {
  id: string;
  today?: boolean;
}) {
  const { data } = await aqlQuery(q('schedules').filter({ id }).select('*'));
  const schedule = data[0];
  if (schedule == null || schedule._account == null) {
    return;
  }

  const transaction = {
    payee: schedule._payee,
    account: schedule._account,
    amount: getScheduledAmount(schedule._amount),
    date: today ? currentDay() : schedule.next_date,
    schedule: schedule.id,
    cleared: false,
  };

  if (transaction.account) {
    await addTransactions(transaction.account, [transaction]);
  }
}

// TODO: make this sequential

async function advanceSchedulesService(syncSuccess) {
  // Move all paid schedules
  const { data: schedules } = await aqlQuery(
    q('schedules')
      .filter({ completed: false, '_account.closed': false })
      .select('*'),
  );

  const { data: hasTransData } = await aqlQuery(
    getHasTransactionsQuery(schedules),
  );
  const hasTrans = new Set(
    hasTransData.filter(Boolean).map(row => row.schedule),
  );

  const failedToPost = [];
  let didPost = false;

  const { data: upcomingLength } = await aqlQuery(
    q('preferences')
      .filter({ id: 'upcomingScheduledTransactionLength' })
      .select('value'),
  );

  for (const schedule of schedules) {
    const status = getStatus(
      schedule.next_date,
      schedule.completed,
      hasTrans.has(schedule.id),
      upcomingLength[0]?.value ?? '7',
    );

    if (status === 'paid') {
      if (schedule._date) {
        // Move forward recurring schedules
        if (schedule._date.frequency) {
          try {
            await setNextDate({ id: schedule.id });
          } catch {
            // This might error if the rule is corrupted and it can't
            // find the rule
          }
        } else {
          if (schedule._date < currentDay()) {
            // Complete any single schedules
            await updateSchedule({
              schedule: { id: schedule.id, completed: true },
            });
          }
        }
      }
    } else if (
      (status === 'due' || status === 'missed') &&
      schedule.posts_transaction &&
      schedule._account
    ) {
      // Automatically create a transaction for due schedules
      if (syncSuccess) {
        await postTransactionForSchedule({ id: schedule.id });

        didPost = true;
      } else {
        failedToPost.push(schedule._payee);
      }
    }
  }

  if (failedToPost.length > 0) {
    connection.send('schedules-offline');
  } else if (didPost) {
    // This forces a full refresh of transactions because it
    // simulates them coming in from a full sync. This not a
    // great API right now, but I think generally the approach
    // is sane to treat them as external sync events.
    connection.send('sync-event', {
      type: 'success',
      tables: ['transactions'],
      syncDisabled: false,
    });
  }
}

/**
 * Safely parse a value that might already be parsed or might be a JSON string.
 * SQLite's json_extract returns primitives directly but objects/arrays as strings.
 */
function safeJsonParse<T>(value: unknown, defaultValue: T): T {
  if (value == null) {
    return defaultValue;
  }
  // If it's already the expected type (number, object, array), return it directly
  if (typeof value !== 'string') {
    return value as T;
  }
  // If it's a string, try to parse it as JSON
  try {
    return JSON.parse(value) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * Optimized query for fetching schedules for preview transactions.
 * This bypasses the AQL layer for better performance by using simpler queries.
 */
async function getSchedulesForPreview({
  accountId,
}: {
  accountId?: string;
}): Promise<ScheduleEntity[]> {
  // Step 1: Get all non-tombstoned schedules with their next_date (simple query)
  const scheduleRows = await db.all<{
    id: string;
    name: string | null;
    completed: number;
    rule: string;
    local_next_date: number | null;
    local_next_date_ts: number | null;
    base_next_date: number | null;
    base_next_date_ts: number | null;
  }>(`
    SELECT
      s.id,
      s.name,
      s.completed,
      s.rule,
      nd.local_next_date,
      nd.local_next_date_ts,
      nd.base_next_date,
      nd.base_next_date_ts
    FROM schedules s
    LEFT JOIN schedules_next_date nd ON nd.schedule_id = s.id
    WHERE s.tombstone = 0
  `);

  if (scheduleRows.length === 0) {
    return [];
  }

  // Step 2: Get rule conditions/actions for all schedules in one query
  const ruleIds = scheduleRows.map(s => s.rule).filter(Boolean);
  const rulesMap = new Map<
    string,
    { conditions: string | null; actions: string | null }
  >();

  if (ruleIds.length > 0) {
    const ruleRows = await db.all<{
      id: string;
      conditions: string | null;
      actions: string | null;
    }>(
      `SELECT id, conditions, actions FROM rules WHERE id IN (${ruleIds.map(() => '?').join(',')})`,
      ruleIds,
    );
    for (const row of ruleRows) {
      rulesMap.set(row.id, {
        conditions: row.conditions,
        actions: row.actions,
      });
    }
  }

  // Step 3: Get JSON paths for all schedules
  const scheduleIds = scheduleRows.map(s => s.id);
  const pathsMap = new Map<
    string,
    {
      payee: string | null;
      account: string | null;
      amount: string | null;
      date: string | null;
    }
  >();

  if (scheduleIds.length > 0) {
    const pathRows = await db.all<{
      schedule_id: string;
      payee: string | null;
      account: string | null;
      amount: string | null;
      date: string | null;
    }>(
      `SELECT schedule_id, payee, account, amount, date FROM schedules_json_paths WHERE schedule_id IN (${scheduleIds.map(() => '?').join(',')})`,
      scheduleIds,
    );
    for (const row of pathRows) {
      pathsMap.set(row.schedule_id, {
        payee: row.payee,
        account: row.account,
        amount: row.amount,
        date: row.date,
      });
    }
  }

  // Step 4: Get closed accounts to filter out
  const closedAccountIds = new Set(
    (
      await db.all<{ id: string }>(`SELECT id FROM accounts WHERE closed = 1`)
    ).map(a => a.id),
  );

  // Step 5: Get payee mappings and transfer accounts for filtering
  const payeeMappings = new Map<
    string,
    { targetId: string; transfer_acct: string | null }
  >();
  const pmRows = await db.all<{
    id: string;
    targetId: string;
    transfer_acct: string | null;
  }>(
    `SELECT pm.id, pm.targetId, p.transfer_acct
     FROM payee_mapping pm
     LEFT JOIN payees p ON p.id = pm.targetId`,
  );
  for (const row of pmRows) {
    payeeMappings.set(row.id, {
      targetId: row.targetId,
      transfer_acct: row.transfer_acct,
    });
  }

  // Step 6: Build the schedule entities in JS
  const results: ScheduleEntity[] = [];

  for (const row of scheduleRows) {
    const rule = row.rule ? rulesMap.get(row.rule) : null;
    const paths = pathsMap.get(row.id);
    const conditions = rule?.conditions
      ? safeJsonParse<Array<{ field: string; value: unknown; op?: string }>>(
          rule.conditions,
          [],
        )
      : [];
    const actions = rule?.actions
      ? safeJsonParse<unknown[]>(rule.actions, [])
      : [];

    // Extract values using paths
    let _payee: string | null = null;
    let _account: string | null = null;
    let _amount: unknown = null;
    let _amountOp: string | null = null;
    let _date: unknown = null;

    if (paths) {
      // Find conditions by path indices
      const payeeIdx = paths.payee
        ? parseInt(paths.payee.match(/\$\[(\d+)\]/)?.[1] || '-1', 10)
        : -1;
      const accountIdx = paths.account
        ? parseInt(paths.account.match(/\$\[(\d+)\]/)?.[1] || '-1', 10)
        : -1;
      const amountIdx = paths.amount
        ? parseInt(paths.amount.match(/\$\[(\d+)\]/)?.[1] || '-1', 10)
        : -1;
      const dateIdx = paths.date
        ? parseInt(paths.date.match(/\$\[(\d+)\]/)?.[1] || '-1', 10)
        : -1;

      if (payeeIdx >= 0 && payeeIdx < conditions.length) {
        const payeeCondValue = conditions[payeeIdx]?.value as string;
        const mapping = payeeMappings.get(payeeCondValue);
        _payee = mapping?.targetId || payeeCondValue;
      }
      if (accountIdx >= 0 && accountIdx < conditions.length) {
        _account = conditions[accountIdx]?.value as string;
      }
      if (amountIdx >= 0 && amountIdx < conditions.length) {
        _amount = conditions[amountIdx]?.value;
        _amountOp = (conditions[amountIdx]?.op as string) || null;
      }
      if (dateIdx >= 0 && dateIdx < conditions.length) {
        _date = conditions[dateIdx]?.value;
      }
    }

    // Filter out schedules with closed accounts
    if (_account && closedAccountIds.has(_account)) {
      continue;
    }

    // Filter by accountId if provided
    if (accountId) {
      const payeeCondIdx = paths?.payee
        ? parseInt(paths.payee.match(/\$\[(\d+)\]/)?.[1] || '-1', 10)
        : -1;
      const payeeCondValue =
        payeeCondIdx >= 0 && payeeCondIdx < conditions.length
          ? (conditions[payeeCondIdx]?.value as string)
          : null;
      const mapping = payeeCondValue ? payeeMappings.get(payeeCondValue) : null;
      const transferAcct = mapping?.transfer_acct;

      if (_account !== accountId && transferAcct !== accountId) {
        continue;
      }
    }

    // Convert next_date from integer to string
    const dateInt =
      row.local_next_date_ts === row.base_next_date_ts
        ? row.local_next_date
        : row.base_next_date;
    const nextDateStr = dateInt
      ? `${String(dateInt).slice(0, 4)}-${String(dateInt).slice(4, 6)}-${String(dateInt).slice(6, 8)}`
      : null;

    results.push({
      id: row.id,
      name: row.name,
      completed: row.completed === 1,
      rule: row.rule,
      next_date: nextDateStr,
      _payee,
      _account,
      _amount,
      _amountOp,
      _date,
      _conditions: conditions,
      _actions: actions,
    } as ScheduleEntity);
  }

  // Sort by next_date descending
  results.sort((a, b) => {
    if (!a.next_date && !b.next_date) return 0;
    if (!a.next_date) return 1;
    if (!b.next_date) return -1;
    return b.next_date.localeCompare(a.next_date);
  });

  return results;
}

/**
 * Combined endpoint that returns schedules AND their statuses in one call.
 * This avoids the expensive second round-trip for status queries.
 */
async function getSchedulesWithStatuses({
  accountId,
  upcomingLength = '7',
}: {
  accountId?: string;
  upcomingLength?: string;
}): Promise<{
  schedules: ScheduleEntity[];
  statuses: Record<string, string>;
}> {
  // First get the schedules using our optimized query
  const schedules = await getSchedulesForPreview({ accountId });

  if (schedules.length === 0) {
    return { schedules: [], statuses: {} };
  }

  // Build a single query to check all schedules at once
  const scheduleIds = schedules.map(s => s.id);
  const transWithSchedule = await db.all<{ schedule: string }>(
    `SELECT DISTINCT schedule FROM transactions
     WHERE schedule IN (${scheduleIds.map(() => '?').join(',')})
       AND tombstone = 0`,
    scheduleIds,
  );

  const hasTrans = new Set(transWithSchedule.map(t => t.schedule));

  // Compute statuses
  const statuses: Record<string, string> = {};
  for (const schedule of schedules) {
    statuses[schedule.id] = getStatus(
      schedule.next_date || '',
      schedule.completed,
      hasTrans.has(schedule.id),
      upcomingLength,
    );
  }

  return { schedules, statuses };
}

/**
 * MEGA endpoint: Fetches schedules, computes statuses, generates preview transactions,
 * and applies rules - all in ONE call to minimize web worker round-trips.
 */
async function getPreviewTransactions({
  accountId,
  upcomingLength = '7',
}: {
  accountId?: string;
  upcomingLength?: string;
}): Promise<{
  schedules: ScheduleEntity[];
  statuses: Record<string, string>;
  previewTransactions: Array<{
    id: string;
    payee: string;
    account: string;
    amount: number;
    date: string;
    schedule: string;
    forceUpcoming: boolean;
    category?: string;
  }>;
}> {
  // Step 1: Get schedules with statuses
  const { schedules, statuses } = await getSchedulesWithStatuses({
    accountId,
    upcomingLength,
  });

  if (schedules.length === 0) {
    return { schedules: [], statuses: {}, previewTransactions: [] };
  }

  // Step 2: Filter schedules for preview (due, upcoming, missed, paid)
  const schedulesForPreview = schedules.filter(s => {
    const status = statuses[s.id];
    return (
      !s.completed && ['due', 'upcoming', 'missed', 'paid'].includes(status)
    );
  });

  // Step 3: Generate preview transactions (expand recurring schedules)
  const today = currentDay();
  if (!today) {
    return { schedules, statuses, previewTransactions: [] };
  }
  // Ensure upcomingLength has a default value
  const safeUpcomingLength = upcomingLength || '7';
  const upcomingDays = getUpcomingDays(safeUpcomingLength, today);
  // Safeguard against NaN or invalid values
  const safeDays =
    Number.isFinite(upcomingDays) && upcomingDays > 0 ? upcomingDays : 7;
  const upcomingPeriodEnd = addDays(today, safeDays);

  const previewTransactionsRaw: Array<{
    id: string;
    payee: string;
    account: string;
    amount: number;
    date: string;
    schedule: string;
    forceUpcoming: boolean;
  }> = [];

  for (const schedule of schedulesForPreview) {
    const { date: dateConditions } = extractScheduleConds(schedule._conditions);
    const status = statuses[schedule.id];
    const isRecurring = scheduleIsRecurring(dateConditions);

    const dates: string[] = schedule.next_date ? [schedule.next_date] : [];

    if (isRecurring && schedule.next_date) {
      let day = parseDate(schedule.next_date);
      const endDate = parseDate(upcomingPeriodEnd);

      while (day <= endDate) {
        const nextDate = getNextDate(dateConditions, day);
        const nextDateParsed = parseDate(nextDate);

        if (nextDateParsed > endDate) break;

        if (!dates.includes(nextDate)) {
          dates.push(nextDate);
        }

        // Move to next day to continue searching
        day = new Date(day.getTime() + 24 * 60 * 60 * 1000);
      }
    }

    // If status is 'paid', remove the first date
    if (status === 'paid' && dates.length > 0) {
      dates.shift();
    }

    for (const date of dates) {
      previewTransactionsRaw.push({
        id: 'preview/' + schedule.id + '/' + date,
        payee: schedule._payee || '',
        account: schedule._account || '',
        amount: getScheduledAmount(schedule._amount),
        date,
        schedule: schedule.id,
        forceUpcoming: date !== schedule.next_date || status === 'paid',
      });
    }
  }

  // Sort by date descending, then by amount
  previewTransactionsRaw.sort((a, b) => {
    const dateCompare = b.date.localeCompare(a.date);
    if (dateCompare !== 0) return dateCompare;
    return a.amount - b.amount;
  });

  // Step 4: Apply rules to preview transactions
  const { runRulesBatch } = await import('../transactions/transaction-rules');

  const transactionsForRules = previewTransactionsRaw.map(t => ({
    ...t,
    imported_id: null,
    imported_payee: null,
    starting_balance_flag: false,
    transfer_id: null,
    sort_order: 0,
    cleared: false,
    reconciled: false,
    tombstone: false,
    is_parent: false,
    is_child: false,
    error: null,
    parent_id: null,
    notes: null,
  }));

  const ruledTransactions = await runRulesBatch(transactionsForRules);

  // Extract just the fields we need
  const previewTransactions = ruledTransactions.map((t, i) => ({
    id: previewTransactionsRaw[i].id,
    payee: t.payee || previewTransactionsRaw[i].payee,
    account: t.account || previewTransactionsRaw[i].account,
    amount: t.amount ?? previewTransactionsRaw[i].amount,
    date: t.date || previewTransactionsRaw[i].date,
    schedule: previewTransactionsRaw[i].schedule,
    forceUpcoming: previewTransactionsRaw[i].forceUpcoming,
    category: t.category,
  }));

  return { schedules, statuses, previewTransactions };
}

export type SchedulesHandlers = {
  'schedule/create': typeof createSchedule;
  'schedule/update': typeof updateSchedule;
  'schedule/delete': typeof deleteSchedule;
  'schedule/skip-next-date': typeof skipNextDate;
  'schedule/post-transaction': typeof postTransactionForSchedule;
  'schedule/force-run-service': typeof advanceSchedulesService;
  'schedule/discover': typeof discoverSchedules;
  'schedule/get-upcoming-dates': typeof getUpcomingDates;
  'schedule/get-for-preview': typeof getSchedulesForPreview;
  'schedule/get-with-statuses': typeof getSchedulesWithStatuses;
  'schedule/get-preview-transactions': typeof getPreviewTransactions;
};

// Expose functions to the client
export const app = createApp<SchedulesHandlers>();

app.method('schedule/create', mutator(undoable(createSchedule)));
app.method('schedule/update', mutator(undoable(updateSchedule)));
app.method('schedule/delete', mutator(undoable(deleteSchedule)));
app.method('schedule/skip-next-date', mutator(undoable(skipNextDate)));
app.method(
  'schedule/post-transaction',
  mutator(undoable(postTransactionForSchedule)),
);
app.method(
  'schedule/force-run-service',
  mutator(() => advanceSchedulesService(true)),
);
app.method('schedule/discover', discoverSchedules);
app.method('schedule/get-upcoming-dates', getUpcomingDates);
app.method('schedule/get-for-preview', getSchedulesForPreview);
app.method('schedule/get-with-statuses', getSchedulesWithStatuses);
app.method('schedule/get-preview-transactions', getPreviewTransactions);

app.service(trackJSONPaths);

app.events.on('sync', ({ type }) => {
  const completeEvent =
    type === 'success' || type === 'error' || type === 'unauthorized';

  if (completeEvent && prefs.getPrefs()) {
    if (!db.getDatabase()) {
      logger.info('database is not available, skipping schedule service');
      return;
    }

    const { lastScheduleRun } = prefs.getPrefs();
    if (lastScheduleRun !== currentDay()) {
      runMutator(() => advanceSchedulesService(type === 'success'));

      prefs.savePrefs({ lastScheduleRun: currentDay() });
    }
  }
});
