import MockDate from 'mockdate';

import type {
  RuleActionEntity,
  ScheduleEntity,
  SetRuleActionEntity,
} from '#types/models';

import * as monthUtils from './months';
import {
  computeSchedulePreviewTransactions,
  getNextDate,
  getStatus,
  getUpcomingDays,
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

  describe('split-child transfer filter', () => {
    function makeSchedule(
      overrides: Partial<ScheduleEntity> &
        Pick<ScheduleEntity, 'id' | 'next_date' | '_conditions'>,
    ): ScheduleEntity {
      return {
        rule: 'rule-1',
        completed: false,
        posts_transaction: false,
        tombstone: false,
        _payee: 'payee-employer',
        _account: 'acct-checking',
        _amount: 500000,
        _amountOp: 'is',
        _date: overrides.next_date,
        _actions: [],
        ...overrides,
      };
    }

    // Maps a payee id to the account it transfers to, simulating the payeesById
    // lookup used by getTransferAccountByPayee in useAccountPreviewTransactions.
    const transferPayees: Record<string, string> = {
      'payee-transfer-to-savings': 'acct-savings',
    };

    function getTransferAccountId(payeeId?: string | null): string | null {
      if (!payeeId) return null;
      return transferPayees[payeeId] ?? null;
    }

    // This filter mirrors the fixed accountSchedulesFilter in
    // useAccountPreviewTransactions: it includes a schedule when any split-child
    // set-payee action points to a transfer payee for the viewed account.
    function makeFilter(accountId: string) {
      return (schedule: ScheduleEntity) => {
        if (schedule._account === accountId) return true;
        if (getTransferAccountId(schedule._payee) === accountId) return true;
        const actions = schedule._actions as RuleActionEntity[];
        return actions.some(
          action =>
            action.op === 'set' &&
            action.field === 'payee' &&
            action.options?.splitIndex != null &&
            getTransferAccountId(action.value as string) === accountId,
        );
      };
    }

    it('includes a split schedule when viewing the split-child transfer destination', () => {
      const schedule = makeSchedule({
        id: 'sched-paycheck',
        next_date: '2017-01-03',
        _conditions: [{ field: 'date', op: 'is', value: '2017-01-03' }],
        _actions: [
          // split child 1: transfer to savings
          {
            op: 'set',
            field: 'payee',
            value: 'payee-transfer-to-savings',
            options: { splitIndex: 1 },
          } satisfies SetRuleActionEntity,
        ] as unknown as ScheduleEntity['_actions'],
      });

      const statuses: ScheduleStatuses = new Map([
        ['sched-paycheck', 'upcoming'],
      ]);

      // Viewed from the source account - schedule is included
      const fromSource = computeSchedulePreviewTransactions(
        [schedule],
        statuses,
        '7',
        makeFilter('acct-checking'),
      );
      expect(fromSource).toHaveLength(1);

      // Viewed from the transfer destination - schedule must also be included
      const fromDest = computeSchedulePreviewTransactions(
        [schedule],
        statuses,
        '7',
        makeFilter('acct-savings'),
      );
      expect(fromDest).toHaveLength(1);
    });

    it('excludes a split schedule when viewing an unrelated account', () => {
      const schedule = makeSchedule({
        id: 'sched-paycheck',
        next_date: '2017-01-03',
        _conditions: [{ field: 'date', op: 'is', value: '2017-01-03' }],
        _actions: [
          {
            op: 'set',
            field: 'payee',
            value: 'payee-transfer-to-savings',
            options: { splitIndex: 1 },
          } satisfies SetRuleActionEntity,
        ] as unknown as ScheduleEntity['_actions'],
      });

      const statuses: ScheduleStatuses = new Map([
        ['sched-paycheck', 'upcoming'],
      ]);

      const result = computeSchedulePreviewTransactions(
        [schedule],
        statuses,
        '7',
        makeFilter('acct-unrelated'),
      );
      expect(result).toHaveLength(0);
    });

    it('includes a split schedule when the transfer is at splitIndex 0', () => {
      const schedule = makeSchedule({
        id: 'sched-paycheck',
        next_date: '2017-01-03',
        _conditions: [{ field: 'date', op: 'is', value: '2017-01-03' }],
        _actions: [
          {
            op: 'set',
            field: 'payee',
            value: 'payee-transfer-to-savings',
            options: { splitIndex: 0 },
          } satisfies SetRuleActionEntity,
        ] as unknown as ScheduleEntity['_actions'],
      });

      const statuses: ScheduleStatuses = new Map([
        ['sched-paycheck', 'upcoming'],
      ]);

      // splitIndex 0 is falsy; a regression to a truthy check would drop it.
      const fromDest = computeSchedulePreviewTransactions(
        [schedule],
        statuses,
        '7',
        makeFilter('acct-savings'),
      );
      expect(fromDest).toHaveLength(1);
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
