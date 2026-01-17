import {
  mockExtendAccountsAboutInstitutions,
  mockInstitution,
} from '../../services/tests/fixtures';
import IntegrationBank from '../integration-bank';

describe('IntegrationBank', () => {
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

    it('should return transactions sorted by bookingDate', () => {
      const sortedTransactions = IntegrationBank.sortTransactions(transactions);
      expect(sortedTransactions).toEqual([
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
      ]);
    });
  });

  describe('calculateStartingBalance', () => {
    /** @type {import('../../gocardless-node.types').Transaction[]} */
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

    /** @type {import('../../gocardless-node.types').Balance[]} */
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
  });
});
