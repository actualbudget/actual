import { loadMappings } from '#server/db/mappings';
import {
  createSchedule as createScheduleBase,
  updateSchedule,
} from '#server/schedules/app';
import { insertRule, loadRules } from '#server/transactions/transaction-rules';
import type { RuleConditionEntity } from '#types/models';

import { app } from './app';

const createSchedule = createScheduleBase as (args: {
  conditions: RuleConditionEntity[];
}) => Promise<string>;

beforeEach(async () => {
  await global.emptyDatabase()();
  await loadMappings();
  await loadRules();
});

describe('payee app', () => {
  it('excludes completed schedule rules from payee rule counts', async () => {
    await insertRule({
      stage: 'pre',
      conditionsOp: 'and',
      conditions: [{ op: 'is', field: 'payee', value: 'payee-1' }],
      actions: [],
    });

    await createSchedule({
      conditions: [
        { op: 'is', field: 'payee', value: 'payee-1' },
        { op: 'is', field: 'date', value: '2026-06-01' },
      ],
    });

    const completedScheduleId = await createSchedule({
      conditions: [
        { op: 'is', field: 'payee', value: 'payee-1' },
        { op: 'is', field: 'date', value: '2026-06-02' },
      ],
    });
    await updateSchedule({
      schedule: { id: completedScheduleId, completed: true },
    });

    const counts = await app.handlers['payees-get-rule-counts']();

    expect(counts['payee-1']).toBe(2);
  });
});
