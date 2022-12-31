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

function makeNumberSuffix(num) {
  // Slight abuse of date-fns to turn a number like "1" into the full
  // form "1st" but formatting a date with that number
  return monthUtils.format(new Date(2020, 0, num, 12), 'do');
}

function prettyDayName(day) {
  let days = {
    SU: 'Sunday',
    MO: 'Monday',
    TU: 'Tuesday',
    WE: 'Wednesday',
    TH: 'Thursday',
    FR: 'Friday',
    SA: 'Saturday'
  };
  return days[day];
}

export function getRecurringDescription(config) {
  let interval = config.interval || 1;

  switch (config.frequency) {
    case 'weekly': {
      let desc = 'Every ';
      desc += interval !== 1 ? `${interval} weeks` : 'week';
      desc += ' on ' + monthUtils.format(config.start, 'EEEE');
      return desc;
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

        desc += ' on the ';

        let strs = [];

        let uniqueDays = new Set(patterns.map(p => p.type));
        let isSameDay = uniqueDays.length === 1 && !uniqueDays.has('day');

        for (let pattern of patterns) {
          if (pattern.type === 'day') {
            if (pattern.value === -1) {
              strs.push('last day');
            } else {
              // Example: 15th day
              strs.push(makeNumberSuffix(pattern.value));
            }
          } else {
            let dayName = isSameDay ? '' : ' ' + prettyDayName(pattern.type);

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

      return desc;
    }
    case 'yearly': {
      let desc = 'Every ';
      desc += interval !== 1 ? `${interval} years` : 'year';
      desc += ' on ' + monthUtils.format(config.start, 'LLL do');
      return desc;
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
    return Math.round((amount.num1 + amount.num2) / 2);
  }
  return amount;
}
