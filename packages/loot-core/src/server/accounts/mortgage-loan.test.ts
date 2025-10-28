import { describe, it, expect, beforeEach, vi } from 'vitest';

import * as monthUtils from '../../shared/months';
import * as db from '../db';

import {
  calculateInterest,
  getDaysSinceLastInterest,
  createInterestTransaction,
  processInterestForAccount,
  type MortgageLoanAccount,
} from './mortgage-loan';

vi.mock('../../shared/months', async () => ({
  ...(await vi.importActual('../../shared/months')),
  currentDay: vi.fn(),
}));

describe('Mortgage/Loan functionality', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    vi.mocked(monthUtils.currentDay).mockReturnValue('2017-10-15');
    await (
      global as { emptyDatabase: () => () => Promise<void> }
    ).emptyDatabase()();
  });

  // Helper function to create a proper account object
  function createTestAccount(
    overrides: Partial<MortgageLoanAccount> = {},
  ): MortgageLoanAccount {
    const baseAccount = {
      id: 'test-account-id',
      name: 'Test Account',
      offbudget: 0 as 0 | 1,
      closed: 0 as 0 | 1,
      sort_order: 0,
      last_reconciled: '2017-10-15' as string | null,
      tombstone: 0 as 0 | 1,
      account_type: 'mortgage' as const,
      interest_rate: 5.0,
      // Required sync fields (false means not synced)
      account_id: null,
      bank: null,
      bankName: null,
      bankId: null,
      official_name: null,
      mask: null,
      balance_current: null,
      balance_available: null,
      balance_limit: null,
      account_sync_source: null,
      last_sync: null,
    };

    return { ...baseAccount, ...overrides } as MortgageLoanAccount;
  }

  describe('calculateInterest', () => {
    it('should calculate daily interest correctly', () => {
      const balance = 100000; // $100,000
      const interestRate = 5; // 5% annual
      const daysElapsed = 1;

      const interest = calculateInterest(balance, interestRate, daysElapsed);

      // Daily rate = 5% / 365 = 0.0137%
      // Interest = 100000 * 0.000137 * 1 = 13.70
      expect(interest).toBeCloseTo(1369.86, 2);
    });

    it('should calculate interest for multiple days', () => {
      const balance = 100000;
      const interestRate = 5;
      const daysElapsed = 30;

      const interest = calculateInterest(balance, interestRate, daysElapsed);

      // Should be approximately 30 times the daily interest
      expect(interest).toBeCloseTo(41095.89, 2);
    });

    it('should handle zero interest rate', () => {
      const balance = 100000;
      const interestRate = 0;
      const daysElapsed = 1;

      const interest = calculateInterest(balance, interestRate, daysElapsed);

      expect(interest).toBe(0);
    });
  });

  describe('getDaysSinceLastInterest', () => {
    it('should return 1 for null date (first time interest calculation)', () => {
      const days = getDaysSinceLastInterest(null);
      expect(days).toBe(1);
    });

    it('should calculate days correctly', () => {
      const yesterdayStr = '2017-10-14'; // One day before mocked current date

      const days = getDaysSinceLastInterest(yesterdayStr);
      expect(days).toBe(1);
    });
  });

  describe('createInterestTransaction', () => {
    it('should create an interest transaction', async () => {
      // Create a test account
      const accountId = await db.insertAccount({
        name: 'Test Mortgage',
        offbudget: 1,
        closed: 0,
        account_type: 'mortgage',
        interest_rate: 5.0,
      });

      const transactionId = await createInterestTransaction(
        accountId,
        100.5,
        'Mortgage Interest',
      );

      expect(transactionId).toBeDefined();

      // Verify the transaction was created
      const transaction = await db.first(
        'SELECT * FROM transactions WHERE id = ?',
        [transactionId],
      );

      expect(transaction).toBeDefined();
      expect(
        (transaction as { acct: string; amount: number; description: string })
          .acct,
      ).toBe(accountId);
      expect(
        (transaction as { acct: string; amount: number; description: string })
          .amount,
      ).toBe(10050); // Amount in cents
      expect(
        (transaction as { acct: string; amount: number; description: string })
          .description,
      ).toBe('Mortgage Interest');
    });
  });

  describe('processInterestForAccount', () => {
    it('should process interest for a mortgage account', async () => {
      // Create a test account
      const accountId = await db.insertAccount({
        name: 'Test Mortgage',
        offbudget: 1,
        closed: 0,
        account_type: 'mortgage',
        interest_rate: 5.0,
      });

      // Add a starting balance
      await db.insertTransaction({
        id: 'test-transaction-1',
        account: accountId,
        amount: -10000000, // -$100,000 in cents
        payee: 'Initial balance', // Use 'payee' field which maps to 'description' in database
        date: '2024-01-01',
        cleared: 1,
        is_parent: 0,
        is_child: 0,
        tombstone: 0,
      });

      const account = createTestAccount({
        id: accountId,
        name: 'Test Mortgage',
        account_type: 'mortgage' as const,
        interest_rate: 5.0,
      });

      await processInterestForAccount(account);

      // Check that an interest transaction was created
      const interestTransactions = await db.all(
        'SELECT * FROM transactions WHERE acct = ? AND description LIKE ?',
        [accountId, '%Interest%'],
      );

      expect(interestTransactions).toHaveLength(1);
      expect(
        (interestTransactions[0] as { amount: number }).amount,
      ).toBeGreaterThan(0);
    });

    it('should not process interest for accounts without interest rate', async () => {
      const accountId = await db.insertAccount({
        name: 'Test Account',
        offbudget: 1,
        closed: 0,
        account_type: 'checking',
        interest_rate: null,
      });

      const account = createTestAccount({
        id: accountId,
        name: 'Test Account',
        account_type: 'loan' as const, // Use loan instead of checking for MortgageLoanAccount
        interest_rate: null,
      });

      await processInterestForAccount(account);

      // Check that no interest transaction was created
      const interestTransactions = await db.all(
        'SELECT * FROM transactions WHERE acct = ? AND description LIKE ?',
        [accountId, '%Interest%'],
      );

      expect(interestTransactions).toHaveLength(0);
    });
  });
});
