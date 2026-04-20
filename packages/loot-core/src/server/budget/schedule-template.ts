// @ts-strict-ignore

import * as db from '#server/db';
import { collectFormulasFromActions } from '#server/rules/balanceOfFormula';
import { getRuleForSchedule } from '#server/schedules/app';
import { prefetchBalanceOfForTransaction } from '#server/transactions/transaction-rules';
import type { Currency } from '#shared/currencies';
import * as monthUtils from '#shared/months';
import {
  extractScheduleConds,
  getDateWithSkippedWeekend,
  getNextDate,
} from '#shared/schedules';
import { amountToInteger } from '#shared/util';
import type { CategoryEntity, TransactionEntity } from '#types/models';
import type { ScheduleTemplate, Template } from '#types/models/templates';

import { allocateCumulativeMilestones } from './milestone-allocation';
import type { BudgetMilestone } from './milestone-allocation';

type ScheduleTemplateTarget = {
  name: string;
  target: number;
  next_date_string: string;
  target_interval: number;
  target_frequency: string | undefined;
  num_months: number;
  completed: number;
  full: boolean;
  repeat: boolean;
};

async function createScheduleList(
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
    const { id: sid, completed } = await db.first<
      Pick<db.DbSchedule, 'id' | 'completed'>
    >(
      'SELECT id, completed FROM schedules WHERE TRIM(name) = ? AND tombstone = 0',
      [template.name],
    );
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
    if (num_months < 0) {
      //non-repeating schedules could be negative
      errors.push(`Schedule ${template.name} is in the Past.`);
    } else {
      t.push({
        target,
        next_date_string,
        target_interval,
        target_frequency,
        num_months,
        completed,
        //started,
        full: template.full === null ? false : template.full,
        repeat: isRepeating,
        name: template.name,
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
          `Schedule ${template.name} is not active during the month in question.`,
        );
      }
    }
  }
  return { t: t.filter(c => c.completed === 0), errors };
}

function scheduleTargetsToMilestones(
  targets: ScheduleTemplateTarget[],
  current_month: string,
): BudgetMilestone[] {
  const milestones: BudgetMilestone[] = [];
  for (const s of targets) {
    const month = s.next_date_string.slice(0, 7);
    if (monthUtils.differenceInCalendarMonths(month, current_month) < 0) {
      continue;
    }
    milestones.push({ month, increment: s.target });
  }
  return milestones;
}

export async function loadScheduleMilestones(
  scheduleTemplates: ScheduleTemplate[],
  current_month: string,
  category: CategoryEntity,
  currency: Currency,
): Promise<{ milestones: BudgetMilestone[]; errors: string[] }> {
  const { t, errors } = await createScheduleList(
    scheduleTemplates,
    current_month,
    category,
    currency,
  );
  return {
    milestones: scheduleTargetsToMilestones(t, current_month),
    errors,
  };
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
  void remainder;
  void last_month_balance;
  const scheduleTemplates = template_lines.filter(t => t.type === 'schedule');

  const { milestones, errors: loadErrors } = await loadScheduleMilestones(
    scheduleTemplates,
    current_month,
    category,
    currency,
  );
  const mergedErrors = errors.concat(loadErrors);
  const monthly = allocateCumulativeMilestones(
    milestones,
    current_month,
    balance,
  );
  return { to_budget: to_budget + monthly, errors: mergedErrors, remainder: 0 };
}
