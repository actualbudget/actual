import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  mockDebitTransaction,
  mockPendingTransaction,
  mockPendingTransactionNoDate,
} from '#app-enablebanking/services/tests/fixtures';

// Mock all external dependencies before importing the app (mirrors
// poll-auth.spec.ts).
vi.mock('../../services/secrets-service', () => ({
  SecretName: {
    enablebanking_applicationId: 'enablebanking_applicationId',
    enablebanking_secretKey: 'enablebanking_secretKey',
  },
  secretsService: {
    get: vi.fn(() => 'test-value'),
    set: vi.fn(),
  },
}));

vi.mock('../utils/jwt', () => ({
  getJWT: vi.fn(() => 'mock-jwt-token'),
}));

vi.mock('../../util/middlewares', () => ({
  requestLoggerMiddleware: (_req: unknown, _res: unknown, next: () => void) =>
    next(),
  validateSessionMiddleware: (_req: unknown, _res: unknown, next: () => void) =>
    next(),
}));

vi.mock('../../app-gocardless/util/handle-error', () => ({
  handleError:
    (fn: Function) =>
    (req: unknown, res: { send: (data: unknown) => void }) => {
      Promise.resolve(fn(req, res)).catch((err: Error) => {
        res.send({
          status: 'ok',
          data: {
            error_code: 'INTERNAL_ERROR',
            error_type: err.message || 'internal-error',
          },
        });
      });
    },
}));

// Mock fetch globally (the service is stubbed below, this just guards stray calls)
vi.stubGlobal('fetch', vi.fn());

const { handlers } = await import('../app-enablebanking');
const { enableBankingService } =
  await import('../services/enablebanking-service');

const app = express();
app.set('trust proxy', true);
app.use(express.json());
app.use('/', handlers);

const ids = (txns: Array<{ transactionId: string }>) =>
  txns.map(t => t.transactionId);

describe('POST /transactions', () => {
  beforeEach(() => {
    vi.spyOn(enableBankingService, 'getBalances').mockResolvedValue({
      balances: [],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('skips a date-less pending transaction while keeping valid booked and pending ones', async () => {
    // mockPendingTransactionNoDate normalizes to date '' — the record that would
    // otherwise abort the whole sync when Actual's client tries to insert it.
    vi.spyOn(enableBankingService, 'getAllTransactions').mockResolvedValue([
      mockDebitTransaction,
      mockPendingTransaction,
      mockPendingTransactionNoDate,
    ]);

    const res = await request(app)
      .post('/transactions')
      .send({ accountId: 'acc-1', startDate: '2026-03-01' });

    expect(res.body.status).toBe('ok');

    const { all, booked, pending } = res.body.data.transactions;
    // The unimportable record is dropped (proves the fix)...
    expect(ids(all)).toEqual(['ref-002', 'tx-003']);
    expect(ids(all)).not.toContain('tx-no-date');
    // ...while the valid booked and valid (dated) pending entries still import
    // and bucket correctly (no regression).
    expect(ids(booked)).toEqual(['ref-002']);
    expect(ids(pending)).toEqual(['tx-003']);
  });

  it('keeps every transaction when all are importable', async () => {
    vi.spyOn(enableBankingService, 'getAllTransactions').mockResolvedValue([
      mockDebitTransaction,
      mockPendingTransaction,
    ]);

    const res = await request(app)
      .post('/transactions')
      .send({ accountId: 'acc-1', startDate: '2026-03-01' });

    expect(res.body.data.transactions.all).toHaveLength(2);
    expect(ids(res.body.data.transactions.all)).toEqual(['ref-002', 'tx-003']);
  });
});
