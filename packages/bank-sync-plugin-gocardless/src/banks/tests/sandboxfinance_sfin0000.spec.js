import SandboxfinanceSfin0000 from '../sandboxfinance_sfin0000.js';

describe('SandboxfinanceSfin0000', () => {
  describe('#normalizeAccount', () => {
    /** @type {import('../../gocardless.types.js').DetailedAccountWithInstitution} */
    const accountRaw = {
      resourceId: '01F3NS5ASCNMVCTEJDT0G215YE',
      iban: 'GL0865354374424724',
      currency: 'EUR',
      ownerName: 'Jane Doe',
      name: 'Main Account',
      product: 'Checkings',
      cashAccountType: 'CACC',
      id: '99a0bfe2-0bef-46df-bff2-e9ae0c6c5838',
      created: '2022-02-21T13:43:55.608911Z',
      last_accessed: '2023-01-25T16:50:15.078264Z',
      institution_id: 'SANDBOXFINANCE_SFIN0000',
      status: 'READY',
      owner_name: 'Jane Doe',
      institution: {
        id: 'SANDBOXFINANCE_SFIN0000',
        name: 'Sandbox Finance',
        bic: 'SFIN0000',
        transaction_total_days: '90',
        max_access_valid_for_days: '90',
        countries: ['XX'],
        logo: 'https://cdn.nordigen.com/ais/SANDBOXFINANCE_SFIN0000.png',
        supported_payments: {},
        supported_features: [],
      },
    };

    it('returns normalized account data returned to Frontend', () => {
      expect(SandboxfinanceSfin0000.normalizeAccount(accountRaw))
        .toMatchInlineSnapshot(`
        {
          "account_id": "99a0bfe2-0bef-46df-bff2-e9ae0c6c5838",
          "iban": "GL0865354374424724",
          "institution": {
            "bic": "SFIN0000",
            "countries": [
              "XX",
            ],
            "id": "SANDBOXFINANCE_SFIN0000",
            "logo": "https://cdn.nordigen.com/ais/SANDBOXFINANCE_SFIN0000.png",
            "max_access_valid_for_days": "90",
            "name": "Sandbox Finance",
            "supported_features": [],
            "supported_payments": {},
            "transaction_total_days": "90",
          },
          "mask": "4724",
          "name": "Main Account (XXX 4724) EUR",
          "official_name": "Checkings",
          "type": "checking",
        }
      `);
    });
  });

  describe('#sortTransactions', () => {
    it('handles empty arrays', () => {
      const transactions = [];
      const sortedTransactions =
        SandboxfinanceSfin0000.sortTransactions(transactions);
      expect(sortedTransactions).toEqual([]);
    });

    it('returns empty array for undefined input', () => {
      const sortedTransactions =
        SandboxfinanceSfin0000.sortTransactions(undefined);
      expect(sortedTransactions).toEqual([]);
    });
  });

  describe('#countStartingBalance', () => {
    /** @type {import('../../gocardless-node.types.js').Balance[]} */
    const balances = [
      {
        balanceAmount: { amount: '1000.00', currency: 'PLN' },
        balanceType: 'interimAvailable',
      },
    ];

    it('should calculate the starting balance correctly', () => {
      const sortedTransactions = [
        {
          transactionId: '2022-01-01-1',
          transactionAmount: { amount: '-100.00', currency: 'USD' },
        },
        {
          transactionId: '2022-01-01-2',
          transactionAmount: { amount: '50.00', currency: 'USD' },
        },
        {
          transactionId: '2022-01-01-3',
          transactionAmount: { amount: '-25.00', currency: 'USD' },
        },
      ];

      const startingBalance = SandboxfinanceSfin0000.calculateStartingBalance(
        sortedTransactions,
        balances,
      );

      expect(startingBalance).toEqual(107500);
    });

    it('returns the same balance amount when no transactions', () => {
      const transactions = [];

      expect(
        SandboxfinanceSfin0000.calculateStartingBalance(transactions, balances),
      ).toEqual(100000);
    });

    it('returns the balance minus the available transactions', () => {
      /** @type {import('../../gocardless-node.types.js').Transaction[]} */
      const transactions = [
        {
          transactionAmount: { amount: '200.00', currency: 'PLN' },
        },
        {
          transactionAmount: { amount: '300.50', currency: 'PLN' },
        },
      ];

      expect(
        SandboxfinanceSfin0000.calculateStartingBalance(transactions, balances),
      ).toEqual(49950);
    });
  });
});
