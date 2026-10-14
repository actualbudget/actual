// Actual Budget AppPort bridge: read-only capabilities through Actual's own supported Node API (@actual-app/api, built
// from this repository at packages/api/dist), authorised by Actual's own sync server with the CALLER's session token.
//
// Actual has no HTTP API for budget contents: the API package downloads a budget the caller may access and answers from
// Actual's own engine (loot-core). For every request this bridge:
//   1. starts the API in a fresh temporary data directory with the caller's sync-server session token,
//   2. downloads the requested budget (the sync server enforces file ownership / user_access),
//   3. runs only the API's own read methods (getAccounts, getAccountBalance, getTransactions, getBudgetMonth, getBudgets),
//   4. shuts the API down and deletes the directory.
// It performs no financial calculations, keeps no copy of any budget, and never logs tokens or budget data. Requests are
// serialised because the API holds one budget and one user per process.
//
//   APPPORT_BRIDGE_UPSTREAM=http://127.0.0.1:5006 [APPPORT_BRIDGE_PORT=4440] [APPPORT_BRIDGE_PUBLIC=1] node bridge.mjs
//   (ACTUAL_API_PATH overrides the API build location; default ../packages/api/dist/index.js — run `yarn build:api` first)
//
// Consumers send their Actual sync-server session token as `authorization: Bearer <token>`.

import { mkdtempSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { AppPortError, defineCapability, errors, s } from '@appport/sdk';

import { credentialOf, runBridgeMain, startBridge } from '#lib/bridge-kit.mjs';

const SCOPE = 'actual.budget.read';
const HERE = dirname(fileURLToPath(import.meta.url));
const loadApi = () =>
  createRequire(import.meta.url)(
    process.env.ACTUAL_API_PATH ??
      join(HERE, '..', 'packages', 'api', 'dist', 'index.js'),
  );

/** Maps @actual-app/api failure codes (err.code, see loot-core/src/server/errors.ts) to AppPort errors. */
function mapApiError(e) {
  if (e instanceof AppPortError) return e;
  const code = e?.code ?? e?.reason;
  if (
    code === 'token-expired' ||
    code === 'unauthorized' ||
    /Authentication failed/i.test(String(e?.message))
  ) {
    return errors.unauthorized('Actual rejected the session token');
  }
  if (code === 'file-access-not-allowed') {
    return errors.forbidden('Actual denied access to this budget');
  }
  if (
    code === 'budget-not-found' ||
    code === 'file-not-found' ||
    code === 'group-not-found'
  ) {
    return errors.notFound('budget not found, or not accessible to this user');
  }
  if (code === 'network-failure') {
    return new AppPortError(
      'INTERNAL_ERROR',
      'the Actual server could not be reached',
      { retryable: true },
    );
  }
  if (code === 'decrypt-failure' || code === 'missing-key') {
    return errors.forbidden(
      'this budget is end-to-end encrypted; the bridge does not handle encryption keys',
    );
  }
  return new AppPortError(
    'INTERNAL_ERROR',
    'Actual could not complete the request',
  );
}

let queue = Promise.resolve();
/** Runs `fn(api)` in an isolated, disposable API session as the caller. One session at a time. */
function withSession(ctx, upstream, budgetSyncId, fn) {
  const run = async () => {
    const credential = credentialOf(ctx);
    const token = /^Bearer\s+(\S+)$/i.exec(credential ?? '')?.[1];
    if (!token) {
      throw errors.unauthorized(
        'send the Actual session token as `Bearer <token>`',
      );
    }
    const api = loadApi();
    const dataDir = mkdtempSync(join(tmpdir(), 'actual-appport-session-'));
    let started = false;
    try {
      await api.init({
        dataDir,
        serverURL: upstream,
        sessionToken: token,
        verbose: false,
      });
      started = true;
      if (budgetSyncId) await api.downloadBudget(budgetSyncId);
      return await fn(api);
    } catch (e) {
      throw mapApiError(e);
    } finally {
      if (started) {
        try {
          await api.shutdown();
        } catch {
          // shutting down a failed session is best effort; the directory is removed below either way
        }
      }
      rmSync(dataDir, { recursive: true, force: true });
    }
  };
  const result = queue.then(run, run);
  queue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

const SyncId = s.string({
  pattern: '^[0-9a-fA-F-]{8,64}$',
  description:
    "The budget's sync id (groupId), as listed by actual.budgets.list",
});
const Month = s.string({ pattern: '^\\d{4}-(0[1-9]|1[0-2])$' });
const Day = s.string({ pattern: '^\\d{4}-\\d{2}-\\d{2}$' });
const Amount = s.integer({
  description: "Actual's integer amount (1/100 of the currency unit)",
});

export function capabilities(upstream) {
  const authority = 'urn:appport:actual';
  const read = (purpose, resource) => ({
    purpose,
    authority,
    approval: { required: false },
    access: [{ resource, mode: 'reads' }],
  });
  const cap = o =>
    defineCapability({
      effect: 'observation',
      authorization: [SCOPE],
      authorizationContract: { required: true, scopes: [SCOPE] },
      timeoutMs: 60_000,
      ...o,
    });

  return [
    cap({
      name: 'actual.budgets.list',
      version: 1,
      description:
        'List the budgets the caller may open on this Actual server.',
      input: s.object({}),
      output: s.object({
        budgets: s.array(s.object({ syncId: s.string(), name: s.string() })),
      }),
      integration: read(
        'List budgets accessible to the caller.',
        'urn:appport:actual:budgets',
      ),
      handler: async (_input, ctx) =>
        withSession(ctx, upstream, null, async api => ({
          budgets: (await api.getBudgets())
            .filter(b => b.groupId)
            .map(b => ({ syncId: b.groupId, name: b.name ?? '' })),
        })),
    }),
    cap({
      name: 'actual.accounts.list',
      version: 1,
      description:
        'Accounts in a budget, with the balance Actual computes for each.',
      input: s.object({
        budgetSyncId: SyncId,
        includeClosed: s.optional(s.boolean()),
      }),
      output: s.object({
        accounts: s.array(
          s.object({
            id: s.string(),
            name: s.string(),
            offBudget: s.boolean(),
            closed: s.boolean(),
            balance: Amount,
          }),
        ),
      }),
      integration: read(
        'Read account metadata and balances.',
        'urn:appport:actual:budgets',
      ),
      handler: async ({ budgetSyncId, includeClosed }, ctx) =>
        withSession(ctx, upstream, budgetSyncId, async api => {
          const accounts = (await api.getAccounts()).filter(
            a => includeClosed || !a.closed,
          );
          const out = [];
          for (const a of accounts) {
            out.push({
              id: a.id,
              name: a.name,
              offBudget: Boolean(a.offbudget),
              closed: Boolean(a.closed),
              balance: await api.getAccountBalance(a.id),
            });
          }
          return { accounts: out };
        }),
    }),
    cap({
      name: 'actual.transactions.list',
      version: 1,
      description:
        'Transactions of one account between two dates, as Actual stores them.',
      input: s.object({
        budgetSyncId: SyncId,
        accountId: s.string({ minLength: 1, maxLength: 64 }),
        startDate: Day,
        endDate: Day,
      }),
      output: s.object({
        transactions: s.array(
          s.object({
            id: s.string(),
            date: s.string(),
            amount: Amount,
            payee: s.nullable(s.string()),
            category: s.nullable(s.string()),
            notes: s.nullable(s.string()),
            cleared: s.boolean(),
            importedId: s.nullable(s.string()),
          }),
        ),
      }),
      integration: read(
        "List an account's transactions in a date range.",
        'urn:appport:actual:budgets',
      ),
      handler: async ({ budgetSyncId, accountId, startDate, endDate }, ctx) => {
        if (startDate > endDate) {
          throw errors.invalidInput('startDate is after endDate');
        }
        return withSession(ctx, upstream, budgetSyncId, async api => {
          if (!(await api.getAccounts()).some(a => a.id === accountId)) {
            throw errors.notFound('no such account in this budget');
          }
          const tx = await api.getTransactions(accountId, startDate, endDate);
          return {
            transactions: tx.map(t => ({
              id: t.id,
              date: t.date,
              amount: t.amount,
              payee: t.payee ?? null,
              category: t.category ?? null,
              notes: t.notes ?? null,
              cleared: Boolean(t.cleared),
              importedId: t.imported_id ?? null,
            })),
          };
        });
      },
    }),
    cap({
      name: 'actual.budget.month',
      version: 1,
      description:
        "One month of the budget as Actual's engine reports it: budgeted, spent and balance per category.",
      input: s.object({ budgetSyncId: SyncId, month: Month }),
      output: s.object({
        month: s.string(),
        categoryGroups: s.array(
          s.object({
            id: s.string(),
            name: s.string(),
            isIncome: s.boolean(),
            categories: s.array(
              s.object({
                id: s.string(),
                name: s.string(),
                budgeted: s.nullable(Amount),
                spent: s.nullable(Amount),
                balance: s.nullable(Amount),
              }),
            ),
          }),
        ),
      }),
      integration: read(
        "Read a budget month's per-category figures.",
        'urn:appport:actual:budgets',
      ),
      handler: async ({ budgetSyncId, month }, ctx) =>
        withSession(ctx, upstream, budgetSyncId, async api => {
          const m = await api.getBudgetMonth(month);
          const n = v => (typeof v === 'number' ? v : null);
          return {
            month: m.month ?? month,
            categoryGroups: (m.categoryGroups ?? []).map(g => ({
              id: g.id,
              name: g.name,
              isIncome: Boolean(g.is_income),
              categories: (g.categories ?? []).map(c => ({
                id: c.id,
                name: c.name,
                budgeted: n(c.budgeted),
                spent: n(c.spent),
                balance: n(c.balance),
              })),
            })),
          };
        }),
    }),
  ];
}

export async function build(config) {
  return startBridge({
    application: {
      id: 'org.actualbudget',
      name: 'Actual Budget',
      version: 'appport-bridge-1',
      description:
        "Actual Budget data, read through Actual's own API and sync server with the caller's own session token.",
    },
    capabilities: capabilities(config.upstream),
    resources: [
      {
        id: 'urn:appport:actual:budgets',
        kind: 'collection',
        owner: 'self',
        description: 'Budget files stored by this Actual sync server.',
      },
    ],
    scopes: [SCOPE],
    publish: config.publish,
    publishCapabilities: [
      'actual.budgets.list',
      'actual.accounts.list',
      'actual.transactions.list',
      'actual.budget.month',
    ].map(name => ({ name, version: 1, purpose: true })),
    host: config.host,
    port: config.port,
  });
}

if (import.meta.url === `file://${process.argv[1]}`) await runBridgeMain(build);
