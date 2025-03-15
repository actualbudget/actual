import { enUS } from 'date-fns/locale';
import i18next from 'i18next';
import MockDate from 'mockdate';

import * as monthUtils from './months';
import {
  getRecurringDescription,
  getStatus,
  getUpcomingDays,
} from './schedules';

i18next.init({
  lng: 'en',
  fallbackLng: 'en',
  resources: {
    en: {
      translation: {
        Every: 'Every',
        day: 'day',
        week: 'week',
        month: 'month',
        year: 'year',
        on: 'on',
        'on the': 'on the',
        and: 'and',
        'until {{date}}': 'until {{date}}',
        once: 'once',
        times: '{{endOccurrences}} times',
        weekend: 'weekend',
        last: 'last',
        'Next:': 'Next:',
        'last day': 'last day',
        '{{interval}} days': '{{interval}} days',
        '{{interval}} weeks': '{{interval}} weeks',
        '{{interval}} months': '{{interval}} months',
        '{{interval}} years': '{{interval}} years',

        Sunday: 'Sunday',
        Monday: 'Monday',
        Tuesday: 'Tuesday',
        Wednesday: 'Wednesday',
        Thursday: 'Thursday',
        Friday: 'Friday',
        Saturday: 'Saturday',

        '{{value}}th day': '{{value}}th day',
        '{{value}}th': '{{value}}th',
        '{{value}}th {{dayName}}': '{{value}}th {{dayName}}',
        'last {{dayName}}': 'last {{dayName}}',

        '({{weekendSolveMode}} weekend)': '({{weekendSolveMode}} weekend)',
      },
    },
  },
  interpolation: {
    escapeValue: false,
  },
});

describe('schedules', () => {
  const today = new Date(2017, 0, 1); // Global date when testing is set to 2017-01-01 per monthUtils.currentDay()
  const dateFormat = 'yyyy-MM-dd';
  const todayString = monthUtils.format(today, dateFormat);

  beforeEach(() => {
    MockDate.set(new Date(2021, 4, 14));
  });
  afterEach(() => {
    MockDate.reset();
  });

  describe('getStatus', () => {
    it('returns completed if completed', () => {
      expect(getStatus(todayString, true, false, '7')).toBe('completed');
    });

    it('returns paid if has transactions', () => {
      expect(getStatus(todayString, false, true, '7')).toBe('paid');
    });

    it('returns due if today', () => {
      expect(getStatus(todayString, false, false, '7')).toBe('due');
    });

    it.each([1, 7, 14, 30])(
      'returns upcoming if within upcoming range %n',
      (upcomingLength: number) => {
        const daysOut = upcomingLength;
        const tomorrow = monthUtils.addDays(today, 1);
        const upcomingDate = monthUtils.addDays(today, daysOut);
        const scheduledDate = monthUtils.addDays(today, daysOut + 1);
        expect(
          getStatus(tomorrow, false, false, upcomingLength.toString()),
        ).toBe('upcoming');
        expect(
          getStatus(upcomingDate, false, false, upcomingLength.toString()),
        ).toBe('upcoming');
        expect(
          getStatus(scheduledDate, false, false, upcomingLength.toString()),
        ).toBe('scheduled');
      },
    );

    it('returns missed if past', () => {
      expect(getStatus(monthUtils.addDays(today, -1), false, false, '7')).toBe(
        'missed',
      );
    });

    it('returns scheduled if not due, upcoming, or missed', () => {
      expect(getStatus(monthUtils.addDays(today, 8), false, false, '7')).toBe(
        'scheduled',
      );
    });
  });

  describe('getRecurringDescription', () => {
    it('describes weekly interval', () => {
      expect(
        getRecurringDescription(
          { start: '2021-05-17', frequency: 'weekly' },
          'MM/dd/yyyy',
          enUS,
        ),
      ).toBe('Every week on Monday');

      expect(
        getRecurringDescription(
          {
            start: '2021-05-17',
            frequency: 'weekly',
            interval: 2,
          },
          'MM/dd/yyyy',
          enUS,
        ),
      ).toBe('Every 2 weeks on Monday');
    });

    it('describes monthly interval', () => {
      expect(
        getRecurringDescription(
          { start: '2021-04-25', frequency: 'monthly' },
          'MM/dd/yyyy',
          enUS,
        ),
      ).toBe('Every month on the 25th');

      expect(
        getRecurringDescription(
          {
            start: '2021-04-25',
            frequency: 'monthly',
            interval: 2,
          },
          'MM/dd/yyyy',
          enUS,
        ),
      ).toBe('Every 2 months on the 25th');

      expect(
        getRecurringDescription(
          {
            start: '2021-04-25',
            frequency: 'monthly',
            patterns: [{ type: 'day', value: 25 }],
          },
          'MM/dd/yyyy',
          enUS,
        ),
      ).toBe('Every month on the 25th');

      expect(
        getRecurringDescription(
          {
            start: '2021-04-25',
            frequency: 'monthly',
            interval: 2,
            patterns: [{ type: 'day', value: 25 }],
          },
          'MM/dd/yyyy',
          enUS,
        ),
      ).toBe('Every 2 months on the 25th');

      // Last day should work
      expect(
        getRecurringDescription(
          {
            start: '2021-04-25',
            frequency: 'monthly',
            patterns: [{ type: 'day', value: 31 }],
          },
          'MM/dd/yyyy',
          enUS,
        ),
      ).toBe('Every month on the 31st');

      // -1 should work, representing the last day
      expect(
        getRecurringDescription(
          {
            start: '2021-04-25',
            frequency: 'monthly',
            patterns: [{ type: 'day', value: -1 }],
          },
          'MM/dd/yyyy',
          enUS,
        ),
      ).toBe('Every month on the last day');

      // Day names should work
      expect(
        getRecurringDescription(
          {
            start: '2021-04-25',
            frequency: 'monthly',
            patterns: [{ type: 'FR', value: 2 }],
          },
          'MM/dd/yyyy',
          enUS,
        ),
      ).toBe('Every month on the 2nd Friday');

      expect(
        getRecurringDescription(
          {
            start: '2021-04-25',
            frequency: 'monthly',
            patterns: [{ type: 'FR', value: -1 }],
          },
          'MM/dd/yyyy',
          enUS,
        ),
      ).toBe('Every month on the last Friday');
    });

    it('describes monthly interval with multiple days', () => {
      // Note how order doesn't matter - the day should be sorted
      expect(
        getRecurringDescription(
          {
            start: '2021-04-25',
            frequency: 'monthly',
            patterns: [
              { type: 'day', value: 15 },
              { type: 'day', value: 3 },
              { type: 'day', value: 20 },
            ],
          },
          'MM/dd/yyyy',
          enUS,
        ),
      ).toBe('Every month on the 3rd, 15th, and 20th');

      expect(
        getRecurringDescription(
          {
            start: '2021-04-25',
            frequency: 'monthly',
            patterns: [
              { type: 'day', value: 3 },
              { type: 'day', value: -1 },
              { type: 'day', value: 20 },
            ],
          },
          'MM/dd/yyyy',
          enUS,
        ),
      ).toBe('Every month on the 3rd, 20th, and last day');

      // Mix days and day names
      expect(
        getRecurringDescription(
          {
            start: '2021-04-25',
            frequency: 'monthly',
            patterns: [
              { type: 'day', value: 3 },
              { type: 'day', value: -1 },
              { type: 'FR', value: 2 },
            ],
          },
          'MM/dd/yyyy',
          enUS,
        ),
      ).toBe('Every month on the 2nd Friday, 3rd, and last day');

      // When there is a mixture of types, day names should always come first
      expect(
        getRecurringDescription(
          {
            start: '2021-04-25',
            frequency: 'monthly',
            patterns: [
              { type: 'SA', value: 1 },
              { type: 'day', value: 2 },
              { type: 'FR', value: 3 },
              { type: 'day', value: 10 },
            ],
          },
          'MM/dd/yyyy',
          enUS,
        ),
      ).toBe('Every month on the 1st Saturday, 3rd Friday, 2nd, and 10th');
    });

    it('describes yearly interval', () => {
      expect(
        getRecurringDescription(
          { start: '2021-05-17', frequency: 'yearly' },
          'MM/dd/yyyy',
          enUS,
        ),
      ).toBe('Every year on May 17th');

      expect(
        getRecurringDescription(
          {
            start: '2021-05-17',
            frequency: 'yearly',
            interval: 2,
          },
          'MM/dd/yyyy',
          enUS,
        ),
      ).toBe('Every 2 years on May 17th');
    });

    it('describes intervals with limited occurrences', () => {
      expect(
        getRecurringDescription(
          {
            start: '2021-05-17',
            frequency: 'weekly',
            interval: 2,
            endMode: 'after_n_occurrences',
            endOccurrences: 2,
          },
          'MM/dd/yyyy',
          enUS,
        ),
      ).toBe('Every 2 weeks on Monday, 2 times');

      expect(
        getRecurringDescription(
          {
            start: '2021-05-17',
            frequency: 'weekly',
            interval: 2,
            endMode: 'after_n_occurrences',
            endOccurrences: 1,
          },
          'MM/dd/yyyy',
          enUS,
        ),
      ).toBe('Every 2 weeks on Monday, once');

      expect(
        getRecurringDescription(
          {
            start: '2021-05-17',
            frequency: 'monthly',
            interval: 2,
            endMode: 'after_n_occurrences',
            endOccurrences: 2,
          },
          'MM/dd/yyyy',
          enUS,
        ),
      ).toBe('Every 2 months on the 17th, 2 times');

      expect(
        getRecurringDescription(
          {
            start: '2021-05-17',
            frequency: 'yearly',
            interval: 2,
            endMode: 'after_n_occurrences',
            endOccurrences: 2,
          },
          'MM/dd/yyyy',
          enUS,
        ),
      ).toBe('Every 2 years on May 17th, 2 times');
    });

    it('describes intervals with an end date', () => {
      expect(
        getRecurringDescription(
          {
            start: '2021-05-17',
            frequency: 'weekly',
            interval: 2,
            endMode: 'on_date',
            endDate: '2021-06-01',
          },
          'MM/dd/yyyy',
          enUS,
        ),
      ).toBe('Every 2 weeks on Monday, until 06/01/2021');

      expect(
        getRecurringDescription(
          {
            start: '2021-05-17',
            frequency: 'monthly',
            interval: 2,
            endMode: 'on_date',
            endDate: '2021-06-01',
          },
          'yyyy-MM-dd',
          enUS,
        ),
      ).toBe('Every 2 months on the 17th, until 2021-06-01');
    });
  });

  describe('getUpcomingDays', () => {
    it.each([
      ['1', 1, '2017-01-01'],
      ['7', 7, '2017-01-01'],
      ['14', 14, '2017-01-01'],
      ['oneMonth', 31, '2017-01-01'],
      ['oneMonth', 30, '2017-04-01'],
      ['oneMonth', 30, '2017-04-15'],
      ['oneMonth', 28, '2017-02-01'],
      ['oneMonth', 29, '2020-02-01'], // leap-year
      ['currentMonth', 30, '2017-01-01'],
      ['currentMonth', 27, '2017-02-01'],
      ['currentMonth', 20, '2017-02-08'],
      ['currentMonth', 28, '2020-02-01'], // leap-year
      ['2-day', 2, '2017-01-01'],
      ['5-week', 35, '2017-01-01'],
      ['3-month', 91, '2017-01-01'],
      ['4-year', 1462, '2017-01-01'],
    ])(
      'value of %s on returns %i days on %s',
      (value: string, expected: number, date: string) => {
        expect(getUpcomingDays(value, date)).toEqual(expected);
      },
    );
  });
});
