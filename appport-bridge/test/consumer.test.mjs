// Independent AppPort consumer test for the Actual Budget bridge.
// Real Actual sync server + the repository's own @actual-app/api build + real bridge process; the consumer uses only the
// published @appport/sdk. Every success is checked against the budget file the sync server stores, downloaded and read
// directly; nothing is accepted on the bridge's word.

import assert from 'node:assert/strict';
import { existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
// oxlint-disable-next-line actual/no-extraneous-dependencies -- node:test is a Node.js built-in module, not a package
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  connect,
  discover,
  invoke,
  isCallTo,
  losingFetch,
  verdict,
} from '#lib/consumer.mjs';
import { freePort, removeDir, startProcess } from '#lib/harness.mjs';

import { API_PATH, startActual } from './support/actual-app.mjs';

const BRIDGE = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'bridge.mjs',
);
let app, bridge, origin;
const startBridge = async publish =>
  startProcess(process.execPath, [BRIDGE], {
    env: {
      APPPORT_BRIDGE_UPSTREAM: app.base,
      APPPORT_BRIDGE_PORT: String(await freePort()),
      APPPORT_BRIDGE_PUBLIC: publish ? '1' : '',
      ACTUAL_API_PATH: API_PATH,
    },
    readyLine: true,
    name: 'bridge',
  });

before(async () => {
  app = await startActual();
  bridge = await startBridge(true);
  origin = bridge.ready.url;
});
after(async () => {
  await bridge?.stop();
  await app?.stop();
  if (app) removeDir(app.work);
});

const as = async (user, fn) => {
  const c = await connect(
    origin,
    user ? app.users[user].credential : undefined,
  );
  try {
    return await fn(c);
  } finally {
    await c.close();
  }
};

void test('the bridge refuses to start unless explicitly configured', async () => {
  await assert.rejects(
    startProcess(process.execPath, [BRIDGE], {
      env: { APPPORT_BRIDGE_UPSTREAM: '' },
      readyLine: true,
      timeoutMs: 5000,
      name: 'unconfigured',
    }),
    /APPPORT_BRIDGE_UPSTREAM is not set/,
  );
});

void test('discovery is opt-in: without APPPORT_BRIDGE_PUBLIC nothing is published', async () => {
  const quiet = await startBridge(false);
  try {
    assert.equal((await discover(quiet.ready.url)).state, 'not-published');
  } finally {
    await quiet.stop();
  }
});

void test('discovery: reference-verified, four read-only capabilities, nothing established', async () => {
  const found = await discover(origin);
  assert.equal(found.state, 'reference-verified', found.reasons.join());
  assert.deepEqual(
    found.capabilities
      .map(c => `${c.name}:${c.status}:${c.declared.effect}`)
      .sort(),
    [
      'actual.accounts.list:verified:observation',
      'actual.budget.month:verified:observation',
      'actual.budgets.list:verified:observation',
      'actual.transactions.list:verified:observation',
    ],
  );
  assert.deepEqual(found.established, {
    publisherTrust: false,
    authorization: false,
    approval: false,
    invoked: false,
  });
});

void test('budgets.list: each user sees only the budget the sync server says they own', async () => {
  for (const user of ['bob', 'carol']) {
    const out = await as(user, c => invoke(c, 'actual.budgets.list', {}));
    const owner = app.fileOwner(user);
    const agrees =
      out.output.budgets.length === 1 &&
      out.output.budgets[0].syncId === app.budgets[user].syncId &&
      owner.owner === app.users[user].userId;
    assert.equal(verdict(out, agrees), 'confirmed', JSON.stringify(out.output));
  }
});

void test('accounts.list: accounts confirmed against the stored budget file', async () => {
  const out = await as('bob', c =>
    invoke(c, 'actual.accounts.list', { budgetSyncId: app.budgets.bob.syncId }),
  );
  const stored = await app.storedBudget('bob');
  const got = out.output.accounts
    .map(a => `${a.id}|${a.name}|${a.offBudget}|${a.closed}`)
    .sort();
  const expected = stored.accounts
    .map(a => `${a.id}|${a.name}|${Boolean(a.offbudget)}|${Boolean(a.closed)}`)
    .sort();
  const checking = out.output.accounts.find(
    a => a.id === app.budgets.bob.checking,
  );
  // The balance is Actual's own figure: the sum of the stored transactions on that account.
  const ledger = stored
    .transactions(app.budgets.bob.checking)
    .reduce((n, t) => n + t.amount, 0);
  assert.equal(
    verdict(
      out,
      JSON.stringify(got) === JSON.stringify(expected) &&
        checking.balance === ledger,
    ),
    'confirmed',
    `${got} vs ${expected}; ${checking?.balance} vs ${ledger}`,
  );
});

void test('transactions.list: transactions confirmed against the stored budget file', async () => {
  const input = {
    budgetSyncId: app.budgets.bob.syncId,
    accountId: app.budgets.bob.checking,
    startDate: '2026-09-01',
    endDate: '2026-09-30',
  };
  const out = await as('bob', c =>
    invoke(c, 'actual.transactions.list', input),
  );
  const stored = (await app.storedBudget('bob'))
    .transactions(app.budgets.bob.checking)
    .filter(t => t.date >= 20260901 && t.date <= 20260930);
  const got = out.output.transactions
    .map(t => `${t.id}|${t.date.replaceAll('-', '')}|${t.amount}|${t.notes}`)
    .sort();
  const expected = stored
    .map(t => `${t.id}|${t.date}|${t.amount}|${t.notes}`)
    .sort();
  assert.equal(got.length, 2);
  assert.equal(
    verdict(out, JSON.stringify(got) === JSON.stringify(expected)),
    'confirmed',
    `${got} vs ${expected}`,
  );
});

void test('budget.month: budgeted and spent confirmed against the stored budget file', async () => {
  const out = await as('bob', c =>
    invoke(c, 'actual.budget.month', {
      budgetSyncId: app.budgets.bob.syncId,
      month: '2026-09',
    }),
  );
  const stored = await app.storedBudget('bob');
  const food = out.output.categoryGroups
    .flatMap(g => g.categories)
    .find(c => c.id === app.budgets.bob.food);
  const spentStored = stored
    .transactions(app.budgets.bob.checking)
    .filter(t => t.date >= 20260901 && t.date <= 20260930)
    .reduce((n, t) => n + t.amount, 0);
  const agrees =
    food.name === stored.categoryName(app.budgets.bob.food) &&
    food.budgeted === stored.budgeted('2026-09', app.budgets.bob.food) &&
    food.spent === spentStored;
  assert.equal(verdict(out, agrees), 'confirmed', JSON.stringify(food));
  assert.equal(food.budgeted, 20000);
  assert.equal(food.spent, -5550);
});

void test('reads change nothing on the server: no new sync messages, stored budget file unchanged', async () => {
  const before = app.serverState('bob');
  await as('bob', async c => {
    await invoke(c, 'actual.accounts.list', {
      budgetSyncId: app.budgets.bob.syncId,
    });
    await invoke(c, 'actual.budget.month', {
      budgetSyncId: app.budgets.bob.syncId,
      month: '2026-09',
    });
  });
  assert.deepEqual(app.serverState('bob'), before);
});

void test("authorization is Actual's: carol cannot open bob's budget (Actual reports it as not found), although it exists", async () => {
  const out = await as('carol', c =>
    invoke(c, 'actual.accounts.list', { budgetSyncId: app.budgets.bob.syncId }),
  );
  assert.notEqual(out.kind, 'response');
  assert.equal(
    out.code,
    'NOT_FOUND',
    "the sync server hides other users' budgets (403 on download; filtered from the list)",
  );
  assert.equal(
    app.fileOwner('bob').owner,
    app.users.bob.userId,
    "bob's budget exists: this is a real refusal",
  );
  const direct = await fetch(`${app.base}/sync/download-user-file`, {
    headers: {
      'x-actual-token': app.users.carol.token,
      'x-actual-file-id': app.budgets.bob.fileId,
    },
  });
  assert.equal(direct.status, 403, "Actual's own server refuses carol");
});

void test('no credential: refused by AppPort (UNAUTHORIZED); an invalid session token is rejected by Actual', async () => {
  assert.equal(
    (await as(undefined, c => invoke(c, 'actual.budgets.list', {}))).code,
    'UNAUTHORIZED',
  );
  const c = await connect(origin, 'Bearer not-a-real-actual-token');
  try {
    const out = await invoke(c, 'actual.budgets.list', {});
    assert.equal(out.kind, 'denied');
    assert.equal(out.code, 'UNAUTHORIZED');
  } finally {
    await c.close();
  }
});

void test('application-level failures: unknown budget / account are NOT_FOUND; malformed input is INVALID_INPUT', async () => {
  const unknownBudget = await as('bob', c =>
    invoke(c, 'actual.accounts.list', {
      budgetSyncId: '00000000-0000-4000-8000-000000000000',
    }),
  );
  assert.equal(verdict(unknownBudget), 'failed');
  assert.equal(unknownBudget.code, 'NOT_FOUND');
  const unknownAccount = await as('bob', c =>
    invoke(c, 'actual.transactions.list', {
      budgetSyncId: app.budgets.bob.syncId,
      accountId: 'no-such-account',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
    }),
  );
  assert.equal(unknownAccount.code, 'NOT_FOUND');
  assert.equal(
    (
      await as('bob', c =>
        invoke(c, 'actual.budget.month', {
          budgetSyncId: app.budgets.bob.syncId,
          month: '2026-13',
        }),
      )
    ).code,
    'INVALID_INPUT',
  );
  assert.equal(
    (
      await as('bob', c =>
        invoke(c, 'actual.transactions.list', {
          budgetSyncId: app.budgets.bob.syncId,
          accountId: app.budgets.bob.checking,
          startDate: '2026-12-31',
          endDate: '2026-01-01',
        }),
      )
    ).code,
    'INVALID_INPUT',
  );
});

void test('a lost response is indeterminate, never confirmed, and is not retried', async () => {
  let sends = 0;
  const lose = losingFetch(isCallTo('actual.accounts.list'));
  const c = await connect(origin, app.users.bob.credential, {
    fetch: async (u, i) => {
      if (isCallTo('actual.accounts.list')(String(u), i)) sends++;
      return lose(u, i);
    },
  });
  try {
    const out = await invoke(c, 'actual.accounts.list', {
      budgetSyncId: app.budgets.bob.syncId,
    });
    assert.equal(out.kind, 'no-response');
    assert.equal(verdict(out, true), 'indeterminate');
    assert.equal(sends, 1);
  } finally {
    await c.close();
  }
});

void test('cleanup: stopping removes the disposable server data and every per-request API directory', async () => {
  const work = app.work;
  await bridge.stop();
  await app.stop();
  removeDir(work);
  assert.equal(existsSync(work), false);
  assert.deepEqual(
    readdirSync(tmpdir()).filter(d => d.startsWith('actual-appport-session-')),
    [],
    'every per-request API session directory was deleted',
  );
  bridge = null;
  app = null;
});
