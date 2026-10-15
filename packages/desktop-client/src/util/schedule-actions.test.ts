import { initServer } from '@actual-app/core/platform/client/connection';
import type {
  RuleEntity,
  TransactionEntity,
} from '@actual-app/core/types/models';

import { createSingleTimeScheduleFromTransaction } from './schedule-actions';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

const updateRule = vi.fn();
const createSchedule = vi.fn(async () => 'schedule-id');

const transaction: TransactionEntity = {
  id: 'transaction-id',
  account: 'account-id',
  payee: 'parent-payee',
  date: '2026-01-20',
  amount: -3000,
};

beforeEach(() => {
  vi.clearAllMocks();
  initServer({
    'schedule/create': createSchedule,
    query: async () => ({ data: [{ rule: 'rule-id' }], dependencies: [] }),
    'rule-get': async () =>
      ({
        id: 'rule-id',
        stage: null,
        conditionsOp: 'and',
        conditions: [],
        actions: [{ op: 'link-schedule', value: 'schedule-id' }],
      }) satisfies RuleEntity,
    'rule-update': updateRule,
  });
});

describe('createSingleTimeScheduleFromTransaction', () => {
  it('preserves each split payee in the generated schedule rule', async () => {
    const id = await createSingleTimeScheduleFromTransaction({
      ...transaction,
      is_parent: true,
      subtransactions: [
        { ...transaction, id: 'split-1', amount: -1000, payee: 'payee-1' },
        { ...transaction, id: 'split-2', amount: -2000, payee: 'payee-2' },
      ],
    });

    expect(id).toBe('schedule-id');
    expect(updateRule).toHaveBeenCalledWith(
      expect.objectContaining({
        actions: expect.arrayContaining([
          { op: 'link-schedule', value: 'schedule-id' },
          {
            op: 'set',
            field: 'payee',
            value: 'payee-1',
            options: { splitIndex: 1 },
          },
          {
            op: 'set',
            field: 'payee',
            value: 'payee-2',
            options: { splitIndex: 2 },
          },
        ]),
      }),
    );
  });

  it.each([null, undefined, ''])(
    'keeps an empty split payee (%s) from inheriting another split payee',
    async payee => {
      await createSingleTimeScheduleFromTransaction({
        ...transaction,
        is_parent: true,
        subtransactions: [
          { ...transaction, id: 'split-1', amount: -1000, payee: 'payee-1' },
          { ...transaction, id: 'split-2', amount: -2000, payee },
        ],
      });

      expect(updateRule).toHaveBeenCalledWith(
        expect.objectContaining({
          actions: expect.arrayContaining([
            {
              op: 'set',
              field: 'payee',
              value: null,
              options: { splitIndex: 2 },
            },
          ]),
        }),
      );
    },
  );

  it('keeps the payee condition for a transaction without splits', async () => {
    await createSingleTimeScheduleFromTransaction(transaction);

    expect(createSchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        conditions: expect.arrayContaining([
          { op: 'is', field: 'payee', value: 'parent-payee' },
        ]),
      }),
    );
    expect(updateRule).not.toHaveBeenCalled();
  });
});
