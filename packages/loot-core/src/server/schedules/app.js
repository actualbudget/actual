import * as d from 'date-fns';
import deepEqual from 'deep-equal';

import { captureBreadcrumb } from '../../platform/exceptions';
import { dayFromDate, currentDay, parseDate } from '../../shared/months';
import q from '../../shared/query';
import {
  extractScheduleConds,
  recurConfigToRSchedule,
  getHasTransactionsQuery,
  getStatus,
  getScheduledAmount
} from '../../shared/schedules';
import { Rule, Condition } from '../accounts/rules';
import { addTransactions } from '../accounts/sync';
import {
  insertRule,
  updateRule,
  getRules,
  ruleModel
} from '../accounts/transaction-rules';
import { createApp } from '../app';
import { runQuery as aqlQuery } from '../aql';
import * as db from '../db';
import { toDateRepr } from '../models';
import { mutator, runMutator } from '../mutators';
import * as prefs from '../prefs';
import { addSyncListener, batchMessages } from '../sync';
import { undoable } from '../undo';
import { Schedule as RSchedule } from '../util/rschedule';

import { findSchedules } from './find-schedules';

const connection = require('../../platform/server/connection');
const uuid = require('../../platform/uuid');

// Utilities

function zip(arr1, arr2) {
  let result = [];
  for (let i = 0; i < arr1.length; i++) {
    result.push([arr1[i], arr2[i]]);
  }
  return result;
}

export function updateConditions(conditions, newConditions) {
  let scheduleConds = extractScheduleConds(conditions);
  let newScheduleConds = extractScheduleConds(newConditions);

  let replacements = zip(
    Object.values(scheduleConds),
    Object.values(newScheduleConds)
  );

  let updated = conditions.map(cond => {
    let r = replacements.find(r => cond === r[0]);
    return r && r[1] ? r[1] : cond;
  });

  let added = replacements
    .filter(x => x[0] == null && x[1] != null)
    .map(x => x[1]);

  return updated.concat(added);
}

export function getNextDate(dateCond, start = new Date()) {
  start = d.startOfDay(start);

  let cond = new Condition(
    dateCond.op,
    'date',
    dateCond.value,
    null,
    new Map(Object.entries({ date: 'date' }))
  );
  let value = cond.getValue();

  if (value.type === 'date') {
    return value.date;
  } else if (value.type === 'recur') {
    let dates = value.schedule.occurrences({ start, take: 1 }).toArray();

    if (dates.length > 0) {
      let date = dates[0].date;
      return dayFromDate(date);
    }
  }
  return null;
}

export async function getRuleForSchedule(id) {
  if (id == null) {
    throw new Error('Schedule not attached to a rule');
  }

  let { data: ruleId } = await aqlQuery(
    q('schedules').filter({ id }).calculate('rule')
  );
  return getRules().find(rule => rule.id === ruleId);
}

export async function fixRuleForSchedule(id) {
  let { data: ruleId } = await aqlQuery(
    q('schedules').filter({ id }).calculate('rule')
  );

  if (ruleId) {
    // Take the bad rule out of the system so it never causes problems
    // in the future
    await db.delete_('rules', ruleId);
  }

  let newId = await insertRule({
    stage: null,
    conditions: [
      { op: 'isapprox', field: 'date', value: currentDay() },
      { op: 'isapprox', field: 'amount', value: 0 }
    ],
    actions: [{ op: 'link-schedule', value: id }]
  });

  await db.updateWithSchema('schedules', { id, rule: newId });

  return getRules().find(rule => rule.id === newId);
}

export async function setNextDate({ id, start, conditions, reset }) {
  if (conditions == null) {
    let rule = await getRuleForSchedule(id);
    if (rule == null) {
      throw new Error('No rule found for schedule');
    }
    conditions = rule.serialize().conditions;
  }

  let { date: dateCond } = extractScheduleConds(conditions);

  let { data: nextDate } = await aqlQuery(
    q('schedules').filter({ id }).calculate('next_date')
  );

  // Only do this if a date condition exists
  if (dateCond) {
    let newNextDate = getNextDate(
      dateCond,
      start ? start(nextDate) : new Date()
    );

    if (newNextDate !== nextDate) {
      // Our `update` functon requires the id of the item and we don't
      // have it, so we need to query it
      let nd = await db.first(
        'SELECT id, base_next_date_ts FROM schedules_next_date WHERE schedule_id = ?',
        [id]
      );

      await db.update(
        'schedules_next_date',
        reset
          ? {
              id: nd.id,
              base_next_date: toDateRepr(newNextDate),
              base_next_date_ts: Date.now()
            }
          : {
              id: nd.id,
              local_next_date: toDateRepr(newNextDate),
              local_next_date_ts: nd.base_next_date_ts
            }
      );
    }
  }
}

// Methods

export async function createSchedule({ schedule, conditions = [] } = {}) {
  let scheduleId = (schedule && schedule.id) || uuid.v4Sync();

  let { date: dateCond } = extractScheduleConds(conditions);
  if (dateCond == null) {
    throw new Error('A date condition is required to create a schedule');
  }
  if (dateCond.value == null) {
    throw new Error('Date is required');
  }

  let nextDate = getNextDate(dateCond);
  let nextDateRepr = nextDate ? toDateRepr(nextDate) : null;

  // Create the rule here based on the info
  let ruleId;
  ruleId = await insertRule({
    stage: null,
    conditions,
    actions: [{ op: 'link-schedule', value: scheduleId }]
  });

  let now = Date.now();
  await db.insertWithUUID('schedules_next_date', {
    schedule_id: scheduleId,
    local_next_date: nextDateRepr,
    local_next_date_ts: now,
    base_next_date: nextDateRepr,
    base_next_date_ts: now
  });

  await db.insertWithSchema('schedules', {
    ...schedule,
    id: scheduleId,
    rule: ruleId
  });

  return scheduleId;
}

// TODO: don't allow deleting rules that link schedules

export async function updateSchedule({ schedule, conditions, resetNextDate }) {
  if (schedule.rule) {
    throw new Error('You cannot change the rule of a schedule');
  }

  // We need the rule if there are conditions
  let rule;

  // This must be outside the `batchMessages` call because we change
  // and then read data
  if (conditions) {
    let { date: dateCond } = extractScheduleConds(conditions);
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
      let oldConditions = rule.serialize().conditions;
      let newConditions = updateConditions(oldConditions, conditions);

      await updateRule({ id: rule.id, conditions: newConditions });

      // Annoyingly, sometimes it has `type` and sometimes it doesn't
      let stripType = ({ type, ...fields }) => fields;

      // Update `next_date` if the user forced it, or if the account
      // or date changed. We check account because we don't update
      // schedules automatically for closed account, and the user
      // might switch accounts from a closed one
      if (
        resetNextDate ||
        !deepEqual(
          oldConditions.find(c => c.field === 'account'),
          oldConditions.find(c => c.field === 'account')
        ) ||
        !deepEqual(
          stripType(oldConditions.find(c => c.field === 'date')),
          stripType(newConditions.find(c => c.field === 'date'))
        )
      ) {
        await setNextDate({
          id: schedule.id,
          conditions: newConditions,
          reset: true
        });
      }
    } else if (resetNextDate) {
      await setNextDate({ id: schedule.id, reset: true });
    }

    await db.updateWithSchema('schedules', schedule);
  });
}

export async function deleteSchedule({ id }) {
  let { data: ruleId } = await aqlQuery(
    q('schedules').filter({ id }).calculate('rule')
  );

  await batchMessages(async () => {
    await db.delete_('rules', ruleId);
    await db.delete_('schedules', id);
  });
}

export async function skipNextDate({ id }) {
  return setNextDate({
    id,
    start: nextDate => {
      return d.addDays(parseDate(nextDate), 1);
    }
  });
}

// `schedule` here might not be a saved schedule, so it might not have
// an id
export function getPossibleTransactions({ schedule }) {}

export function discoverSchedules() {
  return findSchedules();
}

export async function getUpcomingDates({ config, count }) {
  let rules = recurConfigToRSchedule(config);

  try {
    let schedule = new RSchedule({ rrules: rules });

    return schedule
      .occurrences({ start: d.startOfDay(new Date()), take: count })
      .toArray()
      .map(date => dayFromDate(date.date));
  } catch (err) {
    captureBreadcrumb(config);
    throw err;
  }
}

// Services

function onRuleUpdate(rule) {
  let { actions, conditions } =
    rule instanceof Rule ? rule.serialize() : ruleModel.toJS(rule);

  if (actions && actions.find(a => a.op === 'link-schedule')) {
    let scheduleId = actions.find(a => a.op === 'link-schedule').value;

    if (scheduleId) {
      let conds = extractScheduleConds(conditions);

      let payeeIdx = conditions.findIndex(c => c === conds.payee);
      let accountIdx = conditions.findIndex(c => c === conds.account);
      let amountIdx = conditions.findIndex(c => c === conds.amount);
      let dateIdx = conditions.findIndex(c => c === conds.date);

      db.runQuery(
        'INSERT OR REPLACE INTO schedules_json_paths (schedule_id, payee, account, amount, date) VALUES (?, ?, ?, ?, ?)',
        [
          scheduleId,
          payeeIdx === -1 ? null : `$[${payeeIdx}]`,
          accountIdx === -1 ? null : `$[${accountIdx}]`,
          amountIdx === -1 ? null : `$[${amountIdx}]`,
          dateIdx === -1 ? null : `$[${dateIdx}]`
        ]
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

async function postTransactionForSchedule({ id }) {
  let { data } = await aqlQuery(q('schedules').filter({ id }).select('*'));
  let schedule = data[0];
  if (schedule == null || schedule._account == null) {
    return;
  }

  let transaction = {
    payee: schedule._payee,
    account: schedule._account,
    amount: getScheduledAmount(schedule._amount),
    date: schedule.next_date,
    schedule: schedule.id,
    cleared: false
  };

  if (transaction.account) {
    await addTransactions(transaction.account, [transaction]);
  }
}

// TODO: make this sequential

export async function advanceSchedulesService(syncSuccess) {
  // Move all paid schedules
  let { data: schedules } = await aqlQuery(
    q('schedules')
      .filter({ completed: false, '_account.closed': false })
      .select('*')
  );
  let { data: hasTransData } = await aqlQuery(
    getHasTransactionsQuery(schedules)
  );
  let hasTrans = new Set(hasTransData.filter(Boolean).map(row => row.schedule));

  let failedToPost = [];
  let didPost = false;

  for (let schedule of schedules) {
    let status = getStatus(
      schedule.next_date,
      schedule.completed,
      hasTrans.has(schedule.id)
    );

    if (status === 'paid') {
      if (schedule._date) {
        // Move forward recurring schedules
        if (schedule._date.frequency) {
          try {
            await setNextDate({ id: schedule.id });
          } catch (err) {
            // This might error if the rule is corrupted and it can't
            // find the rule
          }
        } else {
          if (schedule._date < currentDay()) {
            // Complete any single schedules
            await updateSchedule({
              schedule: { id: schedule.id, completed: true }
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
    connection.send('schedules-offline', { payees: failedToPost });
  } else if (didPost) {
    // This forces a full refresh of transactions because it
    // simulates them coming in from a full sync. This not a
    // great API right now, but I think generally the approach
    // is sane to treat them as external sync events.
    connection.send('sync-event', {
      type: 'success',
      tables: ['transactions'],
      syncDisabled: 'false'
    });
  }
}

// Expose functions to the client
let app = createApp();

app.method('schedule/create', mutator(undoable(createSchedule)));
app.method('schedule/update', mutator(undoable(updateSchedule)));
app.method('schedule/delete', mutator(undoable(deleteSchedule)));
app.method('schedule/skip-next-date', mutator(undoable(skipNextDate)));
app.method(
  'schedule/post-transaction',
  mutator(undoable(postTransactionForSchedule))
);
app.method(
  'schedule/force-run-service',
  mutator(() => advanceSchedulesService(true))
);
app.method('schedule/get-possible-transactions', getPossibleTransactions);
app.method('schedule/discover', discoverSchedules);
app.method('schedule/get-upcoming-dates', getUpcomingDates);

app.service(trackJSONPaths);

app.events.on('sync', ({ type, subtype }) => {
  let completeEvent =
    type === 'success' || type === 'error' || type === 'unauthorized';

  if (completeEvent && prefs.getPrefs()) {
    let { lastScheduleRun } = prefs.getPrefs();

    if (lastScheduleRun !== currentDay()) {
      runMutator(() => advanceSchedulesService(type === 'success'));

      prefs.savePrefs({ lastScheduleRun: currentDay() });
    }
  }
});

export default app;
