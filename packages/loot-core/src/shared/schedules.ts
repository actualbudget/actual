// @ts-strict-ignore
import type { IRuleOptions } from '@rschedule/core';

import * as monthUtils from './months';
import { q } from './query';

export function getStatus(
  nextDate: string,
  completed: boolean,
  hasTrans: boolean,
) {
  const today = monthUtils.currentDay();

  if (completed) {
    return 'completed';
  } else if (hasTrans) {
    return 'paid';
  } else if (nextDate === today) {
    return 'due';
  } else if (nextDate > today && nextDate <= monthUtils.addDays(today, 7)) {
    return 'upcoming';
  } else if (nextDate < today) {
    return 'missed';
  } else {
    return 'scheduled';
  }
}

export function getHasTransactionsQuery(schedules) {
  const filters = schedules.map(schedule => {
    const dateCond = schedule._conditions.find(c => c.field === 'date');
    return {
      $and: {
        schedule: schedule.id,
        date: {
          $gte:
            dateCond && dateCond.op === 'is'
              ? schedule.next_date
              : monthUtils.subDays(schedule.next_date, 7),
        },
      },
    };
  });

  return q('transactions')
    .options({ splits: 'all' })
    .filter({ $or: filters })
    .orderBy({ date: 'desc' })
    .select(['schedule', 'date']);
}

function makeNumberSuffix(num: number) {
  // Slight abuse of date-fns to turn a number like "1" into the full
  // form "1st" but formatting a date with that number
  return monthUtils.format(new Date(2020, 0, num, 12), 'do');
}

function prettyDayName(day) {
  const days = {
    SU: 'Sunday',
    MO: 'Monday',
    TU: 'Tuesday',
    WE: 'Wednesday',
    TH: 'Thursday',
    FR: 'Friday',
    SA: 'Saturday',
  };
  return days[day];
}

export function getRecurringDescription(config, dateFormat) {
  const interval = config.interval || 1;

  let endModeSuffix = '';
  switch (config.endMode) {
    case 'after_n_occurrences':
      if (config.endOccurrences === 1) {
        endModeSuffix = `, once`;
      } else {
        endModeSuffix = `, ${config.endOccurrences} times`;
      }
      break;
    case 'on_date':
      endModeSuffix = `, until ${monthUtils.format(
        config.endDate,
        dateFormat,
      )}`;
      break;
    default:
  }

  const weekendSolveSuffix = config.skipWeekend
    ? ` (${config.weekendSolveMode} weekend) `
    : '';
  const suffix = endModeSuffix + weekendSolveSuffix;

  switch (config.frequency) {
    case 'daily': {
      let desc = 'Every ';
      desc += interval !== 1 ? `${interval} days` : 'day';
      return desc + suffix;
    }
    case 'weekly': {
      let desc = 'Every ';
      desc += interval !== 1 ? `${interval} weeks` : 'week';
      desc += ' on ' + monthUtils.format(config.start, 'EEEE');
      return desc + suffix;
    }
    case 'monthly': {
      let desc = 'Every ';
      desc += interval !== 1 ? `${interval} months` : 'month';

      if (config.patterns && config.patterns.length > 0) {
        // Sort the days ascending. We filter out -1 because that
        // represents "last days" and should always be last, but this
        // sort would put them first
        let patterns = [...config.patterns]
          .sort((p1, p2) => {
            const typeOrder =
              (p1.type === 'day' ? 1 : 0) - (p2.type === 'day' ? 1 : 0);
            const valOrder = p1.value - p2.value;

            if (typeOrder === 0) {
              return valOrder;
            }
            return typeOrder;
          })
          .filter(p => p.value !== -1);

        // Add on all -1 values to the end
        patterns = patterns.concat(config.patterns.filter(p => p.value === -1));

        desc += ' on the ';

        const strs: string[] = [];

        const uniqueDays = new Set(patterns.map(p => p.type));
        const isSameDay = uniqueDays.size === 1 && !uniqueDays.has('day');

        for (const pattern of patterns) {
          if (pattern.type === 'day') {
            if (pattern.value === -1) {
              strs.push('last day');
            } else {
              // Example: 15th day
              strs.push(makeNumberSuffix(pattern.value));
            }
          } else {
            const dayName = isSameDay ? '' : ' ' + prettyDayName(pattern.type);

            if (pattern.value === -1) {
              // Example: last Monday
              strs.push('last' + dayName);
            } else {
              // Example: 3rd Monday
              strs.push(makeNumberSuffix(pattern.value) + dayName);
            }
          }
        }

        if (strs.length > 2) {
          desc += strs.slice(0, strs.length - 1).join(', ');
          desc += ', and ';
          desc += strs[strs.length - 1];
        } else {
          desc += strs.join(' and ');
        }

        if (isSameDay) {
          desc += ' ' + prettyDayName(patterns[0].type);
        }
      } else {
        desc += ' on the ' + monthUtils.format(config.start, 'do');
      }

      return desc + suffix;
    }
    case 'yearly': {
      let desc = 'Every ';
      desc += interval !== 1 ? `${interval} years` : 'year';
      desc += ' on ' + monthUtils.format(config.start, 'LLL do');
      return desc + suffix;
    }
    default:
      return 'Recurring error';
  }
}

export function recurConfigToRSchedule(config) {
  const base: IRuleOptions = {
    start: monthUtils.parseDate(config.start),
    // @ts-ignore: issues with https://gitlab.com/john.carroll.p/rschedule/-/issues/86
    frequency: config.frequency.toUpperCase(),
    byHourOfDay: [12],
  };

  if (config.interval) {
    // @ts-ignore: issues with https://gitlab.com/john.carroll.p/rschedule/-/issues/86
    base.interval = config.interval;
  }

  switch (config.endMode) {
    case 'after_n_occurrences':
      base.count = config.endOccurrences;
      break;
    case 'on_date':
      base.end = monthUtils.parseDate(config.endDate);
      break;
    default:
  }

  const abbrevDay = name => name.slice(0, 2).toUpperCase();

  switch (config.frequency) {
    case 'daily':
      // Nothing to do
      return [base];
    case 'weekly':
      // Nothing to do
      return [base];
    case 'monthly':
      if (config.patterns && config.patterns.length > 0) {
        const days = config.patterns.filter(p => p.type === 'day');
        const dayNames = config.patterns.filter(p => p.type !== 'day');

        return [
          days.length > 0 && { ...base, byDayOfMonth: days.map(p => p.value) },
          dayNames.length > 0 && {
            ...base,
            byDayOfWeek: dayNames.map(p => [abbrevDay(p.type), p.value]),
          },
        ].filter(Boolean);
      } else {
        // Nothing to do
        return [base];
      }
    case 'yearly':
      return [base];
    default:
      throw new Error('Invalid recurring date config');
  }
}

export function extractScheduleConds(conditions) {
  return {
    payee:
      conditions.find(cond => cond.op === 'is' && cond.field === 'payee') ||
      conditions.find(
        cond => cond.op === 'is' && cond.field === 'description',
      ) ||
      null,
    account:
      conditions.find(cond => cond.op === 'is' && cond.field === 'account') ||
      conditions.find(cond => cond.op === 'is' && cond.field === 'acct') ||
      null,
    amount:
      conditions.find(
        cond =>
          (cond.op === 'is' ||
            cond.op === 'isapprox' ||
            cond.op === 'isbetween') &&
          cond.field === 'amount',
      ) || null,
    date:
      conditions.find(
        cond =>
          (cond.op === 'is' || cond.op === 'isapprox') && cond.field === 'date',
      ) || null,
  };
}

export function getScheduledAmount(amount) {
  if (amount && typeof amount !== 'number') {
    return Math.round((amount.num1 + amount.num2) / 2);
  }
  return amount;
}

export function describeSchedule(schedule, payee) {
  if (payee) {
    return `${payee.name} (${schedule.next_date})`;
  } else {
    return `Next: ${schedule.next_date}`;
  }
}
