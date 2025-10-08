import MbankRetailBrexplpw from '../mbank_retail_brexplpw.js';

describe('MbankRetailBrexplpw', () => {
  describe('#normalizeAccount', () => {
    /** @type {import('../../gocardless.types.js').DetailedAccountWithInstitution} */
    const accountRaw = {
      iban: 'PL00000000000000000987654321',
      currency: 'PLN',
      ownerName: 'John Example',
      displayName: 'EKONTO',
      product: 'RACHUNEK BIEŻĄCY',
      usage: 'PRIV',
      ownerAddressUnstructured: [
        'POL',
        'UL. EXAMPLE STREET 10 M.1',
        '00-000 WARSZAWA',
      ],
      id: 'd3eccc94-9536-48d3-98be-813f79199ee3',
      created: '2023-01-18T13:24:55.879512Z',
      last_accessed: null,
      institution_id: 'MBANK_RETAIL_BREXPLPW',
      status: 'READY',
      owner_name: '',
      institution: {
        id: 'MBANK_RETAIL_BREXPLPW',
        name: 'mBank Retail',
        bic: 'BREXPLPW',
        transaction_total_days: '90',
        max_access_valid_for_days: '90',
        countries: ['PL'],
        logo: 'https://cdn.nordigen.com/ais/MBANK_RETAIL_BREXCZPP.png',
        supported_payments: {},
        supported_features: [
          'access_scopes',
          'business_accounts',
          'card_accounts',
          'corporate_accounts',
          'pending_transactions',
          'private_accounts',
        ],
      },
    };
    it('returns normalized account data returned to Frontend', () => {
      expect(MbankRetailBrexplpw.normalizeAccount(accountRaw))
        .toMatchInlineSnapshot(`
        {
          "account_id": "d3eccc94-9536-48d3-98be-813f79199ee3",
          "iban": "PL00000000000000000987654321",
          "institution": {
            "bic": "BREXPLPW",
            "countries": [
              "PL",
            ],
            "id": "MBANK_RETAIL_BREXPLPW",
            "logo": "https://cdn.nordigen.com/ais/MBANK_RETAIL_BREXCZPP.png",
            "max_access_valid_for_days": "90",
            "name": "mBank Retail",
            "supported_features": [
              "access_scopes",
              "business_accounts",
              "card_accounts",
              "corporate_accounts",
              "pending_transactions",
              "private_accounts",
            ],
            "supported_payments": {},
            "transaction_total_days": "90",
          },
          "mask": "4321",
          "name": "EKONTO (XXX 4321) PLN",
          "official_name": "RACHUNEK BIEŻĄCY",
          "type": "checking",
        }
      `);
    });
  });

  describe('#sortTransactions', () => {
    it('returns transactions from newest to oldest', () => {
      const sortedTransactions = MbankRetailBrexplpw.sortTransactions([
        {
          transactionId: '202212300001',
          transactionAmount: { amount: '100', currency: 'EUR' },
        },
        {
          transactionId: '202212300003',
          transactionAmount: { amount: '100', currency: 'EUR' },
        },
        {
          transactionId: '202212300002',
          transactionAmount: { amount: '100', currency: 'EUR' },
        },
        {
          transactionId: '202212300000',
          transactionAmount: { amount: '100', currency: 'EUR' },
        },
        {
          transactionId: '202112300001',
          transactionAmount: { amount: '100', currency: 'EUR' },
        },
      ]);

      expect(sortedTransactions).toEqual([
        {
          transactionId: '202212300003',
          transactionAmount: { amount: '100', currency: 'EUR' },
        },
        {
          transactionId: '202212300002',
          transactionAmount: { amount: '100', currency: 'EUR' },
        },
        {
          transactionId: '202212300001',
          transactionAmount: { amount: '100', currency: 'EUR' },
        },
        {
          transactionId: '202212300000',
          transactionAmount: { amount: '100', currency: 'EUR' },
        },
        {
          transactionId: '202112300001',
          transactionAmount: { amount: '100', currency: 'EUR' },
        },
      ]);
    });

    it('returns empty array for empty input', () => {
      const sortedTransactions = MbankRetailBrexplpw.sortTransactions([]);
      expect(sortedTransactions).toEqual([]);
    });

    it('returns empty array for undefined input', () => {
      const sortedTransactions =
        MbankRetailBrexplpw.sortTransactions(undefined);
      expect(sortedTransactions).toEqual([]);
    });
  });

  describe('#countStartingBalance', () => {
    /** @type {import('../../gocardless-node.types.js').Balance[]} */
    const balances = [
      {
        balanceAmount: { amount: '1000.00', currency: 'PLN' },
        balanceType: 'interimBooked',
      },
    ];

    it('returns the same balance amount when no transactions', () => {
      const transactions = [];

      expect(
        MbankRetailBrexplpw.calculateStartingBalance(transactions, balances),
      ).toEqual(100000);
    });

    it('returns the balance minus the available transactions', () => {
      const transactions = [
        {
          transactionAmount: { amount: '200.00', currency: 'PLN' },
        },
        {
          transactionAmount: { amount: '300.50', currency: 'PLN' },
        },
      ];

      expect(
        MbankRetailBrexplpw.calculateStartingBalance(transactions, balances),
      ).toEqual(49950);
    });
  });
});
