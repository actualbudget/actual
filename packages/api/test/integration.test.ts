import { afterEach, describe, expect, test } from 'vitest';

import * as api from '../index';

declare const __API_DATA_DIR__: string;

afterEach(async () => {
  await api.shutdown();
});

describe('api CRUD roundtrip (Node)', () => {
  test('creates a budget, writes, reads it back', async () => {
    const internal = await api.init({ dataDir: __API_DATA_DIR__ });

    await internal.send('create-budget', {
      budgetName: 'Integration Test',
      testMode: true,
      testBudgetId: 'integration-test',
    });
    await api.loadBudget('integration-test');

    const accountId = await api.createAccount(
      { name: 'Checking', offbudget: false },
      0,
    );

    await api.addTransactions(accountId, [
      { date: '2026-04-01', amount: 1000, payee_name: 'Coffee' },
      { date: '2026-04-02', amount: -500, payee_name: 'Book' },
    ]);

    const accounts = await api.getAccounts();
    expect(accounts.map(a => a.name)).toContain('Checking');

    const txns = await api.getTransactions(
      accountId,
      '2026-04-01',
      '2026-04-30',
    );
    expect(txns).toHaveLength(2);
    expect(txns.map(t => t.amount).sort((a, b) => a - b)).toEqual([-500, 1000]);
  });
});
