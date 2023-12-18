import * as monthUtils from '../../../shared/months';
import { extractScheduleConds } from '../../../shared/schedules';
import * as db from '../../db';
import {
  getRuleForSchedule,
  getNextDate,
  getDateWithSkippedWeekend,
} from '../../schedules/app';
import { isReflectBudget } from '../actions';

async function createScheduleList(template, current_month) {
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
    const target =
      amountCondition.op === 'isbetween'
        ? -Math.round(amountCondition.value.num1 + amountCondition.value.num2) /
          2
        : -amountCondition.value;
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
    const startDate = dateConditions.value.start ?? dateConditions.value;
    const started = startDate <= monthUtils.addMonths(current_month, 1);
    t.push({
      target,
      next_date_string,
      target_interval,
      target_frequency,
      num_months,
      completed: complete,
      started,
      full: template[ll].full === null ? false : template[ll].full,
      repeat: isRepeating,
    });
    if (!complete && started) {
      if (isRepeating) {
        let monthlyTarget = 0;
        const nextMonth = monthUtils.addMonths(
          current_month,
          t[ll].num_months + 1,
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
        t[ll].target = -monthlyTarget;
      }
    } else {
      errors.push(
        `Schedule ${t[ll].template.name} is not active during the month in question.`,
      );
    }
  }
  return { t: t.filter(c => c.completed === 0), errors };
}

async function getPayMonthOfTotal(t) {
  let total = 0;
  const schedules = t.filter(c => c.num_months === 0);
  for (let ll = 0; ll < schedules.length; ll++) {
    total += schedules[ll].target;
  }
  return total;
}

async function getSinkingContributionTotal(t, remainder, last_month_balance) {
  let total = 0;
  for (let ll = 0; ll < t.length; ll++) {
    remainder =
      ll === 0 ? t[ll].target - last_month_balance : t[ll].target - remainder;
    total +=
      remainder > 0 ? 0 : (t[ll].target - remainder) / (t[ll].num_months + 1);
  }
  return total;
}

async function getSinkingBaseContributionTotal(t) {
  let total = 0;
  for (let ll = 0; ll < t.length; ll++) {
    total += t[ll].target / t[ll].target_interval;
  }
  return total;
}

async function getSinkingTotal(t) {
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
) {
  if (!scheduleFlag) {
    scheduleFlag = true;
    const template = template_lines.filter(t => t.type === 'schedule');
    //in the case of multiple templates per category, schedules may have wrong priority level

    const t = await createScheduleList(template, current_month);
    errors = errors.concat(t.errors);

    const t_payMonthOf = t.t.filter(
      c =>
        c.full ||
        (c.target_frequency === 'monthly' &&
          c.target_interval === 1 &&
          c.num_months === 0) ||
        (c.target_frequency === 'weekly' &&
          c.target_interval >= 0 &&
          c.num_months === 0) ||
        isReflectBudget(),
    );

    const t_sinking = t.t
      .filter(
        c =>
          (!c.full &&
            c.target_frequency === 'monthly' &&
            c.target_interval > 1) ||
          (!c.full && c.target_frequency === 'yearly'),
      )
      .sort((a, b) => b.next_date_string - a.next_date_string);

    const totalPayMonthOf = await getPayMonthOfTotal(t_payMonthOf);

    const totalSinking = await getSinkingTotal(t_sinking);
    const totalSinkingBaseContribution = await getSinkingBaseContributionTotal(
      t_sinking,
    );

    if (totalSinking + totalPayMonthOf < last_month_balance) {
      const totalSinkingContribution = await getSinkingContributionTotal(
        t_sinking,
        remainder,
        last_month_balance - totalPayMonthOf,
      );
      to_budget = Math.round(totalPayMonthOf + totalSinkingContribution);
    } else {
      to_budget = Math.round(totalPayMonthOf + totalSinkingBaseContribution);
    }

    //   t = t.filter(t => t.completed === 0 && t.started);
    //   t = t.sort((a, b) => b.target - a.target);

    //   let increment = 0;
    //   if (balance >= totalScheduledGoal) {
    //     for (let ll = 0; ll < t.length; ll++) {
    //       if (t[ll].num_months < 0) {
    //         errors.push(
    //           `Non-repeating schedule ${t[ll].template.name} was due on ${t[ll].next_date_string}, which is in the past.`,
    //         );
    //         break;
    //       }
    //       if (
    //         (t[ll].template.full && t[ll].num_months === 0) ||
    //         t[ll].target_frequency === 'weekly' ||
    //         t[ll].target_frequency === 'daily'
    //       ) {
    //         increment += t[ll].target;
    //       } else if (t[ll].template.full && t[ll].num_months > 0) {
    //         increment += 0;
    //       } else {
    //         increment += t[ll].target / t[ll].target_interval;
    //       }
    //     }
    //   } else if (balance < totalScheduledGoal) {
    //     for (let ll = 0; ll < t.length; ll++) {
    //       if (isReflectBudget()) {
    //         if (!t[ll].template.full) {
    //           errors.push(
    //             `Report budgets require the full option for Schedules.`,
    //           );
    //           break;
    //         }
    //         if (t[ll].template.full && t[ll].num_months === 0) {
    //           to_budget += t[ll].target;
    //         }
    //       }
    //       if (!isReflectBudget()) {
    //         if (t[ll].num_months < 0) {
    //           errors.push(
    //             `Non-repeating schedule ${t[ll].template.name} was due on ${t[ll].next_date_string}, which is in the past.`,
    //           );
    //           break;
    //         }
    //         if (t[ll].template.full && t[ll].num_months > 0) {
    //           remainder = 0;
    //         } else if (ll === 0 && !t[ll].template.full) {
    //           remainder = t[ll].target - last_month_balance;
    //         } else {
    //           remainder = t[ll].target - remainder;
    //         }
    //         let tg = 0;
    //         if (remainder >= 0) {
    //           tg = remainder;
    //           remainder = 0;
    //         } else {
    //           tg = 0;
    //           remainder = Math.abs(remainder);
    //         }
    //         if (
    //           t[ll].template.full ||
    //           t[ll].num_months === 0 ||
    //           t[ll].target_frequency === 'weekly' ||
    //           t[ll].target_frequency === 'daily'
    //         ) {
    //           increment += tg;
    //         } else if (t[ll].template.full && t[ll].num_months > 0) {
    //           increment += 0;
    //         } else {
    //           increment += tg / (t[ll].num_months + 1);
    //         }
    //       }
    //     }
    //   }
    //   increment = Math.round(increment);
    //   to_budget += increment;
  }
  return { to_budget, errors, remainder, scheduleFlag };
}
