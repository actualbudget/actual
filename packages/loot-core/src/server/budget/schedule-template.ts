// @ts-strict-ignore

import { aqlQuery } from '#server/aql';
import * as db from '#server/db';
import { fromDateRepr } from '#server/models';
import { collectFormulasFromActions } from '#server/rules/balanceOfFormula';
import { getRuleForSchedule } from '#server/schedules/app';
import { prefetchBalanceOfForTransaction } from '#server/transactions/transaction-rules';
import * as monthUtils from '#shared/months';
import { q } from '#shared/query';
import {
  extractScheduleConds,
  getDateWithSkippedWeekend,
  getNextDate,
  getOccurrencesBetween,
} from '#shared/schedules';
import { amountToInteger } from '#shared/util';
import type { CategoryEntity, TransactionEntity } from '#types/models';
import type { ScheduleTemplate, Template } from '#types/models/templates';

import { isTrackingBudget } from './actions';

type ScheduleTemplateTarget = {
  template: ScheduleTemplate;
  name: string;
  target: number;
  perOccurrenceAmount: number;
  next_date_string: string;
  storedNextDate: string | null;
  scheduleId: string;
  target_interval: number;
  target_frequency: string | undefined;
  num_months: number;
  completed: number;
  full: boolean;
  repeat: boolean;
  dateConditions: ReturnType<typeof extractScheduleConds>['date'];
  isPastDue: boolean;
};

export async function createScheduleList(
  templates: ScheduleTemplate[],
  current_month: string,
  category: CategoryEntity,
) {
  const t: Array<ScheduleTemplateTarget> = [];
  const accounts = (await db.getAccounts()) ?? [];
  const accountsMap = new Map(accounts.map(a => [a.id, a]));

  for (const template of templates) {
    // Prefer scheduleId so renames don't break the lookup; fall back to name
    // for notes-source templates (and legacy ui-source data) that only carry
    // the name.
    // next_date mirrors the v_schedules view's computed column.
    const {
      id: sid,
      name: scheduleName,
      completed,
      next_date: storedNextDateRepr,
    } = await db.first<
      Pick<db.DbSchedule, 'id' | 'name' | 'completed'> & {
        next_date: number | null;
      }
    >(
      `SELECT s.id, s.name, s.completed,
         CASE
           WHEN nd.local_next_date_ts = nd.base_next_date_ts THEN nd.local_next_date
           ELSE nd.base_next_date
         END AS next_date
       FROM schedules s
       LEFT JOIN schedules_next_date nd ON nd.schedule_id = s.id
       WHERE ${template.scheduleId ? 's.id = ?' : 'TRIM(s.name) = ?'} AND s.tombstone = 0`,
      [template.scheduleId ?? template.name],
    );
    const storedNextDate =
      typeof storedNextDateRepr === 'number'
        ? fromDateRepr(storedNextDateRepr)
        : null;
    const rule = await getRuleForSchedule(sid);
    const conditions = rule.serialize().conditions;
    const { date: dateConditions, amount: amountCondition } =
      extractScheduleConds(conditions);
    let scheduleAmount =
      amountCondition.op === 'isbetween'
        ? Math.round(amountCondition.value.num1 + amountCondition.value.num2) /
          2
        : amountCondition.value;
    // Apply adjustment percentage if specified
    if (template.adjustment !== undefined && template.adjustmentType) {
      switch (template.adjustmentType) {
        case 'percent': {
          const adjustmentFactor = 1 + template.adjustment / 100;
          scheduleAmount = scheduleAmount * adjustmentFactor;
          break;
        }
        case 'fixed': {
          const sign = scheduleAmount < 0 ? -1 : 1;
          scheduleAmount += sign * amountToInteger(template.adjustment);
          break;
        }

        default:
        //no valid adjustment was found
      }
    }

    scheduleAmount = Math.round(scheduleAmount);

    const next_date_string = getNextDate(
      dateConditions,
      monthUtils._parse(current_month),
    );

    // Schedule templates call rule.execActions() on the rule attached to each
    // schedule, so we prefetch balances and pass _balanceOfPrefetched here too.
    // Without that, BALANCE_OF would behave wrong or always look empty for
    // schedule rules.
    const formulaStrings = collectFormulasFromActions(rule.actions);

    // Use the schedule's next occurrence date so "balance as of this moment"
    // matches the scheduled date; id/sort_order are unset so we don't exclude a
    // non-existent transaction from the balance query.
    const scheduleRuleContext: TransactionEntity = {
      amount: scheduleAmount,
      category: category.id,
      subtransactions: [],
      ...(next_date_string ? { date: next_date_string } : {}),
      id: null,
      sort_order: null,
    } as TransactionEntity;

    const balanceOfPrefetched = await prefetchBalanceOfForTransaction(
      scheduleRuleContext,
      accountsMap,
      formulaStrings,
    );

    const { amount: postRuleAmount, subtransactions } = rule.execActions({
      ...scheduleRuleContext,
      _balanceOfPrefetched: balanceOfPrefetched,
    });
    const categorySubtransactions = subtransactions?.filter(
      t => t.category === category.id,
    );

    // Unless the current category is relevant to the schedule, target the post-rule amount.
    const sign = category.is_income ? 1 : -1;
    const target =
      sign *
      (categorySubtransactions?.length
        ? categorySubtransactions.reduce((acc, t) => acc + t.amount, 0)
        : (postRuleAmount ?? scheduleAmount));

    const target_interval = dateConditions.value.interval
      ? dateConditions.value.interval
      : 1;
    const target_frequency = dateConditions.value.frequency;
    const isRepeating =
      Object(dateConditions.value) === dateConditions.value &&
      'frequency' in dateConditions.value;
    const num_months = monthUtils.differenceInCalendarMonths(
      next_date_string,
      current_month,
    );
    const displayName = scheduleName ?? template.name ?? '';
    const isPastDue = num_months < 0;
    t.push({
      template,
      target,
      perOccurrenceAmount: target,
      next_date_string,
      storedNextDate,
      scheduleId: sid,
      target_interval,
      target_frequency,
      num_months,
      completed,
      //started,
      full: template.full === null ? false : template.full,
      repeat: isRepeating,
      name: displayName,
      dateConditions,
      isPastDue,
    });
    if (!completed && isRepeating && !isPastDue) {
      let monthlyTarget = 0;
      const nextMonth = monthUtils.addMonths(
        current_month,
        t[t.length - 1].num_months + 1,
      );
      let nextBaseDate = getNextDate(
        dateConditions,
        monthUtils._parse(current_month),
        true,
      );
      let nextDate = dateConditions.value.skipWeekend
        ? monthUtils.dayFromDate(
            getDateWithSkippedWeekend(
              monthUtils._parse(nextBaseDate),
              dateConditions.value.weekendSolveMode,
            ),
          )
        : nextBaseDate;
      while (nextDate < nextMonth) {
        monthlyTarget += -target;
        const currentDate = nextBaseDate;
        const oneDayLater = monthUtils.addDays(nextBaseDate, 1);
        nextBaseDate = getNextDate(
          dateConditions,
          monthUtils._parse(oneDayLater),
          true,
        );
        nextDate = dateConditions.value.skipWeekend
          ? monthUtils.dayFromDate(
              getDateWithSkippedWeekend(
                monthUtils._parse(nextBaseDate),
                dateConditions.value.weekendSolveMode,
              ),
            )
          : nextBaseDate;
        const diffDays = monthUtils.differenceInCalendarDays(
          nextBaseDate,
          currentDate,
        );
        if (!diffDays) {
          // This can happen if the schedule has an end condition.
          break;
        }
      }
      t[t.length - 1].target = -monthlyTarget;
    }
  }
  return { t };
}

const FORECAST_MONTHS = 60;

type PostedTransaction = {
  amount?: number;
  date: string;
  schedule: string | null;
  category?: string | null;
};

// How far either side of a range to look for the occurrence nearest a
// linked payment. It has to reach the occurrence before and after any
// payment, so it covers schedules that recur as rarely as every two years.
const LINKED_PAYMENT_SEARCH_MONTHS = 25;

function linkedSearchStart(rangeStart: string) {
  return `${monthUtils.subMonths(rangeStart, LINKED_PAYMENT_SEARCH_MONTHS)}-01`;
}

function linkedSearchEnd(rangeEnd: string) {
  return `${monthUtils.addMonths(rangeEnd, LINKED_PAYMENT_SEARCH_MONTHS)}-01`;
}

// Index of the first date in ascending `dates` that is not before `day`.
function firstIndexFrom(dates: string[], day: string) {
  let low = 0;
  let high = dates.length;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (dates[mid] < day) low = mid + 1;
    else high = mid;
  }
  return low;
}

// Months from `month` to the month of `day`; both start "YYYY-MM". Same as
// monthUtils.differenceInCalendarMonths, without parsing dates, since it
// runs once per occurrence.
function monthsBetween(month: string, day: string) {
  return (
    (Number(day.slice(0, 4)) - Number(month.slice(0, 4))) * 12 +
    Number(day.slice(5, 7)) -
    Number(month.slice(5, 7))
  );
}

type OccurrencesBetween = (startDay: string, endDay: string) => string[];

// A schedule's occurrences across every range given, generated in one pass
// and sliced per request. Generating occurrences is the expensive part of
// the forecast (thousands for a daily schedule), and the ranges overlap.
// A slice is the same as generating that range on its own; a range outside
// the ones given is generated directly.
function occurrenceLookup(
  entry: ScheduleTemplateTarget,
  ranges: Array<[string, string]>,
): OccurrencesBetween {
  let coveredStart = ranges[0][0];
  let coveredEnd = ranges[0][1];
  for (const [startDay, endDay] of ranges) {
    if (startDay < coveredStart) coveredStart = startDay;
    if (endDay > coveredEnd) coveredEnd = endDay;
  }
  const dates = getOccurrencesBetween(
    entry.dateConditions,
    coveredStart,
    coveredEnd,
  );
  return (startDay, endDay) => {
    if (startDay < coveredStart || endDay > coveredEnd) {
      return getOccurrencesBetween(entry.dateConditions, startDay, endDay);
    }
    return dates.slice(
      firstIndexFrom(dates, startDay),
      firstIndexFrom(dates, endDay),
    );
  };
}

// Which of this schedule's occurrences in [rangeStart, rangeEnd) are
// settled by its linked payments. The link says which schedule a payment
// belongs to; each payment is attributed to that schedule's nearest
// occurrence, so an early payment settles the upcoming occurrence and a
// late one settles the previous occurrence, not the next. Several payments
// nearest the same occurrence (a bill paid in parts) settle it only once.
function settledOccurrences(
  entry: ScheduleTemplateTarget,
  transactions: PostedTransaction[],
  rangeStart: string,
  rangeEnd: string,
  occurrencesBetween: OccurrencesBetween,
): Set<string> {
  const settled = new Set<string>();
  const linked = transactions.filter(
    transaction => transaction.schedule === entry.scheduleId,
  );
  if (linked.length === 0) return settled;

  // Ascending, so the nearest occurrence is one of the two either side of
  // the payment's date; on a tie the later one wins.
  const nearby = occurrencesBetween(
    linkedSearchStart(rangeStart),
    linkedSearchEnd(rangeEnd),
  );
  if (nearby.length === 0) return settled;
  for (const transaction of linked) {
    const low = firstIndexFrom(nearby, transaction.date);
    const distanceTo = (index: number) =>
      Math.abs(
        monthUtils.differenceInCalendarDays(transaction.date, nearby[index]),
      );
    const nearest =
      low === nearby.length ||
      (low > 0 && distanceTo(low - 1) < distanceTo(low))
        ? nearby[low - 1]
        : nearby[low];
    if (nearest >= rangeStart && nearest < rangeEnd) {
      settled.add(nearest);
    }
  }
  return settled;
}

export async function buildMonthlyOutflow(
  smoothEntries: ScheduleTemplateTarget[],
  current_month: string,
  category: CategoryEntity,
  // Schedules budgeted in full outside the forecast. Their payments come
  // out of that separate amount, so they aren't this month's spending.
  // Budgeting ahead, their unpaid occurrences before the window are still
  // reserved below like the smooth ones': that money sits in the balance.
  fullEntries: ScheduleTemplateTarget[] = [],
): Promise<number[]> {
  const fullScheduleIds = fullEntries.map(entry => entry.scheduleId);
  const reservedEntries = [...smoothEntries, ...fullEntries];
  const monthlyOutflow = new Array(FORECAST_MONTHS).fill(0);
  const windowStart = monthUtils.firstDayOfMonth(current_month);
  const windowEnd = `${monthUtils.addMonths(current_month, FORECAST_MONTHS)}-01`;
  const today = monthUtils.currentDay();
  const currentMonthStart = monthUtils.firstDayOfMonth(today);
  const isBudgetingAhead = windowStart > currentMonthStart;

  // A completed schedule's rule still yields dates, but nothing after the
  // next date it had when it was completed ever happened. Its occurrences
  // count up to a cutoff: that stored next date, or the last payment
  // linked to it in this category if that is later (a payment entered
  // ahead of time). Up to the cutoff it is treated exactly like an active
  // schedule, so completing it changes nothing about what already
  // happened. With neither a next date nor a payment, nothing counts.
  const occurrenceCutoff = new Map<string, string>();
  const completedEntries = smoothEntries.filter(entry => entry.completed);
  if (completedEntries.length > 0) {
    // A payment only moves a cutoff when it's after that schedule's next
    // date, so when every schedule has one, older payments needn't be read.
    // On an old budget file the full payment history is slow to query.
    const nextDates = completedEntries.map(entry => entry.storedNextDate);
    const earliestNextDate = nextDates.includes(null)
      ? null
      : nextDates.reduce((earliest, date) =>
          date < earliest ? date : earliest,
        );
    const { data: completedPayments } = await aqlQuery(
      q('transactions')
        .filter({
          category: category.id,
          schedule: { $oneof: completedEntries.map(entry => entry.scheduleId) },
          'account.offbudget': false,
          ...(earliestNextDate ? { date: { $gt: earliestNextDate } } : {}),
        })
        .select(['date', 'schedule']),
    );
    const lastPayment = new Map<string, string>();
    for (const transaction of completedPayments) {
      const previous = lastPayment.get(transaction.schedule) ?? '';
      if (transaction.date > previous) {
        lastPayment.set(transaction.schedule, transaction.date);
      }
    }
    for (const entry of completedEntries) {
      const nextDate = entry.storedNextDate ?? '';
      const paid = lastPayment.get(entry.scheduleId) ?? '';
      occurrenceCutoff.set(entry.scheduleId, paid > nextDate ? paid : nextDate);
    }
  }
  const withinCutoff = (entry: ScheduleTemplateTarget, dates: string[]) => {
    const cutoff = occurrenceCutoff.get(entry.scheduleId);
    return cutoff === undefined ? dates : dates.filter(d => d <= cutoff);
  };

  // next_date only advances once its date has passed, so a payment made
  // early leaves it in place. A linked payment already in the carried-over
  // balance (dated before the budget month) settles its nearest occurrence,
  // whether that is a pending one or one in the budget month itself. Only
  // this category's payments count: one booked elsewhere (or not
  // categorized yet) didn't come out of this balance, and the same
  // schedule can be linked from more than one category.
  const { data: linkedAnywhereBeforeWindow } = await aqlQuery(
    q('transactions')
      .filter({
        schedule: { $oneof: reservedEntries.map(entry => entry.scheduleId) },
        'account.offbudget': false,
        date: [
          {
            $gte: `${monthUtils.subMonths(windowStart, LINKED_PAYMENT_SEARCH_MONTHS)}-01`,
          },
          { $lt: windowStart },
        ],
      })
      .select(['date', 'schedule', 'category']),
  );
  const linkedBeforeWindow = linkedAnywhereBeforeWindow.filter(
    transaction => transaction.category === category.id,
  );
  // When budgeting the current or a past month, part (or all) of the
  // budget month has already happened. For that part, the category needs
  // whichever is larger: the occurrences due by today, or what was
  // actually spent by today (linked or not). An unlinked transaction can't
  // be told apart from a payment of the schedule, so a bill paid by hand
  // isn't counted twice; a bill that came in higher than scheduled counts
  // at its real amount; one that came in lower still reserves the
  // scheduled amount, since the rest may yet be due. A linked payment marks
  // one of its schedule's occurrences this month as elapsed even if it is
  // due after today, so an early payment isn't counted twice either. An
  // occurrence a payment before the budget month settled is skipped
  // outright: that money is already out of the carried-over balance.
  const tomorrow = monthUtils.addDays(today, 1);
  const budgetMonthEnd = monthUtils.firstDayOfMonth(
    monthUtils.addMonths(current_month, 1),
  );
  const postedEnd = tomorrow < budgetMonthEnd ? tomorrow : budgetMonthEnd;
  const sign = category.is_income ? 1 : -1;

  let postedTransactions: PostedTransaction[] = [];
  if (!isBudgetingAhead) {
    ({ data: postedTransactions } = await aqlQuery(
      q('transactions')
        .filter({
          category: category.id,
          'account.offbudget': false,
          date: [{ $gte: windowStart }, { $lt: postedEnd }],
        })
        .select(['amount', 'date', 'schedule']),
    ));
  }

  // Every range each schedule's occurrences are needed over below: the
  // forecast window, its pending occurrences, and the search around any
  // linked payments.
  const linkedSchedules = new Set(
    [...linkedAnywhereBeforeWindow, ...postedTransactions].map(
      transaction => transaction.schedule,
    ),
  );
  const lookups = new Map<ScheduleTemplateTarget, OccurrencesBetween>();
  for (const entry of reservedEntries) {
    const ranges: Array<[string, string]> = [[windowStart, windowEnd]];
    if (isBudgetingAhead) {
      ranges.push([currentMonthStart, windowStart]);
    }
    if (linkedSchedules.has(entry.scheduleId)) {
      ranges.push([
        linkedSearchStart(windowStart),
        linkedSearchEnd(budgetMonthEnd),
      ]);
      if (isBudgetingAhead) {
        ranges.push([
          linkedSearchStart(currentMonthStart),
          linkedSearchEnd(windowStart),
        ]);
      }
    }
    lookups.set(entry, occurrenceLookup(entry, ranges));
  }

  // When budgeting ahead (current_month after the real current month), the
  // carried-over balance still holds money for occurrences due between now
  // and the window that haven't come out of this category yet. Count those
  // against month 0 so that money isn't treated as free. That's every
  // occurrence from next_date on, and any before it whose linked payment
  // sits outside this category (not categorized yet, say): next_date moves
  // past an occurrence once any linked payment exists. One next_date moved
  // past with no payment at all was skipped. Occurrences missed before the
  // real current month are ignored, so a long-stale next_date can't pile up.
  if (isBudgetingAhead) {
    for (const entry of reservedEntries) {
      const occurrencesBetween = lookups.get(entry);
      const paidAnywhere = settledOccurrences(
        entry,
        linkedAnywhereBeforeWindow,
        currentMonthStart,
        windowStart,
        occurrencesBetween,
      );
      const settledHere = settledOccurrences(
        entry,
        linkedBeforeWindow,
        currentMonthStart,
        windowStart,
        occurrencesBetween,
      );
      const pending = withinCutoff(
        entry,
        occurrencesBetween(currentMonthStart, windowStart),
      ).filter(
        date =>
          !settledHere.has(date) &&
          ((entry.storedNextDate && date >= entry.storedNextDate) ||
            paidAnywhere.has(date)),
      );
      monthlyOutflow[0] += pending.length * entry.perOccurrenceAmount;
    }
  }

  let dueByToday = 0;
  for (const entry of smoothEntries) {
    const occurrencesBetween = lookups.get(entry);
    const occurrences = withinCutoff(
      entry,
      occurrencesBetween(windowStart, windowEnd),
    );
    const settledEarly = settledOccurrences(
      entry,
      linkedBeforeWindow,
      windowStart,
      budgetMonthEnd,
      occurrencesBetween,
    );
    const paidThisMonth = isBudgetingAhead
      ? 0
      : [
          ...settledOccurrences(
            entry,
            postedTransactions,
            windowStart,
            budgetMonthEnd,
            occurrencesBetween,
          ),
        ].filter(date => !settledEarly.has(date)).length;
    let indexInBudgetMonth = 0;
    for (const occurrenceDate of occurrences) {
      if (settledEarly.has(occurrenceDate)) continue;
      const monthIndex = monthsBetween(current_month, occurrenceDate);
      const isElapsed =
        !isBudgetingAhead &&
        monthIndex === 0 &&
        (occurrenceDate < postedEnd || indexInBudgetMonth < paidThisMonth);
      if (monthIndex === 0) indexInBudgetMonth++;
      if (isElapsed) {
        dueByToday += entry.perOccurrenceAmount;
      } else if (monthIndex >= 0 && monthIndex < FORECAST_MONTHS) {
        monthlyOutflow[monthIndex] += entry.perOccurrenceAmount;
      }
    }
  }

  if (!isBudgetingAhead) {
    const spentByToday = postedTransactions
      .filter(transaction => !fullScheduleIds.includes(transaction.schedule))
      .reduce((sum, transaction) => sum + sign * transaction.amount, 0);
    monthlyOutflow[0] += Math.max(dueByToday, spentByToday);
  }

  // Unlinked transactions not covered above count at their own month.
  // Budgeting ahead, that's all of them from the budget month on. Otherwise
  // only future-dated ones count: when re-running a past month, spending
  // posted since then belongs to those later months' own budgets, and
  // counting it here would fund it twice.
  const unlinkedStart = isBudgetingAhead ? windowStart : tomorrow;
  const { data: unlinkedTransactions } = await aqlQuery(
    q('transactions')
      .filter({
        category: category.id,
        schedule: null,
        'account.offbudget': false,
        date: [{ $gte: unlinkedStart }, { $lt: windowEnd }],
      })
      .select(['amount', 'date']),
  );

  for (const transaction of unlinkedTransactions) {
    const monthIndex = monthsBetween(current_month, transaction.date);
    if (monthIndex >= 0 && monthIndex < FORECAST_MONTHS) {
      monthlyOutflow[monthIndex] += sign * transaction.amount;
    }
  }

  return monthlyOutflow;
}

const DAYS_PER_YEAR = 365.25;

// What a schedule costs a month in the long run; the forecast's steady
// rate is the sum of these. Daily and weekly schedules recur every fixed
// number of days. Monthly and yearly ones count their occurrences over
// whole months, twelve times the interval long: twelve cycles of a monthly
// schedule or one of a yearly one, however the dates fall, so day-of-month
// and weekday patterns (the 1st and 15th, the last Friday) count in full.
// The count starts the month after the next occurrence, so a schedule that
// hasn't started yet still counts at its full rate.
function getMonthlyRate(entry: ScheduleTemplateTarget) {
  if (!entry.repeat || entry.completed) return 0;
  const interval = entry.target_interval;
  switch (entry.target_frequency) {
    case 'daily':
      return (entry.perOccurrenceAmount * DAYS_PER_YEAR) / 12 / interval;
    case 'weekly':
      return (entry.perOccurrenceAmount * DAYS_PER_YEAR) / 7 / 12 / interval;
    default: {
      const months = 12 * interval;
      const from = monthUtils.addMonths(entry.next_date_string, 1);
      const occurrences = getOccurrencesBetween(
        entry.dateConditions,
        `${from}-01`,
        `${monthUtils.addMonths(from, months)}-01`,
      ).length;
      return (entry.perOccurrenceAmount * occurrences) / months;
    }
  }
}

// Pure, synchronous: given a starting balance, a projected monthly-outflow
// array (an entry can be negative — an unlinked inflow transaction offsets
// that month's need) and the steady rate, returns this month's whole-cent
// contribution, and the last month of the catch-up (see below).
//
// The answer is the smallest of two kinds of plan, each of which keeps
// the projected balance non-negative across the whole window.
//
// Using up a surplus: the required balance is the smallest starting
// balance from which contributing the steady rate every month never lets
// the projected balance go negative. Anything above it is used up before
// anything new is asked for: the steady rate less the surplus, never below
// zero. Nothing is ever taken back out of the category; the user can move
// a surplus elsewhere by hand.
//
// Catching up: a constant contribution c through some month k, then the
// steady rate. Each month i's balance is affine in c:
//   balance[i] = startingBalance + (i + 1) * c - cumsum[i]
// so c covers months 0..k when c >= (cumsum[i] - startingBalance) / (i + 1)
// for each i <= k, and leaves the steady rate enough from then on when
// balance[k] is at least what the rest of the window needs at that rate.
// The catch-up ends in a month whose bills reach the steady rate: that's
// what the money is being saved for. Ending it in a quieter month just
// puts off saving and then asks for the steady rate all at once. Money
// already saved toward that month counts toward it, so a catch-up already
// under way carries on at the same pace.
function solveForecast(
  startingBalance: number,
  monthlyOutflow: number[],
  steadyRate: number,
): { contribution: number; catchUpEnd: number } {
  const months = monthlyOutflow.length;
  const cumsum: number[] = [];
  let total = 0;
  for (const outflow of monthlyOutflow) {
    total += outflow;
    cumsum.push(total);
  }
  // How far the bills through month i run ahead of the steady rate.
  const ahead = cumsum.map((sum, i) => sum - steadyRate * (i + 1));
  const requiredBalance = Math.max(0, ...ahead);

  const surplus = startingBalance - requiredBalance;
  const best = {
    contribution: surplus > 0 ? Math.max(0, steadyRate - surplus) : Infinity,
    catchUpEnd: 0,
  };

  // The balance the steady rate needs at the end of month i to cover
  // every month after it.
  const neededAfter = new Array<number>(months);
  let laterAhead = -Infinity;
  for (let i = months - 1; i >= 0; i--) {
    neededAfter[i] = Math.max(0, laterAhead - ahead[i]);
    laterAhead = Math.max(laterAhead, ahead[i]);
  }

  const fallback = { contribution: Infinity, catchUpEnd: 0 };
  let coversSoFar = 0;
  for (let k = 0; k < months; k++) {
    coversSoFar = Math.max(
      coversSoFar,
      Math.ceil((cumsum[k] - startingBalance) / (k + 1)),
    );
    const contribution = Math.max(
      coversSoFar,
      Math.ceil((cumsum[k] + neededAfter[k] - startingBalance) / (k + 1)),
    );
    const option = monthlyOutflow[k] >= steadyRate ? best : fallback;
    if (contribution < option.contribution) {
      option.contribution = contribution;
      option.catchUpEnd = k;
    }
  }
  return best.contribution < Infinity ? best : fallback;
}

export function solveMonthlyContribution(
  startingBalance: number,
  monthlyOutflow: number[],
  steadyRate: number,
): number {
  return solveForecast(startingBalance, monthlyOutflow, steadyRate)
    .contribution;
}

export async function runScheduleForecast(
  template_lines: Template[],
  current_month: string,
  balance: number,
  to_budget: number,
  category: CategoryEntity,
): Promise<{
  to_budget: number;
  perScheduleMonthly: Map<ScheduleTemplate, number>;
}> {
  const scheduleTemplates = template_lines.filter(t => t.type === 'schedule');
  const t = await createScheduleList(
    scheduleTemplates,
    current_month,
    category,
  );

  // A tracking budget doesn't carry a category's leftover into the next
  // month, so nothing can be saved ahead for a bill: every schedule is
  // budgeted like a full-flag one, in the month it's due.
  const isTracking = isTrackingBudget();
  // Past-due and completed schedules only matter to the forecast: it
  // reserves the past-due ones still unpaid out of the carried-over
  // balance, and a schedule that completed this month still has its
  // payment in this month's spending.
  const fullEntries = t.t.filter(
    c => (isTracking || c.template.full) && !c.isPastDue && !c.completed,
  );
  // A completed full-flag schedule has nothing left to budget in full, but
  // its payment this month still has to be covered, so it rides the
  // forecast like a completed smooth one.
  const smoothEntries = isTracking
    ? []
    : t.t.filter(c => !c.template.full || c.completed);

  const perScheduleMonthly = new Map<ScheduleTemplate, number>();
  // Full-flag schedules are budgeted in full only when due this month,
  // never smoothed and never budgeted ahead of time.
  const fullContribution = fullEntries.reduce((sum, c) => {
    const contribution = c.num_months === 0 ? c.target : 0;
    perScheduleMonthly.set(
      c.template,
      (perScheduleMonthly.get(c.template) ?? 0) + contribution,
    );
    return sum + contribution;
  }, 0);

  if (smoothEntries.length === 0) {
    return {
      to_budget: to_budget + fullContribution,
      perScheduleMonthly,
    };
  }

  const monthlyOutflow = await buildMonthlyOutflow(
    smoothEntries,
    current_month,
    category,
    fullEntries,
  );
  const steadyRate = Math.max(
    0,
    Math.ceil(smoothEntries.reduce((s, c) => s + getMonthlyRate(c), 0)),
  );
  // Full-flag bills are paid from fullContribution, which is added on top,
  // so they don't draw on the balance the forecast starts from.
  const { contribution: candidate, catchUpEnd } = solveForecast(
    balance,
    monthlyOutflow,
    steadyRate,
  );

  // Split the single smoothed candidate back out across the smooth
  // schedules that share this category. Each starts from its own monthly
  // rate. A past-due or completed schedule has no rate going forward, so it
  // only shares when nothing else in the category is left to take the
  // amount.
  const upcomingEntries = smoothEntries.filter(
    c => !c.isPastDue && !c.completed,
  );
  const splitEntries =
    upcomingEntries.length > 0 ? upcomingEntries : smoothEntries;
  const weights = splitEntries.map(getMonthlyRate);
  const totalMonthlyWeight = weights.reduce((s, weight) => s + weight, 0);

  // A catch-up above the steady rate goes to the schedules that are behind:
  // each one's shortfall is what falls due through the catch-up beyond what
  // its own monthly rate would have put by. A schedule on pace keeps its
  // monthly rate.
  const catchUp = candidate - totalMonthlyWeight;
  const catchUpMonths = catchUpEnd + 1;
  const catchUpEndDay = monthUtils.firstDayOfMonth(
    monthUtils.addMonths(current_month, catchUpMonths),
  );
  const shortfalls = splitEntries.map((entry, i) =>
    catchUp > 0
      ? Math.max(
          0,
          getOccurrencesBetween(
            entry.dateConditions,
            monthUtils.firstDayOfMonth(current_month),
            catchUpEndDay,
          ).length *
            entry.perOccurrenceAmount -
            weights[i] * catchUpMonths,
        )
      : 0,
  );
  const totalShortfall = shortfalls.reduce((s, shortfall) => s + shortfall, 0);

  for (const [i, entry] of splitEntries.entries()) {
    // When the smooth schedules sharing this category net to a zero total
    // monthly rate (e.g. two schedules with offsetting signs),
    // dividing by zero would yield NaN or +/-Infinity — never valid for a
    // money-typed map. Fall back to an even split across the entries,
    // which is always finite.
    const share =
      totalShortfall > 0
        ? Math.round(weights[i] + (catchUp * shortfalls[i]) / totalShortfall)
        : totalMonthlyWeight === 0
          ? Math.round(candidate / splitEntries.length)
          : Math.round((weights[i] / totalMonthlyWeight) * candidate) || 0;
    perScheduleMonthly.set(
      entry.template,
      (perScheduleMonthly.get(entry.template) ?? 0) + share,
    );
  }

  return {
    to_budget: to_budget + fullContribution + candidate,
    perScheduleMonthly,
  };
}
