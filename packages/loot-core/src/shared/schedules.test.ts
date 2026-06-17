import MockDate from 'mockdate';

import type { RuleConditionEntity, ScheduleEntity } from '#types/models';

import * as monthUtils from './months';
import {
  computeSchedulePreviewTransactions,
  getNextDate,
  getScheduleOccurrenceMatchStartDate,
  getStatus,
  getUpcomingDays,
  indexPostedScheduleTransactions,
  isScheduleOccurrencePosted,
} from './schedules';
import type { ScheduleStatuses } from './schedules';

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
      ['1-year', 366, '2017-06-15'], // Test year from mid-year (Jun 1, 2017 to Jun 1, 2018 + 1)
      ['1-year', 367, '2019-06-15'], // Test year from mid-year with leap year 2020
      ['2-year', 731, '2017-06-15'], // Test 2 years from mid-year (Jun 1, 2017 to Jun 1, 2019 + 1)
    ])(
      'value of %s on returns %i days on %s',
      (value: string, expected: number, date: string) => {
        expect(getUpcomingDays(value, date)).toEqual(expected);
      },
    );
  });

  describe('computeSchedulePreviewTransactions', () => {
    describe('forceUpcoming flag', () => {
      function makeSchedule(
        overrides: Partial<ScheduleEntity> &
          Pick<ScheduleEntity, 'id' | 'next_date' | '_conditions'>,
      ): ScheduleEntity {
        return {
          rule: 'rule-1',
          completed: false,
          posts_transaction: false,
          tombstone: false,
          _payee: 'payee-1',
          _account: 'acct-1',
          _amount: -10000,
          _amountOp: 'is',
          _date: overrides.next_date,
          _actions: [],
          ...overrides,
        };
      }

      it('sets forceUpcoming=false for past dates of a missed recurring schedule', () => {
        const schedule = makeSchedule({
          id: 'sched-1',
          next_date: '2016-12-19',
          _conditions: [
            {
              field: 'date',
              op: 'isapprox',
              value: { start: '2016-12-01', frequency: 'weekly' },
            },
          ],
        });

        const statuses: ScheduleStatuses = new Map([['sched-1', 'missed']]);
        const result = computeSchedulePreviewTransactions(
          [schedule],
          statuses,
          '7',
        );

        const pastEntries = result.filter(r => r.date < '2017-01-01');
        expect(pastEntries.length).toBeGreaterThan(0);
        expect(pastEntries.every(r => r.forceUpcoming === false)).toBe(true);
      });

      it('sets forceUpcoming=true for future dates that differ from next_date', () => {
        const schedule = makeSchedule({
          id: 'sched-1',
          next_date: '2016-12-19',
          _conditions: [
            {
              field: 'date',
              op: 'isapprox',
              value: { start: '2016-12-01', frequency: 'weekly' },
            },
          ],
        });

        const statuses: ScheduleStatuses = new Map([['sched-1', 'missed']]);
        const result = computeSchedulePreviewTransactions(
          [schedule],
          statuses,
          '7',
        );

        const futureEntries = result.filter(r => r.date > '2017-01-01');
        expect(futureEntries.length).toBeGreaterThan(0);
        expect(futureEntries.every(r => r.forceUpcoming === true)).toBe(true);
      });

      it('sets forceUpcoming=false for next_date when not paid', () => {
        const schedule = makeSchedule({
          id: 'sched-1',
          next_date: '2017-01-03',
          _conditions: [{ field: 'date', op: 'is', value: '2017-01-03' }],
        });

        const statuses: ScheduleStatuses = new Map([['sched-1', 'upcoming']]);
        const result = computeSchedulePreviewTransactions(
          [schedule],
          statuses,
          '7',
        );

        expect(result).toHaveLength(1);
        expect(result[0].forceUpcoming).toBe(false);
      });

      it('shifts next_date and forces upcoming for paid schedules', () => {
        const schedule = makeSchedule({
          id: 'sched-1',
          next_date: '2017-01-02',
          _conditions: [
            {
              field: 'date',
              op: 'isapprox',
              value: { start: '2016-12-01', frequency: 'weekly' },
            },
          ],
        });

        const statuses: ScheduleStatuses = new Map([['sched-1', 'paid']]);
        const result = computeSchedulePreviewTransactions(
          [schedule],
          statuses,
          '7',
        );

        expect(result.find(r => r.date === '2017-01-02')).toBeUndefined();
        expect(
          result
            .filter(r => r.date >= '2017-01-01')
            .every(r => r.forceUpcoming === true),
        ).toBe(true);
      });
    });

    it('does not crash when a recurring schedule has an end date in the past', () => {
      function makeSchedule(
        overrides: Partial<ScheduleEntity> &
          Pick<ScheduleEntity, 'id' | 'next_date' | '_conditions'>,
      ): ScheduleEntity {
        return {
          rule: 'rule-1',
          completed: false,
          posts_transaction: false,
          tombstone: false,
          _payee: 'payee-1',
          _account: 'acct-1',
          _amount: -10000,
          _amountOp: 'is',
          _date: overrides.next_date,
          _actions: [],
          ...overrides,
        };
      }

      // Schedule that recurs monthly but ended in the past (2016-08-25)
      // while current date is 2017-01-01
      const schedule = makeSchedule({
        id: 'sched-expired',
        next_date: '2016-08-25',
        _conditions: [
          {
            field: 'date',
            op: 'isapprox',
            value: {
              start: '2016-01-25',
              frequency: 'monthly',
              endMode: 'on_date',
              endDate: '2016-08-25',
            },
          },
        ],
      });

      const statuses: ScheduleStatuses = new Map([['sched-expired', 'missed']]);
      const result = computeSchedulePreviewTransactions(
        [schedule],
        statuses,
        '7',
      );

      // Should not crash; schedule with past end date produces its next_date entry only
      expect(result).toBeDefined();
    });
  });

  describe('getScheduleOccurrenceMatchStartDate', () => {
    const occurrenceDate = '2024-03-10';

    it('uses exact date for one-time schedules', () => {
      expect(
        getScheduleOccurrenceMatchStartDate(
          {
            _conditions: [{ op: 'is', field: 'date', value: occurrenceDate }],
          },
          occurrenceDate,
        ),
      ).toBe(occurrenceDate);
    });

    it('uses exact date for auto-posted recurring schedules', () => {
      expect(
        getScheduleOccurrenceMatchStartDate(
          { posts_transaction: true },
          occurrenceDate,
        ),
      ).toBe(occurrenceDate);
    });

    it('uses a 2-day lookback for manual recurring schedules', () => {
      expect(
        getScheduleOccurrenceMatchStartDate(
          { posts_transaction: false },
          occurrenceDate,
        ),
      ).toBe('2024-03-08');
    });

    it('uses exact date for recurring schedules with op is', () => {
      expect(
        getScheduleOccurrenceMatchStartDate(
          {
            posts_transaction: false,
            _conditions: [
              {
                op: 'is',
                field: 'date',
                value: { start: occurrenceDate, frequency: 'monthly' },
              },
            ],
          },
          occurrenceDate,
        ),
      ).toBe(occurrenceDate);
    });

    it('uses exact date for daily recurring schedules with op is', () => {
      expect(
        getScheduleOccurrenceMatchStartDate(
          {
            posts_transaction: false,
            _conditions: [
              {
                op: 'is',
                field: 'date',
                value: { start: occurrenceDate, frequency: 'daily' },
              },
            ],
          },
          occurrenceDate,
        ),
      ).toBe(occurrenceDate);
    });
  });

  describe('indexPostedScheduleTransactions', () => {
    it('groups schedule-linked transactions by schedule id', () => {
      const indexed = indexPostedScheduleTransactions([
        { schedule: 'sched-1', date: '2024-03-09' },
        { schedule: 'sched-2', date: '2024-03-10' },
        { schedule: 'sched-1', date: '2024-04-10' },
        { date: '2024-03-11' },
      ]);

      expect(indexed.get('sched-1')).toEqual([
        { schedule: 'sched-1', date: '2024-03-09' },
        { schedule: 'sched-1', date: '2024-04-10' },
      ]);
      expect(indexed.get('sched-2')).toEqual([
        { schedule: 'sched-2', date: '2024-03-10' },
      ]);
      expect(indexed.has('missing')).toBe(false);
    });
  });

  describe('isScheduleOccurrencePosted', () => {
    const scheduleId = 'sched-1';
    const occurrenceDate = '2024-03-10';
    const manualRecurringSchedule = { posts_transaction: false };
    const autoPostSchedule = { posts_transaction: true };
    const oneTimeSchedule = {
      _conditions: [
        { op: 'is', field: 'date', value: occurrenceDate } as const,
      ],
    };
    const manualRecurringWithIsOp = {
      posts_transaction: false,
      _conditions: [
        {
          op: 'is',
          field: 'date',
          value: { start: occurrenceDate, frequency: 'monthly' },
        },
      ] satisfies RuleConditionEntity[],
    };

    function expectPosted(
      schedule: Parameters<typeof getScheduleOccurrenceMatchStartDate>[0],
      txDate: string,
      expected: boolean,
    ) {
      expect(
        isScheduleOccurrencePosted({
          schedule,
          scheduleId,
          occurrenceDate,
          postedTransactions: [{ schedule: scheduleId, date: txDate }],
        }),
      ).toBe(expected);
    }

    it.each([
      [
        'same-day manual recurring',
        manualRecurringSchedule,
        occurrenceDate,
        true,
      ],
      [
        'early pay day before due for recurring date cond',
        manualRecurringWithIsOp,
        '2024-03-09',
        false,
      ],
      ['early pay within 2 days', manualRecurringSchedule, '2024-03-09', true],
      [
        'early pay outside window',
        manualRecurringSchedule,
        '2024-03-07',
        false,
      ],
      ['auto-post day before due', autoPostSchedule, '2024-03-09', false],
      ['auto-post on due date', autoPostSchedule, occurrenceDate, true],
      ['one-time on due date', oneTimeSchedule, occurrenceDate, true],
      ['one-time day before due', oneTimeSchedule, '2024-03-09', false],
      [
        'later month tx does not satisfy earlier occurrence',
        manualRecurringSchedule,
        '2024-04-10',
        false,
      ],
    ] as const)('%s', (_label, schedule, txDate, expected) => {
      expectPosted(schedule, txDate, expected);
    });
  });

  describe('getNextDate', () => {
    it('returns last occurrence for a recurring schedule with an end date in the past', () => {
      const dateCond = {
        op: 'isapprox',
        value: {
          start: '2016-01-25',
          frequency: 'monthly',
          endMode: 'on_date',
          endDate: '2016-08-25',
        },
      };

      // Current date is 2017-01-01 via MockDate
      const result = getNextDate(dateCond);
      expect(result).not.toBeNull();
      // The last occurrence should be returned (reverse lookup)
      expect(result).toBe('2016-08-25');
    });

    it('returns null when the end date is before the start date', () => {
      const dateCond = {
        op: 'isapprox',
        value: {
          start: '2016-03-25',
          frequency: 'monthly',
          endMode: 'on_date',
          endDate: '2016-01-25',
        },
      };

      const result = getNextDate(dateCond, new Date(2017, 0, 1));
      expect(result).toBeNull();
    });
  });
});
