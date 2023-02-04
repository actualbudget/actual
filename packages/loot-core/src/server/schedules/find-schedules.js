import * as d from 'date-fns';

import { dayFromDate, parseDate } from '../../shared/months';
import q from '../../shared/query';
import { getApproxNumberThreshold } from '../../shared/rules';
import { recurConfigToRSchedule } from '../../shared/schedules';
import { groupBy } from '../../shared/util';
import { conditionsToAQL } from '../accounts/transaction-rules';
import { runQuery as aqlQuery } from '../aql';
import * as db from '../db';
import { fromDateRepr } from '../models';
import { Schedule as RSchedule } from '../util/rschedule';

const uuid = require('../../platform/uuid');

function takeDates(config) {
  let schedule = new RSchedule({ rrules: recurConfigToRSchedule(config) });
  return schedule
    .occurrences({ take: 3 })
    .toArray()
    .map(d => d.date);
}

async function getTransactions(date, account) {
  let { data } = await aqlQuery(
    q('transactions')
      .filter({
        account,
        schedule: null,
        // Don't match transfers
        'payee.transfer_acct': null,
        $and: [
          { date: { $gte: d.subDays(date, 2) } },
          { date: { $lte: d.addDays(date, 2) } }
        ]
      })
      .select('*')
      .options({ splits: 'none' })
  );
  return data;
}

function getRank(day1, day2) {
  let dayDiff = Math.abs(d.differenceInDays(parseDate(day1), parseDate(day2)));

  // The amount of days off determines the rank: exact same day
  // is highest rank 1, 1 day off is .5, etc. This will find the
  // best start date that matches all the dates the closest
  return 1 / (dayDiff + 1);
}

export function matchSchedules(allOccurs, config, partialMatchRank = 0.5) {
  allOccurs = [...allOccurs].reverse();
  let baseOccur = allOccurs[0];
  let occurs = allOccurs.slice(1);
  let schedules = [];

  for (let trans of baseOccur.transactions) {
    let threshold = getApproxNumberThreshold(trans.amount);
    let payee = trans.payee;

    let found = occurs.map(occur => {
      let matched = occur.transactions.find(
        t =>
          t.amount >= trans.amount - threshold &&
          t.amount <= trans.amount + threshold
      );
      matched = matched && matched.payee === payee ? matched : null;

      if (matched) {
        return { trans: matched, rank: getRank(occur.date, matched.date) };
      }
      return null;
    });

    if (found.indexOf(null) !== -1) {
      continue;
    }

    let rank = found.reduce(
      (total, match) => total + match.rank,
      getRank(baseOccur.date, trans.date)
    );

    let exactAmount = found.reduce(
      (exact, match) => exact && match.trans.amount === trans.amount,
      true
    );

    schedules.push({
      rank,
      amount: trans.amount,
      account: trans.account,
      payee: trans.payee,
      date: config,
      // Exact dates rank as 1, so all of them matches exactly it
      // would equal the number of `allOccurs`
      exactDate: rank === allOccurs.length,
      exactAmount
    });
  }

  return schedules;
}

async function schedulesForPattern(
  baseStart,
  numDays,
  baseConfig,
  accountId,
  partialMatchRank
) {
  let schedules = [];

  for (let i = 0; i < numDays; i++) {
    let start = d.addDays(baseStart, i);
    let config;
    if (typeof baseConfig === 'function') {
      config = baseConfig(start);

      if (config === false) {
        // Skip this one
        continue;
      }
    } else {
      config = { ...baseConfig, start };
    }

    // Our recur config expects a day string, not a native date format
    config.start = dayFromDate(config.start);

    let data = [];
    let dates = takeDates(config);
    for (let date of dates) {
      data.push({
        date: dayFromDate(date),
        transactions: await getTransactions(date, accountId)
      });
    }

    schedules = schedules.concat(
      matchSchedules(data, config, partialMatchRank)
    );
  }
  return schedules;
}

async function weekly(startDate, accountId) {
  return schedulesForPattern(
    d.subWeeks(parseDate(startDate), 4),
    7 * 2,
    { frequency: 'weekly' },
    accountId
  );
}

async function every2weeks(startDate, accountId) {
  return schedulesForPattern(
    // 6 weeks would cover 3 instances, but we also scan an addition
    // week back
    d.subWeeks(parseDate(startDate), 7),
    7 * 2,
    { frequency: 'weekly', interval: 2 },
    accountId
  );
}

async function monthly(startDate, accountId) {
  return schedulesForPattern(
    d.subMonths(parseDate(startDate), 4),
    31 * 2,
    start => {
      // 28 is the max number of days that all months are guaranteed
      // to have. We don't want to go any higher than that because
      // we'll end up skipping months that don't have that day.
      // The use cases of end of month days will be covered with the
      // `monthlyLastDay` pattern;
      if (d.getDate(start) > 28) {
        return false;
      }
      return { start, frequency: 'monthly' };
    },
    accountId
  );
}

async function monthlyLastDay(startDate, accountId) {
  // We do two separate calls because this pattern doesn't fit into
  // how `schedulesForPattern` works
  let s1 = await schedulesForPattern(
    d.subMonths(parseDate(startDate), 3),
    1,
    { frequency: 'monthly', patterns: [{ type: 'day', value: -1 }] },
    accountId,
    // Last day patterns should win over day-specific ones that just
    // happen to match
    0.75
  );

  let s2 = await schedulesForPattern(
    d.subMonths(parseDate(startDate), 4),
    1,
    { frequency: 'monthly', patterns: [{ type: 'day', value: -1 }] },
    accountId,
    0.75
  );

  return s1.concat(s2);
}

async function monthly1stor3rd(startDate, accountId) {
  return schedulesForPattern(
    d.subWeeks(parseDate(startDate), 8),
    14,
    start => {
      let day = d.format(new Date(), 'iiii');
      let dayValue = day.slice(0, 2).toUpperCase();

      return {
        start,
        frequency: 'monthly',
        patterns: [
          { type: dayValue, value: 1 },
          { type: dayValue, value: 3 }
        ]
      };
    },
    accountId
  );
}

async function monthly2ndor4th(startDate, accountId) {
  return schedulesForPattern(
    d.subMonths(parseDate(startDate), 8),
    14,
    start => {
      let day = d.format(new Date(), 'iiii');
      let dayValue = day.slice(0, 2).toUpperCase();

      return {
        start,
        frequency: 'monthly',
        patterns: [
          { type: dayValue, value: 2 },
          { type: dayValue, value: 4 }
        ]
      };
    },
    accountId
  );
}

async function findStartDate(schedule) {
  let conditions = schedule._conditions;
  let dateCond = conditions.find(c => c.field === 'date');
  let currentConfig = dateCond.value;

  while (1) {
    let prevConfig = currentConfig;
    currentConfig = { ...prevConfig };

    switch (currentConfig.frequency) {
      case 'weekly':
        currentConfig.start = dayFromDate(
          d.subWeeks(
            parseDate(currentConfig.start),
            currentConfig.interval || 1
          )
        );

        break;
      case 'monthly':
        currentConfig.start = dayFromDate(
          d.subMonths(
            parseDate(currentConfig.start),
            currentConfig.interval || 1
          )
        );
        break;
      case 'yearly':
        currentConfig.start = dayFromDate(
          d.subYears(
            parseDate(currentConfig.start),
            currentConfig.interval || 1
          )
        );
        break;
      default:
        throw new Error('findStartDate: invalid frequency');
    }

    let newConditions = conditions.map(c =>
      c.field === 'date' ? { ...c, value: currentConfig } : c
    );

    let { filters, errors } = conditionsToAQL(newConditions, {
      recurDateBounds: 1
    });
    if (errors.length > 0) {
      // Somehow we generated an invalid config. Abort the whole
      // process and don't change the date at all
      currentConfig = null;
      break;
    }

    let { data } = await aqlQuery(
      q('transactions').filter({ $and: filters }).select('*')
    );

    if (data.length === 0) {
      // No data, revert back to the last valid value and stop
      currentConfig = prevConfig;
      break;
    }
  }

  if (currentConfig) {
    return {
      ...schedule,
      date: currentConfig,
      _conditions: conditions.map(c =>
        c.field === 'date' ? { ...c, value: currentConfig } : c
      )
    };
  }
  return schedule;
}

export async function findSchedules() {
  // Patterns to look for:
  // * Weekly
  // * Every two weeks
  // * Monthly on day X
  // * Monthly on every 1st or 3rd day
  // * Monthly on every 2nd or 4th day
  //
  // Search for them approx (+- 2 days) but track which transactions
  // and find the best one...

  let { data: accounts } = await aqlQuery(
    q('accounts').filter({ closed: false }).select('*')
  );

  let allSchedules = [];

  for (let account of accounts) {
    // Find latest transaction-ish to start with
    let latestTrans = await db.first(
      'SELECT * FROM v_transactions WHERE account = ? AND parent_id IS NULL ORDER BY date DESC LIMIT 1',
      [account.id]
    );

    if (latestTrans) {
      let latestDate = fromDateRepr(latestTrans.date);
      allSchedules = allSchedules.concat(
        await weekly(latestDate, account.id),
        await every2weeks(latestDate, account.id),
        await monthly(latestDate, account.id),
        await monthlyLastDay(latestDate, account.id),
        await monthly1stor3rd(latestDate, account.id),
        await monthly2ndor4th(latestDate, account.id)
      );
    }
  }

  let schedules = [...groupBy(allSchedules, 'payee').entries()].map(
    ([payeeId, schedules]) => {
      schedules.sort((s1, s2) => s2.rank - s1.rank);
      let winner = schedules[0];

      // Convert to schedule and return it
      return {
        id: uuid.v4Sync(),
        account: winner.account,
        payee: winner.payee,
        date: winner.date,
        amount: winner.amount,
        _conditions: [
          { op: 'is', field: 'account', value: winner.account },
          { op: 'is', field: 'payee', value: winner.payee },
          {
            op: winner.exactDate ? 'is' : 'isapprox',
            field: 'date',
            value: winner.date
          },
          {
            op: winner.exactAmount ? 'is' : 'isapprox',
            field: 'amount',
            value: winner.amount
          }
        ]
      };
    }
  );

  let finalized = [];
  for (let schedule of schedules) {
    finalized.push(await findStartDate(schedule));
  }
  return finalized;
}
