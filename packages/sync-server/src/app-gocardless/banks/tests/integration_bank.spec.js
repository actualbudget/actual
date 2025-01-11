import { jest } from '@jest/globals';
import IntegrationBank from '../integration-bank.js';
import {
  mockExtendAccountsAboutInstitutions,
  mockInstitution,
} from '../../services/tests/fixtures.js';

describe('IntegrationBank', () => {
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'debug');
  });

  describe('normalizeAccount', () => {
    const account = mockExtendAccountsAboutInstitutions[0];

    it('should return a normalized account object', () => {
      const normalizedAccount = IntegrationBank.normalizeAccount(account);
      expect(normalizedAccount).toEqual({
        account_id: account.id,
        institution: mockInstitution,
        mask: '4321',
        iban: account.iban,
        name: 'account-example-one (XXX 4321) PLN',
        official_name: 'Savings Account for Individuals (Retail)',
        type: 'checking',
      });
    });

    it('should return a normalized account object with masked value "0000" when no iban property is provided', () => {
      const normalizedAccount = IntegrationBank.normalizeAccount({
        ...account,
        iban: undefined,
      });
      expect(normalizedAccount).toEqual({
        account_id: account.id,
        institution: mockInstitution,
        mask: '0000',
        iban: null,
        name: 'account-example-one PLN',
        official_name: 'Savings Account for Individuals (Retail)',
        type: 'checking',
      });
    });

    it('normalizeAccount logs available account properties', () => {
      IntegrationBank.normalizeAccount(account);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Available account properties for new institution integration',
        {
          account: JSON.stringify(account),
        },
      );
    });
  });

  describe('sortTransactions', () => {
    const transactions = [
      {
        date: '2022-01-01',
        bookingDate: '2022-01-01',
        transactionAmount: { amount: '100', currency: 'EUR' },
      },
      {
        date: '2022-01-03',
        bookingDate: '2022-01-03',
        transactionAmount: { amount: '100', currency: 'EUR' },
      },
      {
        date: '2022-01-02',
        bookingDate: '2022-01-02',
        transactionAmount: { amount: '100', currency: 'EUR' },
      },
    ];
    const sortedTransactions = [
      {
        date: '2022-01-03',
        bookingDate: '2022-01-03',
        transactionAmount: { amount: '100', currency: 'EUR' },
      },
      {
        date: '2022-01-02',
        bookingDate: '2022-01-02',
        transactionAmount: { amount: '100', currency: 'EUR' },
      },
      {
        date: '2022-01-01',
        bookingDate: '2022-01-01',
        transactionAmount: { amount: '100', currency: 'EUR' },
      },
    ];

    it('should return transactions sorted by bookingDate', () => {
      const sortedTransactions = IntegrationBank.sortTransactions(transactions);
      expect(sortedTransactions).toEqual(sortedTransactions);
    });

    it('sortTransactions logs available transactions properties', () => {
      IntegrationBank.sortTransactions(transactions);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Available (first 10) transactions properties for new integration of institution in sortTransactions function',
        { top10Transactions: JSON.stringify(sortedTransactions.slice(0, 10)) },
      );
    });
  });

  describe('calculateStartingBalance', () => {
    /** @type {import('../../gocardless-node.types.js').Transaction[]} */
    const transactions = [
      {
        bookingDate: '2022-01-01',
        transactionAmount: { amount: '100', currency: 'EUR' },
      },
      {
        bookingDate: '2022-02-01',
        transactionAmount: { amount: '100', currency: 'EUR' },
      },
      {
        bookingDate: '2022-03-01',
        transactionAmount: { amount: '100', currency: 'EUR' },
      },
    ];

    /** @type {import('../../gocardless-node.types.js').Balance[]} */
    const balances = [
      {
        balanceAmount: { amount: '1000.00', currency: 'EUR' },
        balanceType: 'interimBooked',
      },
    ];

    it('should return 0 when no transactions or balances are provided', () => {
      const startingBalance = IntegrationBank.calculateStartingBalance([], []);
      expect(startingBalance).toEqual(0);
    });

    it('should return 70000 when transactions and balances are provided', () => {
      const startingBalance = IntegrationBank.calculateStartingBalance(
        transactions,
        balances,
      );
      expect(startingBalance).toEqual(70000);
    });

    it('logs available transactions and balances properties', () => {
      IntegrationBank.calculateStartingBalance(transactions, balances);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Available (first 10) transactions properties for new integration of institution in calculateStartingBalance function',
        {
          balances: JSON.stringify(balances),
          top10SortedTransactions: JSON.stringify(transactions.slice(0, 10)),
        },
      );
    });
  });
});
