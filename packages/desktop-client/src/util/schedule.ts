// @ts-strict-ignore
import * as monthUtils from '@actual-app/core/shared/months';
import type {
  PayeeEntity,
  RecurConfig,
  ScheduleEntity,
} from '@actual-app/core/types/models';
import type { Locale } from 'date-fns';
import { t } from 'i18next';

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
    default:
      return t('unknown');
  }
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
      break;
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
