/* eslint-disable */
import * as monthUtils from '../../../shared/months';
import { extractScheduleConds } from '../../../shared/schedules';
import * as db from '../../db';
import { getRuleForSchedule, getNextDate } from '../../schedules/app';
import { isReflectBudget } from '../actions';

async function parseSchedules(template, current_month, t, errors) {
  let { id: sid, completed: complete } = await db.first(
    'SELECT * FROM schedules WHERE name = ?',
    [template.name],
  );
  console.log(complete);
  let rule = await getRuleForSchedule(sid);
  let conditions = rule.serialize().conditions;
  let { date: dateConditions, amount: amountCondition } =
    extractScheduleConds(conditions);
  let target =
    amountCondition.op === 'isbetween'
      ? -Math.round(amountCondition.value.num1 + amountCondition.value.num2) / 2
      : -amountCondition.value;
  let next_date_string = getNextDate(
    dateConditions,
    monthUtils._parse(current_month),
  );
  let target_interval = dateConditions.value.interval
    ? dateConditions.value.interval
    : 1;
  let target_frequency = dateConditions.value.frequency;
  let isRepeating =
    Object(dateConditions.value) === dateConditions.value &&
    'frequency' in dateConditions.value;
  let num_months = monthUtils.differenceInCalendarMonths(
    next_date_string,
    current_month,
  );
  let skipWeekend = dateConditions.value.skipWeekend;
  let weekendSolveMode = dateConditions.value.weekendSolveMode;
  t.push({
    template: template,
    target: target,
    next_date_string: next_date_string,
    target_interval: target_interval,
    target_frequency: target_frequency,
    num_months: num_months,
    completed: complete,
    full: template.full,
  });
  if (!complete) {
    if (isRepeating) {
      let monthlyTarget = 0;
      let next_month = monthUtils.addMonths(
        current_month,
        t[t.length-1].num_months + 1,
      );
      let next_date = getNextDate(
        dateConditions,
        monthUtils._parse(current_month),
      );
      while (next_date < next_month) {
        monthlyTarget += -target;
        if (monthUtils.isWeekendOrFriday(next_date) && skipWeekend && weekendSolveMode === 'before') {
          next_date = monthUtils.nextMonday(next_date);
        } else {
        next_date = monthUtils.addDays(next_date, 1);
        }
        next_date = getNextDate(dateConditions, monthUtils._parse(next_date));
      }
      t[t.length-1].target = -monthlyTarget;
    }
  } else {
    errors.push(
      `Schedule ${t[t.length-1].template.name} is a completed schedule.`,
    );
  }
  return { t, errors };
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
    let template = template_lines.filter(t => t.type === 'schedule');
    //in the case of multiple templates per category, schedules may have wrong priority level
    let t = [];
    let totalScheduledGoal = 0;

    for (let ll = 0; ll < template.length; ll++) {
      let parseReturn = await parseSchedules(template[ll], current_month, t, errors);
      errors = parseReturn.errors;
      t = parseReturn.t;
    }

    t = t.filter(t => t.completed === 0);
    t = t.sort((a, b) => b.target - a.target);

    let increment = 0;
    if (balance >= totalScheduledGoal) {
      for (let ll = 0; ll < t.length; ll++) {
        if (t[ll].num_months < 0) {
          errors.push(
            `Non-repeating schedule ${t[ll].template.name} was due on ${t[ll].next_date_string}, which is in the past.`,
          );
          break;
        }
        if (
          (t[ll].template.full && t[ll].num_months === 0) ||
          t[ll].target_frequency === 'weekly' ||
          t[ll].target_frequency === 'daily'
        ) {
          increment += t[ll].target;
        } else if (t[ll].template.full && t[ll].num_months > 0) {
          increment += 0;
        } else {
          increment += t[ll].target / t[ll].target_interval;
        }
      }
    } else if (balance < totalScheduledGoal) {
      for (let ll = 0; ll < t.length; ll++) {
        if (isReflectBudget()) {
          if (!t[ll].template.full) {
            errors.push(
              `Report budgets require the full option for Schedules.`,
            );
            break;
          }
          if (t[ll].template.full && t[ll].num_months === 0) {
            to_budget += t[ll].target;
          }
        }
        if (!isReflectBudget()) {
          if (t[ll].num_months < 0) {
            errors.push(
              `Non-repeating schedule ${t[ll].template.name} was due on ${t[ll].next_date_string}, which is in the past.`,
            );
            break;
          }
          if (t[ll].template.full && t[ll].num_months > 0) {
            remainder = 0;
          } else if (ll === 0 && !t[ll].template.full) {
            remainder = t[ll].target - last_month_balance;
          } else {
            remainder = t[ll].target - remainder;
          }
          let tg = 0;
          if (remainder >= 0) {
            tg = remainder;
            remainder = 0;
          } else {
            tg = 0;
            remainder = Math.abs(remainder);
          }
          if (
            t[ll].template.full ||
            t[ll].num_months === 0 ||
            t[ll].target_frequency === 'weekly' ||
            t[ll].target_frequency === 'daily'
          ) {
            increment += tg;
          } else if (t[ll].template.full && t[ll].num_months > 0) {
            increment += 0;
          } else {
            increment += tg / (t[ll].num_months + 1);
          }
        }
      }
    }
    increment = Math.round(increment);
    to_budget += increment;
  }
  return { to_budget, errors, remainder, scheduleFlag };
}

export async function goalsSchedule2(
  scheduleFlag,
  template_lines,
  current_month,
  balance,
  to_budget,
  errors,
) {
  //Alternate approach to schedule calculations based on a shortfall adjustment
  if (!scheduleFlag) {
    scheduleFlag = true;
    let template = template_lines.filter(t => t.type === 'schedule');
    //in the case of multiple templates per category, schedules may have wrong priority level
    let t = [];
    let totalAnnualScheduledGoal = 0;  //annual total

    for (let ll = 0; ll < template.length; ll++) {
      let parseReturn = await parseSchedules(template[ll], current_month, t, errors);
      errors = parseReturn.errors;
      t = parseReturn.t;
    }
    //remove completed schedules
    t = t.filter(t => t.completed === 0);

    //add annualized schedules
    let annualized_t = [];
    for (let ll = 0; ll < t.length; ll++) {
      if (!t[ll].full) {
        //only calculate for templates without full keyword
        if (t[ll].target_frequency === 'yearly') {
          annualized_t.push({
            target: t[ll].target,
            next_date_string: t[ll].next_date_string,
            monthsSince: 0,
            contribution: 0,
            balance: 0,
            shortFall: 0,
          });
          totalAnnualScheduledGoal += t[ll].target;
        } else {
          for (let i = 0; i < 12; i += t[ll].target_interval) {
            annualized_t.push({
              target: t[ll].target,
              next_date_string:
                i === 0
                  ? t[ll].next_date_string
                  : monthUtils.addMonths(t[ll].next_date_string, i),
              monthsSince: 0,
              contribution: 0,
              balance: 0,
              shortFall: 0,
            });
            totalAnnualScheduledGoal += t[ll].target;
          }
        }
      }
    }

    annualized_t = annualized_t.sort((a, b) =>
      monthUtils.differenceInCalendarMonths(
        a.next_date_string,
        b.next_date_string,
      ),
    );

    let basePayment = Math.round(totalAnnualScheduledGoal / 12);

    for (let ll = 0; ll < annualized_t.length; ll++) {
      if (ll === 0) {
        let monthsSince = monthUtils.differenceInCalendarMonths(
          annualized_t[ll].next_date_string,
          current_month,
        );
        let monthsSinceToday = monthUtils.differenceInCalendarMonths(
          annualized_t[ll].next_date_string,
          current_month,
        );
        annualized_t[ll].monthsSince = monthsSince;
        annualized_t[ll].contribution = monthsSince * basePayment;
        annualized_t[ll].balance =
          balance + annualized_t[ll].contribution - annualized_t[ll].target;
        if (monthsSinceToday > 0) {
          annualized_t[ll].shortFall =
            -annualized_t[ll].balance / monthsSinceToday;
        } else {
          annualized_t[ll].shortFall = null;
        }
      } else {
        let monthsSinceLast = monthUtils.differenceInCalendarMonths(
          annualized_t[ll].next_date_string,
          annualized_t[ll - 1].next_date_string,
        );
        let monthsSinceToday = monthUtils.differenceInCalendarMonths(
          annualized_t[ll].next_date_string,
          current_month,
        );
        annualized_t[ll].monthsSince = monthsSinceLast;
        annualized_t[ll].contribution = monthsSinceLast * basePayment;
        annualized_t[ll].balance =
          annualized_t[ll - 1].balance +
          annualized_t[ll].contribution -
          annualized_t[ll].target;
        if (monthsSinceToday > 0) {
          annualized_t[ll].shortFall =
            -annualized_t[ll].balance / monthsSinceToday;
        } else {
          annualized_t[ll].shortFall = null;
        }
      }
    }

    annualized_t = annualized_t.sort((a, b) => b.shortFall - a.shortFall);
    let shortFallAdjustment = Math.round(annualized_t[0].shortFall);

    if (balance < totalAnnualScheduledGoal) {
      to_budget += basePayment + shortFallAdjustment;
    } else {
      to_budget += basePayment;
    }

    for (let ll = 0; ll < t.length; ll++) {
      if (
        balance < totalAnnualScheduledGoal &&
        !isReflectBudget() &&
        t[ll].full &&
        t[ll].num_months === 0
      ) {
        to_budget += t[ll].target;
      }
    }
  }
  return { to_budget, errors, scheduleFlag };
}
