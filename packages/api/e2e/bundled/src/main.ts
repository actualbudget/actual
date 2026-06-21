// A minimal consumer app: imports the package like any downstream project and
// drives the full boot -> import -> read-back path. The bundled-build e2e loads
// the production output of this app to prove a real `vite build` works (Issue 4
// in the browser-build handoff), not just the verbatim `dist` served as-is.
import * as api from '@actual-app/api';

type ScenarioResult = {
  accountNames: string[];
  amounts: number[];
  budgetCount: number;
};

declare global {
  // oxlint-disable-next-line typescript/consistent-type-definitions -- global Window augmentation requires interface
  interface Window {
    runScenario: () => Promise<ScenarioResult>;
  }
}

window.runScenario = async () => {
  await api.init({ dataDir: '/documents' });

  await api.runImport('bundled-e2e', async () => {
    const accountId = await api.createAccount({ name: 'Checking' }, 0);
    await api.addTransactions(accountId, [
      { date: '2024-01-15', amount: -1250, notes: 'coffee' },
      { date: '2024-01-16', amount: 50000, notes: 'paycheck' },
    ]);
  });

  const accounts = await api.getAccounts();
  const transactions = await api.getTransactions(
    accounts[0].id,
    '2024-01-01',
    '2024-01-31',
  );
  const budgets = await api.getBudgets();

  await api.shutdown();

  return {
    accountNames: accounts.map(a => a.name),
    amounts: transactions.map(t => t.amount).sort((a, b) => a - b),
    budgetCount: budgets.length,
  };
};
