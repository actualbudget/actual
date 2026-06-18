// @ts-strict-ignore
import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import {
  insertRule,
  loadRules,
  resetState,
} from '#server/transactions/transaction-rules';

import { getPayeeRuleCountsForTest } from './app';

beforeEach(async () => {
  await global.emptyDatabase()();
  resetState();
  await loadMappings();
  await loadRules();
});

describe('getPayeeRuleCounts', () => {
  test('counts only standalone rules, not schedule-owned rules', async () => {
    const payeeId = 'payee-1';

    // Insert a standalone rule for the payee
    await insertRule({
      stage: null,
      conditionsOp: 'and',
      conditions: [{ op: 'is', field: 'payee', value: payeeId }],
      actions: [{ op: 'set', field: 'notes', value: 'test' }],
    });

    // Insert a schedule-owned rule for the same payee
    const scheduleRuleId = await insertRule({
      stage: null,
      conditionsOp: 'and',
      conditions: [{ op: 'is', field: 'payee', value: payeeId }],
      actions: [{ op: 'set', field: 'notes', value: 'schedule rule' }],
    });

    // Link that rule to a completed schedule
    await db.insertWithUUID('schedules', {
      rule: scheduleRuleId,
      active: 0,
      completed: 1,
      posts_transaction: 0,
      tombstone: 0,
    });

    const counts = await getPayeeRuleCountsForTest();

    // Should be 1 (standalone only), not 2
    expect(counts[payeeId]).toBe(1);
  });

  test('counts standalone rules correctly when no schedules exist', async () => {
    const payeeId = 'payee-2';

    await insertRule({
      stage: null,
      conditionsOp: 'and',
      conditions: [{ op: 'is', field: 'payee', value: payeeId }],
      actions: [{ op: 'set', field: 'notes', value: 'rule 1' }],
    });

    await insertRule({
      stage: null,
      conditionsOp: 'and',
      conditions: [{ op: 'is', field: 'payee', value: payeeId }],
      actions: [{ op: 'set', field: 'notes', value: 'rule 2' }],
    });

    const counts = await getPayeeRuleCountsForTest();

    expect(counts[payeeId]).toBe(2);
  });

  test('excludes active schedule rules too, not just completed', async () => {
    const payeeId = 'payee-3';

    const scheduleRuleId = await insertRule({
      stage: null,
      conditionsOp: 'and',
      conditions: [{ op: 'is', field: 'payee', value: payeeId }],
      actions: [{ op: 'set', field: 'notes', value: 'active schedule rule' }],
    });

    // Active (not completed) schedule
    await db.insertWithUUID('schedules', {
      rule: scheduleRuleId,
      active: 1,
      completed: 0,
      posts_transaction: 0,
      tombstone: 0,
    });

    const counts = await getPayeeRuleCountsForTest();

    expect(counts[payeeId]).toBeUndefined();
  });
});
