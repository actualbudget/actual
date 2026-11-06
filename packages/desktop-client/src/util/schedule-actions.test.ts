import type { TransactionEntity } from '@actual-app/core/types/models';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { initServer } from '#mocks/connection';
import { createSingleTimeScheduleFromTransaction } from '#util/schedule-actions';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

const createSchedule = vi.fn();
const updateRule = vi.fn();

function makeTransaction(
  payees: TransactionEntity['payee'][],
): TransactionEntity {
  return {
    id: 'parent',
    account: 'account',
    date: '2026-10-25',
    amount: -1000 * payees.length,
    payee: 'parent-payee',
    is_parent: true,
    subtransactions: payees.map((payee, index) => ({
      id: `split-${index}`,
      parent_id: 'parent',
      is_child: true,
      account: 'account',
      date: '2026-10-25',
      amount: -1000,
      payee,
      category: 'category',
    })),
  };
}

describe('createSingleTimeScheduleFromTransaction', () => {
  beforeEach(() => {
    createSchedule.mockReset();
    createSchedule.mockResolvedValue('schedule');
    updateRule.mockReset();

    initServer({
      'schedule/create': createSchedule,
      query: () => ({ data: [{ rule: 'rule' }] }),
      'rule-get': () => ({
        id: 'rule',
        conditions: [],
        actions: [{ op: 'link-schedule', value: 'schedule' }],
      }),
      'rule-update': updateRule,
    });
  });

  it.each([
    ['different payees', ['payee-a', 'payee-b'], ['payee-a', 'payee-b']],
    ['a blank payee', ['payee-a', null], ['payee-a', null]],
  ])('preserves %s when creating a schedule', async (_, payees, expected) => {
    await createSingleTimeScheduleFromTransaction(makeTransaction(payees));

    expect(updateRule).toHaveBeenCalledOnce();
    expect(updateRule).toHaveBeenCalledWith(
      expect.objectContaining({
        actions: expect.arrayContaining(
          expected.map((payee, index) => ({
            op: 'set',
            field: 'payee',
            value: payee,
            options: { splitIndex: index + 1 },
          })),
        ),
      }),
    );
  });
});
