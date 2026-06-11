import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import {
  insertRule,
  loadRules,
  resetState,
} from '#server/transactions/transaction-rules';

import { getPayeeRuleCounts, getPayeeRules } from './app';

beforeEach(async () => {
  await global.emptyDatabase()();
  resetState();
  await loadMappings();
});

function makePayeeRule(payeeId: string) {
  return {
    stage: 'pre',
    conditionsOp: 'and',
    conditions: [{ op: 'is', field: 'payee', value: payeeId }],
    actions: [],
  } as const;
}

describe('payee rule counts', () => {
  test('ignores rules that are only linked to completed schedules', async () => {
    const payeeId = await db.insertPayee({ name: 'Estimated tax' });

    const directRuleId = await insertRule(makePayeeRule(payeeId));
    const completedScheduleRuleId = await insertRule(makePayeeRule(payeeId));
    const activeScheduleRuleId = await insertRule(makePayeeRule(payeeId));

    await db.insertWithUUID('schedules', {
      name: 'Completed tax payment',
      rule: completedScheduleRuleId,
      active: 0,
      completed: 1,
      posts_transaction: 1,
      custom_upcoming_length: null,
      tombstone: 0,
    });

    await db.insertWithUUID('schedules', {
      name: 'Active tax payment',
      rule: activeScheduleRuleId,
      active: 1,
      completed: 0,
      posts_transaction: 1,
      custom_upcoming_length: null,
      tombstone: 0,
    });

    await loadRules();

    const counts = await getPayeeRuleCounts();
    expect(counts[payeeId]).toBe(2);

    const associatedRules = await getPayeeRules({ id: payeeId });
    expect(associatedRules.map(rule => rule.id)).toEqual(
      expect.arrayContaining([directRuleId, activeScheduleRuleId]),
    );
    expect(associatedRules.map(rule => rule.id)).not.toContain(
      completedScheduleRuleId,
    );
  });
});
