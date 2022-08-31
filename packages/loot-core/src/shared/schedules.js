import * as monthUtils from './months';
import q from './query';

export function getStatus(nextDate, completed, hasTrans) {
  let today = monthUtils.currentDay();

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
  let filters = schedules.map(schedule => {
    let dateCond = schedule._conditions.find(c => c.field === 'date');
    return {
      $and: {
        schedule: schedule.id,
        date: {
          $gte:
            dateCond && dateCond.op === 'is'
              ? schedule.next_date
              : monthUtils.subDays(schedule.next_date, 2)
        }
      }
    };
  });

  return q('transactions')
    .filter({ $or: filters })
    .orderBy({ date: 'desc' })
    .groupBy('schedule')
    .select(['schedule', 'date']);
}

function prettyDayName(day, locale) {
  let days = {
    SU: new Date('2020-01-06'),
    MO: new Date('2020-01-07'),
    TU: new Date('2020-01-08'),
    WE: new Date('2020-01-09'),
    TH: new Date('2020-01-10'),
    FR: new Date('2020-01-11'),
    SA: new Date('2020-01-12')
  };
  return Intl.DateTimeFormat(locale, { weekday: 'long' }).format(days[day]);
}

function formatMonthAndDay(month, i18n) {
  let parts = Intl.DateTimeFormat(i18n.resolvedLanguage, {
    month: 'short',
    day: 'numeric'
  }).formatToParts(monthUtils.parseDate(month));
  let dayPart = parts.find(p => p.type === 'day');
  dayPart.value = i18n.t('general.ordinal', {
    count: monthUtils.parseDate(month).getDate(),
    ordinal: true
  });
  return parts.map(part => part.value).join('');
}

export function getRecurringDescription(config, i18n) {
  let interval = config.interval || 1;

  switch (config.frequency) {
    case 'weekly': {
      return i18n.t('schedules.recurring.weekly', {
        count: interval,
        day: monthUtils.format(
          config.start,
          { weekday: 'long' },
          i18n.resolvedLanguage
        )
      });
    }
    case 'monthly': {
      if (config.patterns && config.patterns.length > 0) {
        // Sort the days ascending. We filter out -1 because that
        // represents "last days" and should always be last, but this
        // sort would put them first
        let patterns = [...config.patterns]
          .sort((p1, p2) => {
            let typeOrder =
              (p1.type === 'day' ? 1 : 0) - (p2.type === 'day' ? 1 : 0);
            let valOrder = p1.value - p2.value;

            if (typeOrder === 0) {
              return valOrder;
            }
            return typeOrder;
          })
          .filter(p => p.value !== -1);

        // Add on all -1 values to the end
        patterns = patterns.concat(config.patterns.filter(p => p.value === -1));

        let strs = [];

        let uniqueDays = new Set(patterns.map(p => p.type));
        let context =
          uniqueDays.length === 1 && !uniqueDays.has('day')
            ? 'sameDay'
            : undefined;

        for (let pattern of patterns) {
          if (pattern.type === 'day') {
            if (pattern.value === -1) {
              strs.push(i18n.t('schedules.recurring.pattern.lastDay'));
            } else {
              strs.push(
                i18n.t('general.ordinal', {
                  count: pattern.value,
                  ordinal: true
                })
              );
            }
          } else {
            let dayName = prettyDayName(
              pattern.type,
              i18n.resolvedLanguage,
              i18n.resolvedLanguage
            );

            if (pattern.value === -1) {
              // Example: last Monday
              strs.push(
                i18n.t('schedules.recurring.pattern.lastWeekday', {
                  context,
                  dayName
                })
              );
            } else {
              // Example: 3rd Monday
              strs.push(
                i18n.t('schedules.recurring.pattern.weekAndDay', {
                  context,
                  week: i18n.t('general.ordinal', {
                    count: pattern.value,
                    ordinal: true
                  }),
                  dayName
                })
              );
            }
          }
        }

        return i18n.t('schedules.recurring.monthlyPattern', {
          context,
          count: interval,
          day: prettyDayName(patterns[0].type, i18n.resolvedLanguage),
          pattern: new Intl.ListFormat(i18n.resolvedLanguage, {
            style: 'long',
            type: 'conjunction'
          }).format(strs)
        });
      } else {
        return i18n.t('schedules.recurring.monthly', {
          count: interval,
          day: i18n.t('general.ordinal', {
            count: monthUtils.parseDate(config.start).getDate(),
            ordinal: true
          })
        });
      }
    }
    case 'yearly': {
      return i18n.t(
        'schedules.recurring.yearly',
        { count: interval, day: formatMonthAndDay(config.start, i18n) },
        i18n.resolvedLanguage
      );
    }
    default:
      return 'Recurring error';
  }
}

export function recurConfigToRSchedule(config) {
  let base = {
    start: monthUtils.parseDate(config.start),
    frequency: config.frequency.toUpperCase(),
    byHourOfDay: [12]
  };

  if (config.interval) {
    base.interval = config.interval;
  }

  let abbrevDay = name => name.slice(0, 2).toUpperCase();

  switch (config.frequency) {
    case 'weekly':
      // Nothing to do
      return [base];
    case 'monthly':
      if (config.patterns && config.patterns.length > 0) {
        let days = config.patterns.filter(p => p.type === 'day');
        let dayNames = config.patterns.filter(p => p.type !== 'day');

        return [
          days.length > 0 && { ...base, byDayOfMonth: days.map(p => p.value) },
          dayNames.length > 0 && {
            ...base,
            byDayOfWeek: dayNames.map(p => [abbrevDay(p.type), p.value])
          }
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
        cond => cond.op === 'is' && cond.field === 'description'
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
          cond.field === 'amount'
      ) || null,
    date:
      conditions.find(
        cond =>
          (cond.op === 'is' || cond.op === 'isapprox') && cond.field === 'date'
      ) || null
  };
}

export function getScheduledAmount(amount) {
  if (amount && typeof amount !== 'number') {
    return ((amount.num1 + amount.num2) / 2) | 0;
  }
  return amount;
}
