// Creates one synthetic budget through Actual's own API (no bank connections, no real data) and uploads it to the sync
// server as the given user. Test-only. Prints one JSON line with ids; no tokens are printed.
// usage: node seed-budget.cjs <apiPath> <dataDir> <serverURL> <sessionToken> <budgetName> <prefix>
const [apiPath, dataDir, serverURL, sessionToken, budgetName, prefix] =
  process.argv.slice(2);
const api = require(apiPath);

(async () => {
  await api.init({ dataDir, serverURL, sessionToken, verbose: false });
  let checking;
  let food;
  await api.runImport(budgetName, async () => {
    const group = await api.createCategoryGroup({ name: `${prefix} Group` });
    food = await api.createCategory({
      name: `${prefix} Food`,
      group_id: group,
    });
    checking = await api.createAccount(
      { name: `${prefix} Checking`, offbudget: false },
      100000,
    );
    await api.createAccount({ name: `${prefix} Savings`, offbudget: true }, 0);
    await api.addTransactions(checking, [
      {
        date: '2026-09-03',
        amount: -1250,
        payee_name: `${prefix} Grocer`,
        category: food,
        notes: 'synthetic 1',
        imported_id: `${prefix}-t1`,
      },
      {
        date: '2026-09-10',
        amount: -4300,
        payee_name: `${prefix} Grocer`,
        category: food,
        notes: 'synthetic 2',
        imported_id: `${prefix}-t2`,
      },
      {
        date: '2026-10-01',
        amount: -999,
        payee_name: `${prefix} Cafe`,
        category: food,
        notes: 'synthetic 3',
        imported_id: `${prefix}-t3`,
      },
    ]);
    await api.setBudgetAmount('2026-09', food, 20000);
  });
  const budget = (await api.getBudgets()).find(
    b => b.name === budgetName && b.groupId,
  );
  process.stdout.write(
    `${JSON.stringify({ syncId: budget.groupId, fileId: budget.cloudFileId, checking, food })}\n`,
  );
  await api.shutdown();
})().catch(e => {
  process.stderr.write(`seed failed: ${e?.code ?? ''} ${e?.message ?? e}\n`);
  process.exit(1);
});
