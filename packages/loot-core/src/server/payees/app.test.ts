// @ts-strict-ignore
import { loadMappings } from '#server/db/mappings';
import { app as rulesApp } from '#server/rules/app';
import { createSchedule, updateSchedule } from '#server/schedules/app';
import { loadRules } from '#server/transactions/transaction-rules';

import { app as payeesApp } from './app';

beforeEach(async () => {
  await global.emptyDatabase()();
  await loadMappings();
  await loadRules();
});

describe('payee app', () => {
  it('excludes completed schedule rules from payee rule counts', async () => {
    const payeeId = await payeesApp.handlers['payee-create']({
      name: 'Quarterly taxes',
    });

    await rulesApp.handlers['rule-add']({
      stage: 'pre',
      conditionsOp: 'and',
      conditions: [{ op: 'is', field: 'payee', value: payeeId }],
      actions: [{ op: 'set', field: 'notes', value: 'manual rule' }],
    });

    await createSchedule({
      schedule: {
        name: 'Active estimate',
        completed: false,
      },
      conditions: [
        { op: 'is', field: 'payee', value: payeeId },
        { op: 'is', field: 'date', value: '2026-06-01' },
      ],
    });

    const completedScheduleId = await createSchedule({
      schedule: {
        name: 'Completed estimate',
        completed: false,
      },
      conditions: [
        { op: 'is', field: 'payee', value: payeeId },
        { op: 'is', field: 'date', value: '2026-06-01' },
      ],
    });

    await updateSchedule({
      schedule: {
        id: completedScheduleId,
        completed: true,
      },
    });

    await loadRules();

    expect(await payeesApp.handlers['payees-get-rule-counts']()).toEqual({
      [payeeId]: 2,
    });
  });
});
