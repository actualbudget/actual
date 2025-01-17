import MockDate from 'mockdate';

import * as monthUtils from './months';
import { getRecurringDescription, getStatus } from './schedules';

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
      expect(getStatus(todayString, true, false, 7)).toBe('completed');
    });

    it('returns paid if has transactions', () => {
      expect(getStatus(todayString, false, true, 7)).toBe('paid');
    });

    it('returns due if today', () => {
      expect(getStatus(todayString, false, false, 7)).toBe('due');
    });

    it.each([1, 7, 14, 30])(
      'returns upcoming if within upcoming range %n',
      (upcomingLength: number) => {
        const daysOut = upcomingLength;
        const tomorrow = monthUtils.addDays(today, 1);
        const upcomingDate = monthUtils.addDays(today, daysOut);
        const scheduledDate = monthUtils.addDays(today, daysOut + 1);
        expect(getStatus(tomorrow, false, false, upcomingLength)).toBe(
          'upcoming',
        );
        expect(getStatus(upcomingDate, false, false, upcomingLength)).toBe(
          'upcoming',
        );
        expect(getStatus(scheduledDate, false, false, upcomingLength)).toBe(
          'scheduled',
        );
      },
    );

    it('returns missed if past', () => {
      expect(getStatus(monthUtils.addDays(today, -1), false, false, 7)).toBe(
        'missed',
      );
    });

    it('returns scheduled if not due, upcoming, or missed', () => {
      expect(getStatus(monthUtils.addDays(today, 8), false, false, 7)).toBe(
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
        ),
      ).toBe('Every 2 weeks on Monday');
    });

    it('describes monthly interval', () => {
      expect(
        getRecurringDescription(
          { start: '2021-04-25', frequency: 'monthly' },
          'MM/dd/yyyy',
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
        ),
      ).toBe('Every month on the 1st Saturday, 3rd Friday, 2nd, and 10th');
    });

    it('describes yearly interval', () => {
      expect(
        getRecurringDescription(
          { start: '2021-05-17', frequency: 'yearly' },
          'MM/dd/yyyy',
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
        ),
      ).toBe('Every 2 months on the 17th, until 2021-06-01');
    });
  });
});
