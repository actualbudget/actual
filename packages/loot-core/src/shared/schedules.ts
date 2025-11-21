// @ts-strict-ignore
import type { IRuleOptions } from '@rschedule/core';
import * as d from 'date-fns';
import { Locale } from 'date-fns';
import { t } from 'i18next';

import {
  type PayeeEntity,
  type RecurConfig,
  type ScheduleEntity,
} from 'loot-core/types/models';

import { Condition } from '../server/rules';

import * as monthUtils from './months';
import { q } from './query';

export function getStatus(
  nextDate: string,
  completed: boolean,
  hasTrans: boolean,
  upcomingLength: string = '7',
) {
  const upcomingDays = getUpcomingDays(upcomingLength);
  const today = monthUtils.currentDay();
  if (completed) {
    return 'completed';
  } else if (hasTrans) {
    return 'paid';
  } else if (nextDate === today) {
    return 'due';
  } else if (
    nextDate > today &&
    nextDate <= monthUtils.addDays(today, upcomingDays)
  ) {
    return 'upcoming';
  } else if (nextDate < today) {
    return 'missed';
  } else {
    return 'scheduled';
  }
}

export function getStatusLabel(status: string) {
  switch (status) {
    case 'completed':
      return t('completed');
    case 'paid':
      return t('paid');
    case 'due':
      return t('due');
    case 'upcoming':
      return t('upcoming');
    case 'missed':
      return t('missed');
    case 'scheduled':
      return t('scheduled');
  }
}

export function getHasTransactionsQuery(schedules) {
  const filters = schedules.map(schedule => {
    const dateCond = schedule._conditions?.find(c => c.field === 'date');
    return {
      $and: {
        schedule: schedule.id,
        date: {
          $gte:
            dateCond && dateCond.op === 'is'
              ? schedule.next_date
              : monthUtils.subDays(schedule.next_date, 2),
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

function makeNumberSuffix(num: number, locale: Locale) {
  // Slight abuse of date-fns to turn a number like "1" into the full
  // form "1st" but formatting a date with that number
  return monthUtils.format(new Date(2020, 0, num, 12), 'do', locale);
}

function prettyDayName(day) {
  const days = {
    SU: t('Sunday'),
    MO: t('Monday'),
    TU: t('Tuesday'),
    WE: t('Wednesday'),
    TH: t('Thursday'),
    FR: t('Friday'),
    SA: t('Saturday'),
  };
  return days[day];
}

export function getRecurringDescription(
  config: RecurConfig,
  dateFormat: string,
  locale: Locale,
) {
  const interval = config.interval || 1;

  let endModeSuffix = '';
  switch (config.endMode) {
    case 'after_n_occurrences':
      if (config.endOccurrences === 1) {
        endModeSuffix = t('once');
      } else {
        endModeSuffix = t('{{endOccurrences}} times', {
          endOccurrences: config.endOccurrences,
        });
      }
      break;
    case 'on_date':
      endModeSuffix = t('until {{dateFormatted}}', {
        dateFormatted: monthUtils.format(config.endDate, dateFormat),
      });
      break;
    default:
  }

  const weekendSolveModeString = config.weekendSolveMode
    ? config.weekendSolveMode === 'after'
      ? t('(after weekend)')
      : t('(before weekend)')
    : '';

  const weekendSolveSuffix = config.skipWeekend ? weekendSolveModeString : '';
  const suffix = endModeSuffix
    ? `, ${endModeSuffix} ${weekendSolveSuffix}`
    : `${weekendSolveSuffix}`;

  let desc = null;

  switch (config.frequency) {
    case 'daily':
      desc =
        interval !== 1
          ? t(`Every {{interval}} days`, { interval })
          : t('Every day');
      break;
    case 'weekly':
      desc =
        interval !== 1
          ? t(`Every {{interval}} weeks on {{dateFormatted}}`, {
              interval,
              dateFormatted: monthUtils.format(config.start, 'EEEE', locale),
            })
          : t('Every week on {{dateFormatted}}', {
              dateFormatted: monthUtils.format(config.start, 'EEEE', locale),
            });
      break;
    case 'monthly':
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

        const strs: string[] = [];

        const uniqueDays = new Set(patterns.map(p => p.type));
        const isSameDay = uniqueDays.size === 1 && !uniqueDays.has('day');
        for (const pattern of patterns) {
          if (pattern.type === 'day') {
            if (pattern.value === -1) {
              strs.push(t('last day'));
            } else {
              // Example: 15th day
              strs.push(makeNumberSuffix(pattern.value, locale));
            }
          } else {
            const dayName = isSameDay ? '' : ' ' + prettyDayName(pattern.type);

            if (pattern.value === -1) {
              // Example: last Monday
              strs.push(t('last') + dayName);
            } else {
              // Example: 3rd Monday
              strs.push(makeNumberSuffix(pattern.value, locale) + dayName);
            }
          }
        }

        let range = '';
        if (strs.length > 2) {
          range += strs.slice(0, strs.length - 1).join(', ');
          range += `, ${t('and')} `;
          range += strs[strs.length - 1];
        } else {
          range += strs.join(` ${t('and')} `);
        }

        if (isSameDay) {
          range += ' ' + prettyDayName(patterns[0].type);
        }

        desc =
          interval !== 1
            ? t(`Every {{interval}} months on the {{range}}`, {
                interval,
                range,
              })
            : t('Every month on the {{range}}', { range });
      } else {
        desc =
          interval !== 1
            ? t(`Every {{interval}} months on the {{dateFormatted}}`, {
                interval,
                dateFormatted: monthUtils.format(config.start, 'do', locale),
              })
            : t('Every month on the {{dateFormatted}}', {
                dateFormatted: monthUtils.format(config.start, 'do', locale),
              });
      }
      break;

    case 'yearly':
      desc =
        interval !== 1
          ? t(`Every {{interval}} years on {{dateFormatted}}`, {
              interval,
              dateFormatted: monthUtils.format(config.start, 'LLL do', locale),
            })
          : t('Every year on {{dateFormatted}}', {
              dateFormatted: monthUtils.format(config.start, 'LLL do', locale),
            });
      break;

    default:
      return t('Recurring error');
  }

  return `${desc}${suffix}`.trim();
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

export function getNextDate(
  dateCond,
  start = new Date(monthUtils.currentDay()),
  noSkipWeekend = false,
) {
  start = d.startOfDay(start);

  const cond = new Condition(dateCond.op, 'date', dateCond.value, null);
  const value = cond.getValue();

  if (value.type === 'date') {
    return value.date;
  } else if (value.type === 'recur') {
    let dates = value.schedule.occurrences({ start, take: 1 }).toArray();

    if (dates.length === 0) {
      // Could be a schedule with limited occurrences, so we try to
      // find the last occurrence
      dates = value.schedule.occurrences({ reverse: true, take: 1 }).toArray();
    }

    if (dates.length > 0) {
      let date = dates[0].date;
      if (value.schedule.data.skipWeekend && !noSkipWeekend) {
        date = getDateWithSkippedWeekend(
          date,
          value.schedule.data.weekendSolve,
        );
      }
      return monthUtils.dayFromDate(date);
    }
  }
  return null;
}

export function getDateWithSkippedWeekend(
  date: Date,
  solveMode: 'after' | 'before',
) {
  if (d.isWeekend(date)) {
    if (solveMode === 'after') {
      return d.nextMonday(date);
    } else if (solveMode === 'before') {
      return d.previousFriday(date);
    } else {
      throw new Error('Unknown weekend solve mode, this should not happen!');
    }
  }
  return date;
}

export function getScheduledAmount(
  amount: number | { num1: number; num2: number },
  inverse: boolean = false,
): number {
  // this check is temporary, and required at the moment as a schedule rule
  // allows the amount condition to be deleted which causes a crash
  if (amount == null) return 0;

  if (typeof amount === 'number') {
    return inverse ? -amount : amount;
  }
  const avg = (amount.num1 + amount.num2) / 2;
  return inverse ? -Math.round(avg) : Math.round(avg);
}

export function describeSchedule(
  schedule: ScheduleEntity,
  payee?: PayeeEntity,
) {
  if (payee) {
    return `${payee.name} (${schedule.next_date})`;
  } else {
    return `${t('Next:')} ${schedule.next_date}`;
  }
}

export function getUpcomingDays(
  upcomingLength = '7',
  today = monthUtils.currentDay(), // for testability
): number {
  const month = monthUtils.getMonth(today);

  switch (upcomingLength) {
    case 'currentMonth': {
      const day = monthUtils.getDay(today);
      const end = monthUtils.getDay(monthUtils.getMonthEnd(today));
      return end - day;
    }
    case 'oneMonth': {
      return monthUtils.differenceInCalendarDays(
        monthUtils.nextMonth(month),
        month,
      );
    }
    default:
      if (upcomingLength.includes('-')) {
        const [num, unit] = upcomingLength.split('-');
        const value = Math.max(1, parseInt(num, 10));
        switch (unit) {
          case 'day':
            return value;
          case 'week':
            return value * 7;
          case 'month':
            const future = monthUtils.addMonths(today, value);
            return monthUtils.differenceInCalendarDays(future, month) + 1;
          case 'year':
            const futureYear = monthUtils.addYears(today, value);
            return monthUtils.differenceInCalendarDays(futureYear, month) + 1;
          default:
            return 7;
        }
      }
      return parseInt(upcomingLength, 10);
  }
}

export function scheduleIsRecurring(dateCond: Condition | null) {
  if (!dateCond) {
    return false;
  }
  const cond = new Condition(dateCond.op, 'date', dateCond.value, null);
  const value = cond.getValue();

  return value.type === 'recur';
}
