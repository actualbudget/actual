import * as monthUtils from '../../../shared/months';
import { extractScheduleConds } from '../../../shared/schedules';
import * as db from '../../db';
import { getRuleForSchedule, getNextDate } from '../../schedules/app';
import { isReflectBudget } from '../actions';

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
      let { id: sid, completed: complete } = await db.first(
        'SELECT * FROM schedules WHERE name = ?',
        [template[ll].name],
      );
      console.log(complete);
      let rule = await getRuleForSchedule(sid);
      let conditions = rule.serialize().conditions;
      let { date: dateConditions, amount: amountCondition } =
        extractScheduleConds(conditions);
      let target =
        amountCondition.op === 'isbetween'
          ? -Math.round(
              amountCondition.value.num1 + amountCondition.value.num2,
            ) / 2
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
      t.push({
        template: template[ll],
        target,
        next_date_string,
        target_interval,
        target_frequency,
        num_months,
        completed: complete,
      });
      if (!complete) {
        if (isRepeating) {
          let monthlyTarget = 0;
          let next_month = monthUtils.addMonths(
            current_month,
            t[ll].num_months + 1,
          );
          let next_date = getNextDate(
            dateConditions,
            monthUtils._parse(current_month),
          );
          while (next_date < next_month) {
            monthlyTarget += -target;
            let current_date = next_date;
            next_date = monthUtils.addDays(next_date, 1);
            next_date = getNextDate(
              dateConditions,
              monthUtils._parse(next_date),
            );
            let diffDays = monthUtils.differenceInCalendarDays(
              next_date,
              current_date,
            );
            if (!diffDays) {
              next_date = monthUtils.addDays(next_date, 3);
              next_date = getNextDate(
                dateConditions,
                monthUtils._parse(next_date),
              );
            }
          }
          t[ll].target = -monthlyTarget;
          totalScheduledGoal += target;
        }
      } else {
        errors.push(`Schedule ${t[ll].template.name} is a completed schedule.`);
      }
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
