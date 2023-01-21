import MockDate from 'mockdate';

import q from '../../shared/query';
import { loadRules, updateRule } from '../accounts/transaction-rules';
import { runQuery as aqlQuery } from '../aql';
import { loadMappings } from '../db/mappings';

import {
  updateConditions,
  getNextDate,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  setNextDate
} from './app';

beforeEach(async () => {
  await global.emptyDatabase()();
  await loadMappings();
  await loadRules();
});

describe('schedule app', () => {
  beforeEach(() => {
    MockDate.set(new Date(2021, 4, 16));
  });

  describe('utility', () => {
    it('conditions are updated when they exist', () => {
      let conds = [
        { op: 'is', field: 'payee', value: 'FOO' },
        { op: 'is', field: 'date', value: '2020-01-01' }
      ];

      let updated = updateConditions(conds, [
        {
          op: 'is',
          field: 'payee',
          value: 'bar'
        }
      ]);

      expect(updated.length).toBe(2);
      expect(updated[0].value).toBe('bar');
    });

    it("conditions are added if they don't exist", () => {
      let conds = [
        { op: 'contains', field: 'payee', value: 'FOO' },
        { op: 'contains', field: 'notes', value: 'dflksjdflskdjf' }
      ];

      let updated = updateConditions(conds, [
        {
          op: 'is',
          field: 'payee',
          value: 'bar'
        }
      ]);

      expect(updated.length).toBe(3);
    });

    it('getNextDate works with date conditions', () => {
      expect(
        getNextDate({ op: 'is', field: 'date', value: '2021-04-30' })
      ).toBe('2021-04-30');

      expect(
        getNextDate({
          op: 'is',
          field: 'date',
          value: {
            start: '2020-12-20',
            frequency: 'monthly',
            patterns: [
              { type: 'day', value: 15 },
              { type: 'day', value: 30 }
            ]
          }
        })
      ).toBe('2021-05-30');
    });
  });

  describe('methods', () => {
    it('createSchedule creates a schedule', async () => {
      let id = await createSchedule({
        conditions: [
          {
            op: 'is',
            field: 'date',
            value: {
              start: '2020-12-20',
              frequency: 'monthly',
              patterns: [
                { type: 'day', value: 15 },
                { type: 'day', value: 30 }
              ]
            }
          }
        ]
      });

      let {
        data: [row]
      } = await aqlQuery(q('schedules').filter({ id }).select('*'));

      expect(row).toBeTruthy();
      expect(row.rule).toBeTruthy();
      expect(row.next_date).toBe('2021-05-30');

      await expect(
        createSchedule({
          conditions: [{ op: 'is', field: 'payee', value: 'p1' }]
        })
      ).rejects.toThrow(/date condition is required/);
    });

    it('updateSchedule updates a schedule', async () => {
      let id = await createSchedule({
        conditions: [
          { op: 'is', field: 'payee', value: 'foo' },
          {
            op: 'is',
            field: 'date',
            value: {
              start: '2020-12-20',
              frequency: 'monthly',
              patterns: [
                { type: 'day', value: 15 },
                { type: 'day', value: 30 }
              ]
            }
          }
        ]
      });

      let res = await aqlQuery(
        q('schedules').filter({ id }).select(['next_date', 'posts_transaction'])
      );
      let row = res.data[0];

      expect(row.next_date).toBe('2021-05-30');
      expect(row.posts_transaction).toBe(false);

      MockDate.set(new Date(2021, 4, 17));

      await updateSchedule({
        schedule: { id, posts_transaction: true },
        conditions: [
          {
            op: 'is',
            field: 'date',
            value: {
              start: '2020-12-20',
              frequency: 'monthly',
              patterns: [
                { type: 'day', value: 18 },
                { type: 'day', value: 29 }
              ]
            }
          }
        ]
      });

      res = await aqlQuery(
        q('schedules').filter({ id }).select(['next_date', 'posts_transaction'])
      );
      row = res.data[0];

      // Updating the date condition updates `next_date`
      expect(row.next_date).toBe('2021-05-18');
      expect(row.posts_transaction).toBe(true);
    });

    it('deleteSchedule deletes a schedule', async () => {
      let id = await createSchedule({
        conditions: [
          {
            op: 'is',
            field: 'date',
            value: {
              start: '2020-12-20',
              frequency: 'monthly',
              patterns: [
                { type: 'day', value: 15 },
                { type: 'day', value: 30 }
              ]
            }
          }
        ]
      });

      let { data: schedules } = await aqlQuery(q('schedules').select('*'));
      expect(schedules.length).toBe(1);

      await deleteSchedule({ id });
      let { data: schedules2 } = await aqlQuery(q('schedules').select('*'));
      expect(schedules2.length).toBe(0);
    });

    it('setNextDate sets `next_date`', async () => {
      let id = await createSchedule({
        conditions: [
          {
            op: 'is',
            field: 'date',
            value: {
              start: '2020-12-20',
              frequency: 'monthly',
              patterns: [
                { type: 'day', value: 15 },
                { type: 'day', value: 30 }
              ]
            }
          }
        ]
      });

      let { data: ruleId } = await aqlQuery(
        q('schedules').filter({ id }).calculate('rule')
      );

      // Manually update the rule
      await updateRule({
        id: ruleId,
        conditions: [
          {
            op: 'is',
            field: 'date',
            value: {
              start: '2020-12-20',
              frequency: 'monthly',
              patterns: [
                { type: 'day', value: 18 },
                { type: 'day', value: 28 }
              ]
            }
          }
        ]
      });

      let res = await aqlQuery(
        q('schedules').filter({ id }).select(['next_date'])
      );
      let row = res.data[0];

      expect(row.next_date).toBe('2021-05-30');

      MockDate.set(new Date(2021, 4, 17));
      await setNextDate({ id });

      res = await aqlQuery(q('schedules').filter({ id }).select(['next_date']));
      row = res.data[0];

      expect(row.next_date).toBe('2021-05-18');
    });
  });
});
