// @ts-strict-ignore

import { aqlQuery } from '#server/aql';
import * as db from '#server/db';
import { fromDateRepr } from '#server/models';
import { collectFormulasFromActions } from '#server/rules/balanceOfFormula';
import { getRuleForSchedule } from '#server/schedules/app';
import { prefetchBalanceOfForTransaction } from '#server/transactions/transaction-rules';
import type { Currency } from '#shared/currencies';
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

import { getSheetValue, isTrackingBudget } from './actions';

type ScheduleTemplateTarget = {
  template: ScheduleTemplate;
  name: string;
  target: number;
  // The un-aggregated amount of a single occurrence of this schedule,
  // computed before `target` is summed across every occurrence landing
  // in the schedule's monthly-equivalent aggregation window below. Unlike
  // `target` (whose value is a monthly-equivalent aggregate that
  // `runSchedule`/`getMonthlyBaseContribution` depend on), this is the
  // right value to multiply by an occurrence count elsewhere (e.g.
  // `buildMonthlyOutflow`, which buckets one entry per occurrence date).
  perOccurrenceAmount: number;
  next_date_string: string;
  // The schedule's own stored next_date: the first occurrence not yet
  // paid, weekend-adjusted. Unlike `next_date_string` (computed from
  // `current_month`), this reflects what has actually posted. Null when
  // the schedule has no next-date row.
  storedNextDate: string | null;
  scheduleId: string;
  target_interval: number;
  target_frequency: string | undefined;
  num_months: number;
  completed: number;
  full: boolean;
  repeat: boolean;
  dateConditions: ReturnType<typeof extractScheduleConds>['date'];
};

export async function createScheduleList(
  templates: ScheduleTemplate[],
  current_month: string,
  category: CategoryEntity,
  currency: Currency,
) {
  const t: Array<ScheduleTemplateTarget> = [];
  const errors: string[] = [];
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
          scheduleAmount +=
            sign * amountToInteger(template.adjustment, currency.decimalPlaces);
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
    if (num_months < 0) {
      //non-repeating schedules could be negative
      errors.push(`Schedule ${displayName} is in the Past.`);
    } else {
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
      });
      if (!completed) {
        if (isRepeating) {
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
      } else {
        errors.push(
          `Schedule ${displayName} is not active during the month in question.`,
        );
      }
    }
  }
  return { t: t.filter(c => c.completed === 0), errors };
}

const FORECAST_MONTHS = 60;

type PostedTransaction = {
  amount?: number;
  date: string;
  schedule: string | null;
};

// How many of this schedule's linked payments settle one of its
// occurrences in [rangeStart, rangeEnd). The link says which schedule a
// payment belongs to; each payment is attributed to that schedule's
// nearest occurrence, so an early payment settles the upcoming occurrence
// and a late one settles the previous occurrence, not the next.
function countLinkedPayments(
  entry: ScheduleTemplateTarget,
  transactions: PostedTransaction[],
  rangeStart: string,
  rangeEnd: string,
): number {
  const linked = transactions.filter(
    transaction => transaction.schedule === entry.scheduleId,
  );
  if (linked.length === 0) return 0;

  const nearby = getOccurrencesBetween(
    entry.dateConditions,
    `${monthUtils.subMonths(rangeStart, 1)}-01`,
    `${monthUtils.addMonths(rangeEnd, 1)}-01`,
  );
  return linked.filter(transaction => {
    let nearest: string | null = null;
    let nearestDistance = Infinity;
    for (const occurrenceDate of nearby) {
      const distance = Math.abs(
        monthUtils.differenceInCalendarDays(transaction.date, occurrenceDate),
      );
      if (distance <= nearestDistance) {
        nearest = occurrenceDate;
        nearestDistance = distance;
      }
    }
    return nearest !== null && nearest >= rangeStart && nearest < rangeEnd;
  }).length;
}

export async function buildMonthlyOutflow(
  smoothEntries: ScheduleTemplateTarget[],
  current_month: string,
  category: CategoryEntity,
): Promise<number[]> {
  const monthlyOutflow = new Array(FORECAST_MONTHS).fill(0);
  const windowStart = monthUtils.firstDayOfMonth(current_month);
  const windowEnd = `${monthUtils.addMonths(current_month, FORECAST_MONTHS)}-01`;
  const today = monthUtils.currentDay();
  const currentMonthStart = monthUtils.firstDayOfMonth(today);
  const isBudgetingAhead = windowStart > currentMonthStart;

  // When budgeting ahead (current_month after the real current month), the
  // carried-over balance still holds money for occurrences due between now
  // and the window that haven't posted yet. Count those against month 0 so
  // that money isn't treated as free. Occurrences missed before the real
  // current month are ignored, so a long-stale next_date can't pile up.
  const pendingEntries = isBudgetingAhead
    ? smoothEntries.filter(
        entry => entry.storedNextDate && entry.storedNextDate < windowStart,
      )
    : [];
  // next_date only advances once its date has passed, so a payment made
  // early leaves it in place. A linked payment already in the carried-over
  // balance (dated before the budget month) settles its nearest pending
  // occurrence.
  let linkedBeforeWindow: PostedTransaction[] = [];
  if (pendingEntries.length > 0) {
    ({ data: linkedBeforeWindow } = await aqlQuery(
      q('transactions')
        .filter({
          schedule: { $oneof: pendingEntries.map(entry => entry.scheduleId) },
          date: {
            $gte: `${monthUtils.subMonths(currentMonthStart, 1)}-01`,
            $lt: windowStart,
          },
        })
        .options({ splits: 'none' })
        .select(['date', 'schedule']),
    ));
  }
  for (const entry of pendingEntries) {
    const pendingFrom =
      entry.storedNextDate > currentMonthStart
        ? entry.storedNextDate
        : currentMonthStart;
    const pending = getOccurrencesBetween(
      entry.dateConditions,
      pendingFrom,
      windowStart,
    );
    const settled = countLinkedPayments(
      entry,
      linkedBeforeWindow,
      pendingFrom,
      windowStart,
    );
    monthlyOutflow[0] +=
      Math.max(0, pending.length - settled) * entry.perOccurrenceAmount;
  }

  // When budgeting the current or a past month, part (or all) of the
  // budget month has already happened. For that part, the category needs
  // whichever is larger: the occurrences due by today, or what was
  // actually spent by today (linked or not). An unlinked transaction can't
  // be told apart from a payment of the schedule, so a bill paid by hand
  // isn't counted twice; a bill that came in higher than scheduled counts
  // at its real amount; one that came in lower still reserves the
  // scheduled amount, since the rest may yet be due. A linked payment marks
  // one of its schedule's occurrences this month as elapsed even if it is
  // due after today, so an early payment isn't counted twice either.
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
          date: { $gte: windowStart, $lt: postedEnd },
        })
        .select(['amount', 'date', 'schedule']),
    ));
  }

  let dueByToday = 0;
  for (const entry of smoothEntries) {
    const occurrences = getOccurrencesBetween(
      entry.dateConditions,
      windowStart,
      windowEnd,
    );
    const paidThisMonth = isBudgetingAhead
      ? 0
      : countLinkedPayments(
          entry,
          postedTransactions,
          windowStart,
          budgetMonthEnd,
        );
    let indexInBudgetMonth = 0;
    for (const occurrenceDate of occurrences) {
      const monthIndex = monthUtils.differenceInCalendarMonths(
        occurrenceDate,
        current_month,
      );
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
    const spentByToday = postedTransactions.reduce(
      (sum, transaction) => sum + sign * transaction.amount,
      0,
    );
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
        date: { $gte: unlinkedStart, $lt: windowEnd },
      })
      .select(['amount', 'date']),
  );

  for (const transaction of unlinkedTransactions) {
    const monthIndex = monthUtils.differenceInCalendarMonths(
      transaction.date,
      current_month,
    );
    if (monthIndex >= 0 && monthIndex < FORECAST_MONTHS) {
      monthlyOutflow[monthIndex] += sign * transaction.amount;
    }
  }

  return monthlyOutflow;
}

function getPayMonthOfTotal(t: ScheduleTemplateTarget[]) {
  //return the contribution amounts of full or every month type schedules
  let total = 0;
  const schedules = t.filter(c => c.num_months === 0);
  for (const schedule of schedules) {
    total += schedule.target;
  }
  return total;
}

function getSinkingContributionBreakdown(
  t: ScheduleTemplateTarget[],
  remainder: number,
  last_month_balance: number,
) {
  // Mirrors getSinkingContributionTotal but also records each schedule's
  // contribution so the caller can attribute the batch back to individual
  // templates. Total math is unchanged.
  let total = 0;
  const perSchedule = new Map<ScheduleTemplate, number>();
  for (const [index, schedule] of t.entries()) {
    remainder =
      index === 0
        ? schedule.target - last_month_balance
        : schedule.target - remainder;
    let tg = 0;
    if (remainder >= 0) {
      tg = remainder;
      remainder = 0;
    } else {
      tg = 0;
      remainder = Math.abs(remainder);
    }
    const contribution = tg / (schedule.num_months + 1);
    total += contribution;
    perSchedule.set(
      schedule.template,
      (perSchedule.get(schedule.template) ?? 0) + contribution,
    );
  }
  return { total, perSchedule };
}

function getMonthlyBaseContribution(schedule: ScheduleTemplateTarget) {
  let prevDate;
  let intervalMonths;
  switch (schedule.target_frequency) {
    case 'yearly':
      return schedule.target / schedule.target_interval / 12;
    case 'monthly':
      return schedule.target / schedule.target_interval;
    case 'weekly':
      prevDate = monthUtils.subWeeks(
        schedule.next_date_string,
        schedule.target_interval,
      );
      intervalMonths = monthUtils.differenceInCalendarMonths(
        schedule.next_date_string,
        prevDate,
      );
      if (intervalMonths === 0) intervalMonths = 1;
      return schedule.target / intervalMonths;
    case 'daily':
      prevDate = monthUtils.subDays(
        schedule.next_date_string,
        schedule.target_interval,
      );
      intervalMonths = monthUtils.differenceInCalendarMonths(
        schedule.next_date_string,
        prevDate,
      );
      if (intervalMonths === 0) intervalMonths = 1;
      return schedule.target / intervalMonths;
    default:
      // default to same math as monthly for now for non-reoccuring
      return schedule.target / schedule.target_interval;
  }
}

function getSinkingBaseContributionTotal(t: ScheduleTemplateTarget[]) {
  let total = 0;
  for (const schedule of t) total += getMonthlyBaseContribution(schedule);
  return total;
}

function getSinkingTotal(t: ScheduleTemplateTarget[]) {
  //sum the total of all upcoming schedules
  let total = 0;
  for (const schedule of t) {
    total += schedule.target;
  }
  return total;
}

export async function runSchedule(
  template_lines: Template[],
  current_month: string,
  balance: number,
  remainder: number,
  last_month_balance: number,
  to_budget: number,
  errors: string[],
  category: CategoryEntity,
  currency: Currency,
) {
  const scheduleTemplates = template_lines.filter(t => t.type === 'schedule');

  const t = await createScheduleList(
    scheduleTemplates,
    current_month,
    category,
    currency,
  );
  errors = errors.concat(t.errors);

  const isPayMonthOf = c =>
    c.full ||
    ((c.target_frequency === 'monthly' || !c.target_frequency) &&
      c.target_interval === 1 &&
      c.num_months === 0) ||
    (c.target_frequency === 'weekly' && c.target_interval <= 4) ||
    (c.target_frequency === 'daily' && c.target_interval <= 31) ||
    isTrackingBudget();

  const isSubMonthly = c =>
    c.target_frequency === 'weekly' || c.target_frequency === 'daily';

  const t_payMonthOf = t.t.filter(isPayMonthOf);
  const t_sinking = t.t
    .filter(c => !isPayMonthOf(c))
    .sort((a, b) => a.next_date_string.localeCompare(b.next_date_string));
  const numSubMonthly = t.t.filter(isSubMonthly).length;
  const totalPayMonthOf = getPayMonthOfTotal(t_payMonthOf);
  const totalSinking = getSinkingTotal(t_sinking);
  const totalSinkingBaseContribution =
    getSinkingBaseContributionTotal(t_sinking);
  const lastMonthGoal = await getSheetValue(
    monthUtils.sheetForMonth(monthUtils.subMonths(current_month, 1)),
    `goal-${category.id}`,
  );

  // check and see if we should budget the full amount becaue the previous schedules
  // haven't been paid yet, or if we can use the leftover balance for this month
  // First option: check if the previous month doesn't have its monthly schedules paid yet
  // Second option: check if the previous month needed less than this month and hasn't paid yet
  // Accumulate per-schedule contributions, keyed by the source template, so
  // callers can attribute the batched to_budget back to individual schedule
  // templates for UI projections.
  const perScheduleMonthly = new Map<ScheduleTemplate, number>();
  const addContribution = (template: ScheduleTemplate, amount: number) => {
    perScheduleMonthly.set(
      template,
      (perScheduleMonthly.get(template) ?? 0) + amount,
    );
  };

  if (
    balance >= totalSinking + totalPayMonthOf ||
    (lastMonthGoal < totalSinking + totalPayMonthOf &&
      lastMonthGoal !== 0 &&
      balance >= lastMonthGoal &&
      numSubMonthly > 0)
  ) {
    to_budget += Math.round(totalPayMonthOf + totalSinkingBaseContribution);
    for (const c of t_payMonthOf) {
      if (c.num_months === 0) {
        addContribution(c.template, c.target);
      }
    }
    for (const c of t_sinking) {
      addContribution(c.template, getMonthlyBaseContribution(c));
    }
  } else {
    const { total: totalSinkingContribution, perSchedule: sinkingPerSchedule } =
      getSinkingContributionBreakdown(t_sinking, remainder, last_month_balance);
    if (t_sinking.length === 0) {
      to_budget +=
        Math.round(totalPayMonthOf + totalSinkingContribution) -
        last_month_balance;
    } else {
      to_budget += Math.round(totalPayMonthOf + totalSinkingContribution);
    }
    for (const c of t_payMonthOf) {
      if (c.num_months === 0) {
        addContribution(c.template, c.target);
      }
    }
    for (const [template, amount] of sinkingPerSchedule) {
      addContribution(template, amount);
    }
  }
  return { to_budget, errors, remainder, perScheduleMonthly };
}

// Pure, synchronous: given a starting balance and a 60-length projected
// monthly-outflow array (an entry can be negative — an unlinked inflow
// transaction offsets that month's need), returns the minimal whole-cent
// monthly contribution that keeps the projected balance non-negative
// across the whole window.
//
// Each month i's balance is affine in `candidate`:
//   balance[i] = startingBalance + (i + 1) * candidate - cumsum[i]
// so balance[i] >= 0 for all i  <=>  candidate >= threshold_i for all i,
// where threshold_i = (cumsum[i] - startingBalance) / (i + 1) does not
// depend on candidate at all. The answer is simply max_i(threshold_i).
// An earlier guess-and-correct version of this function was wrong: it
// operated on each month's raw balance, which is the
// threshold gap scaled by (i + 1) — a late month's small gap can
// produce a larger raw balance than an early month's large gap, so
// picking the extremum of raw balance does not reliably find
// max_i(threshold_i)).
export function solveMonthlyContribution(
  startingBalance: number,
  monthlyOutflow: number[],
): number {
  let candidate = 0;
  let cumsum = 0;

  for (let i = 0; i < monthlyOutflow.length; i++) {
    cumsum += monthlyOutflow[i];
    const threshold = Math.ceil((cumsum - startingBalance) / (i + 1));
    candidate = Math.max(candidate, threshold);
  }

  return candidate;
}

export async function runScheduleForecast(
  template_lines: Template[],
  current_month: string,
  balance: number,
  last_month_balance: number,
  to_budget: number,
  errors: string[],
  category: CategoryEntity,
  currency: Currency,
): Promise<{
  to_budget: number;
  errors: string[];
  perScheduleMonthly: Map<ScheduleTemplate, number>;
}> {
  const scheduleTemplates = template_lines.filter(t => t.type === 'schedule');
  const t = await createScheduleList(
    scheduleTemplates,
    current_month,
    category,
    currency,
  );
  errors = errors.concat(t.errors);

  const fullEntries = t.t.filter(c => c.template.full);
  const smoothEntries = t.t.filter(c => !c.template.full);

  const perScheduleMonthly = new Map<ScheduleTemplate, number>();
  // Full-flag schedules keep today's exact runSchedule behavior: they're
  // budgeted in full only when due this month, never smoothed and never
  // budgeted ahead of time.
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
      errors,
      perScheduleMonthly,
    };
  }

  const monthlyOutflow = await buildMonthlyOutflow(
    smoothEntries,
    current_month,
    category,
  );
  const forecastStartingBalance = balance - fullContribution;
  const candidate = solveMonthlyContribution(
    forecastStartingBalance,
    monthlyOutflow,
  );

  // Split the single smoothed candidate back out across the smooth
  // schedules that share this category, proportional to each schedule's
  // own monthly-equivalent contribution — the same normalization
  // `runSchedule` already uses (getMonthlyBaseContribution divides a
  // yearly/weekly/daily target down to a monthly-equivalent amount; using
  // raw `entry.target` instead would treat a yearly schedule's full
  // lump-sum as if it were a monthly amount, and would also understate
  // every schedule's share relative to the 60-month total outflow, which
  // is a different, larger quantity entirely).
  const totalMonthlyWeight = smoothEntries.reduce(
    (s, c) => s + getMonthlyBaseContribution(c),
    0,
  );

  for (const entry of smoothEntries) {
    // When the smooth schedules sharing this category net to a zero total
    // monthly-equivalent weight (e.g. two schedules with offsetting signs),
    // dividing by zero would yield NaN or +/-Infinity — never valid for a
    // money-typed map. Fall back to an even split across the entries,
    // which is always finite.
    const share =
      totalMonthlyWeight === 0
        ? Math.round(candidate / smoothEntries.length)
        : Math.round(
            (getMonthlyBaseContribution(entry) / totalMonthlyWeight) *
              candidate,
          ) || 0;
    perScheduleMonthly.set(
      entry.template,
      (perScheduleMonthly.get(entry.template) ?? 0) + share,
    );
  }

  return {
    to_budget: to_budget + fullContribution + candidate,
    errors,
    perScheduleMonthly,
  };
}
