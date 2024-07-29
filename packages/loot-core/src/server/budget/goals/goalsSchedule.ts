// @ts-strict-ignore
import * as monthUtils from '../../../shared/months';
import { extractScheduleConds } from '../../../shared/schedules';
import * as db from '../../db';
import {
  getRuleForSchedule,
  getNextDate,
  getDateWithSkippedWeekend,
} from '../../schedules/app';
import { isReflectBudget } from '../actions';

async function createScheduleList(template, current_month, category) {
  const t = [];
  const errors = [];

  for (let ll = 0; ll < template.length; ll++) {
    const { id: sid, completed: complete } = await db.first(
      'SELECT * FROM schedules WHERE name = ? AND tombstone = 0',
      [template[ll].name],
    );
    const rule = await getRuleForSchedule(sid);
    const conditions = rule.serialize().conditions;
    const { date: dateConditions, amount: amountCondition } =
      extractScheduleConds(conditions);
    const scheduleAmount =
      amountCondition.op === 'isbetween'
        ? Math.round(amountCondition.value.num1 + amountCondition.value.num2) /
          2
        : amountCondition.value;
    const { amount: postRuleAmount, subtransactions } = rule.execActions({
      amount: scheduleAmount,
      category: category.id,
      subtransactions: [],
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
        : postRuleAmount ?? scheduleAmount);

    const next_date_string = getNextDate(
      dateConditions,
      monthUtils._parse(current_month),
    );
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
      errors.push(`Schedule ${template[ll].name} is in the Past.`);
    } else {
      t.push({
        target,
        next_date_string,
        target_interval,
        target_frequency,
        num_months,
        completed: complete,
        //started,
        full: template[ll].full === null ? false : template[ll].full,
        repeat: isRepeating,
        name: template[ll].name,
      });
      if (!complete) {
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
          `Schedule ${t[ll].name} is not active during the month in question.`,
        );
      }
    }
  }
  return { t: t.filter(c => c.completed === 0), errors };
}

async function getPayMonthOfTotal(t) {
  //return the contribution amounts of full or every month type schedules
  let total = 0;
  const schedules = t.filter(c => c.num_months === 0);
  for (let ll = 0; ll < schedules.length; ll++) {
    total += schedules[ll].target;
  }
  return total;
}

async function getSinkingContributionTotal(t, remainder, last_month_balance) {
  //return the contribution amount if there is a balance carried in the category
  let total = 0;
  for (let ll = 0; ll < t.length; ll++) {
    remainder =
      ll === 0 ? t[ll].target - last_month_balance : t[ll].target - remainder;
    let tg = 0;
    if (remainder >= 0) {
      tg = remainder;
      remainder = 0;
    } else {
      tg = 0;
      remainder = Math.abs(remainder);
    }
    total += tg / (t[ll].num_months + 1);
  }
  return total;
}

async function getSinkingBaseContributionTotal(t) {
  //return only the base contribution of each schedule
  let total = 0;
  for (let ll = 0; ll < t.length; ll++) {
    total += t[ll].target / t[ll].target_interval;
  }
  return total;
}

async function getSinkingTotal(t) {
  //sum the total of all upcoming schedules
  let total = 0;
  for (let ll = 0; ll < t.length; ll++) {
    total += t[ll].target;
  }
  return total;
}

export async function goalsSchedule(
  scheduleFlag,
  template_lines,
  current_month,
  balance,
  remainder,
  last_month_balance,
  to_budget,
  errors,
  category,
  set_budget,
  payDistributeTemplateActive
) {
  if (!scheduleFlag) {
    scheduleFlag = true;
    const template = template_lines.filter(t => t.type === 'schedule');
    //in the case of multiple templates per category, schedules may have wrong priority level

    const t = await createScheduleList(template, current_month, category);
    errors = errors.concat(t.errors);

    const isPayMonthOf = c =>
      c.full ||
      (c.target_frequency === 'monthly' &&
        c.target_interval === 1 &&
        c.num_months === 0) ||
      (c.target_frequency === 'weekly' &&
        c.target_interval >= 0 &&
        c.num_months === 0) ||
      c.target_frequency === 'daily' ||
      isReflectBudget();

    const t_payMonthOf = t.t.filter(isPayMonthOf);
    const t_sinking = t.t
      .filter(c => !isPayMonthOf(c))
      .sort((a, b) => a.next_date_string.localeCompare(b.next_date_string));
    const totalPayMonthOf = await getPayMonthOfTotal(t_payMonthOf);
    const totalSinking = await getSinkingTotal(t_sinking);
    const totalSinkingBaseContribution =
      await getSinkingBaseContributionTotal(t_sinking);

    if (balance >= totalSinking + totalPayMonthOf) {
      to_budget += Math.round(totalPayMonthOf + totalSinkingBaseContribution);
      if (!payDistributeTemplateActive) { set_budget += Math.round(totalPayMonthOf + totalSinkingBaseContribution);}
    } else {
      const totalSinkingContribution = await getSinkingContributionTotal(
        t_sinking,
        remainder,
        last_month_balance,
      );
      if (t_sinking.length === 0) {
        to_budget +=
          Math.round(totalPayMonthOf + totalSinkingContribution) -
          last_month_balance;
          if (!payDistributeTemplateActive) { 
            set_budget += Math.round(totalPayMonthOf + totalSinkingContribution) -
            last_month_balance;
          }

      } else {
        to_budget += Math.round(totalPayMonthOf + totalSinkingContribution);
        if (!payDistributeTemplateActive) { 
          set_budget += Math.round(totalPayMonthOf + totalSinkingContribution);
        }
      }
    }
  }
  return { to_budget, errors, remainder, scheduleFlag, set_budget };
}
