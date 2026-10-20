import { send } from '@actual-app/core/platform/client/connection';
import type {
  RuleActionEntity,
  TransactionEntity,
} from '@actual-app/core/types/models';

import { createSingleTimeScheduleFromTransaction } from './schedule-actions';

vi.mock('@actual-app/core/platform/client/connection', () => ({
  send: vi.fn(),
}));

const LINK_SCHEDULE: RuleActionEntity = {
  op: 'link-schedule',
  value: 'schedule-1',
};

function mockScheduleCreation() {
  vi.mocked(send).mockImplementation((async (name: string) => {
    switch (name) {
      case 'schedule/create':
        return 'schedule-1';
      case 'query':
        return { data: [{ rule: 'rule-1' }] };
      case 'rule-get':
        return { id: 'rule-1', actions: [LINK_SCHEDULE] };
      default:
        return undefined;
    }
  }) as typeof send);
}

function updatedRuleActions(): RuleActionEntity[] {
  const call = vi
    .mocked(send)
    .mock.calls.find(([name]) => name === 'rule-update');
  return (call?.[1] as { actions: RuleActionEntity[] }).actions;
}

function splitTransaction(
  subtransactions: Partial<TransactionEntity>[],
): TransactionEntity {
  return {
    id: 'parent',
    account: 'account-1',
    date: '2099-01-15',
    amount: -3000,
    payee: 'payee-parent',
    is_parent: true,
    subtransactions: subtransactions.map((sub, index) => ({
      id: `child-${index}`,
      account: 'account-1',
      date: '2099-01-15',
      is_child: true,
      parent_id: 'parent',
      ...sub,
    })),
  } as TransactionEntity;
}

describe('createSingleTimeScheduleFromTransaction', () => {
  beforeEach(() => {
    vi.mocked(send).mockReset();
    mockScheduleCreation();
  });

  it('sets the payee of each split that has its own payee', async () => {
    await createSingleTimeScheduleFromTransaction(
      splitTransaction([
        { amount: -1000, payee: 'payee-kroger' },
        { amount: -2000, payee: 'payee-publix' },
      ]),
    );

    const payeeActions = updatedRuleActions().filter(
      action => action.op === 'set' && action.field === 'payee',
    );
    expect(payeeActions).toEqual([
      {
        op: 'set',
        field: 'payee',
        value: 'payee-kroger',
        options: { splitIndex: 1 },
      },
      {
        op: 'set',
        field: 'payee',
        value: 'payee-publix',
        options: { splitIndex: 2 },
      },
    ]);
  });

  it('adds no payee action for a split without a payee', async () => {
    await createSingleTimeScheduleFromTransaction(
      splitTransaction([
        { amount: -1000, payee: 'payee-kroger' },
        { amount: -2000, payee: null },
      ]),
    );

    const payeeActions = updatedRuleActions().filter(
      action => action.op === 'set' && action.field === 'payee',
    );
    expect(payeeActions).toEqual([
      {
        op: 'set',
        field: 'payee',
        value: 'payee-kroger',
        options: { splitIndex: 1 },
      },
    ]);
  });

  it('keeps the link-schedule action and matches the parent payee in the conditions', async () => {
    await createSingleTimeScheduleFromTransaction(
      splitTransaction([{ amount: -3000, payee: 'payee-kroger' }]),
    );

    expect(updatedRuleActions()[0]).toEqual(LINK_SCHEDULE);
    expect(send).toHaveBeenCalledWith(
      'schedule/create',
      expect.objectContaining({
        conditions: expect.arrayContaining([
          { op: 'is', field: 'payee', value: 'payee-parent' },
        ]),
      }),
    );
  });
});
