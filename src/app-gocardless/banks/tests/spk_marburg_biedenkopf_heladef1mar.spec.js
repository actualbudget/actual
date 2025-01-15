import SpkMarburgBiedenkopfHeladef1mar from '../spk_marburg_biedenkopf_heladef1mar.js';

describe('SpkMarburgBiedenkopfHeladef1mar', () => {
  describe('#normalizeAccount', () => {
    /** @type {import('../../gocardless.types.js').DetailedAccountWithInstitution} */
    const accountRaw = {
      resourceId: 'e896eec6-6096-4efc-a941-756bd9d74765',
      iban: 'DE50533500000123456789',
      currency: 'EUR',
      ownerName: 'JANE DOE',
      product: 'Sichteinlagen',
      bic: 'HELADEF1MAR',
      usage: 'PRIV',
      id: 'a787ba27-02ee-4fd6-be86-73831adc5498',
      created: '2024-01-01T14:17:11.630352Z',
      last_accessed: '2024-01-01T14:19:42.709478Z',
      institution_id: 'SPK_MARBURG_BIEDENKOPF_HELADEF1MAR',
      status: 'READY',
      owner_name: 'JANE DOE',
      institution: {
        id: 'SPK_MARBURG_BIEDENKOPF_HELADEF1MAR',
        name: 'Sparkasse Marburg-Biedenkopf',
        bic: 'HELADEF1MAR',
        transaction_total_days: '360',
        max_access_valid_for_days: '90',
        countries: ['DE'],
        logo: 'https://storage.googleapis.com/gc-prd-institution_icons-production/DE/PNG/sparkasse.png',
        supported_payments: {
          'single-payment': ['SCT', 'ISCT'],
        },
        supported_features: [
          'card_accounts',
          'payments',
          'pending_transactions',
        ],
        /*"identification_codes": []*/
      },
    };

    it('returns normalized account data returned to Frontend', () => {
      expect(
        SpkMarburgBiedenkopfHeladef1mar.normalizeAccount(accountRaw),
      ).toEqual({
        account_id: 'a787ba27-02ee-4fd6-be86-73831adc5498',
        iban: 'DE50533500000123456789',
        institution: {
          bic: 'HELADEF1MAR',
          countries: ['DE'],
          id: 'SPK_MARBURG_BIEDENKOPF_HELADEF1MAR',
          logo: 'https://storage.googleapis.com/gc-prd-institution_icons-production/DE/PNG/sparkasse.png',
          name: 'Sparkasse Marburg-Biedenkopf',
          supported_features: [
            'card_accounts',
            'payments',
            'pending_transactions',
          ],
          supported_payments: {
            'single-payment': ['SCT', 'ISCT'],
          },
          transaction_total_days: '360',
          max_access_valid_for_days: '90',
        },
        mask: '6789',
        name: 'Sichteinlagen (XXX 6789) EUR',
        official_name: 'Sichteinlagen',
        type: 'checking',
      });
    });
  });

  const transactionsRaw = [
    {
      transactionId: 'fefa0b605ac14a7eb14f4c8ab6a6af55',
      bookingDate: '2023-12-29',
      valueDate: '2023-12-29',
      transactionAmount: {
        amount: '-40.00',
        currency: 'EUR',
      },
      creditorName: 'JET Tankstelle',
      remittanceInformationStructured: 'AUTORISATION  28.12. 18:30',
      proprietaryBankTransactionCode: 'NSTO+000+0000+000-AA',
      internalTransactionId: '761660c052ed48e78c2be39775f08da9',
      date: '2023-12-29',
    },
    {
      transactionId: '1a8e5d0df259472694f13132001af0a6',
      bookingDate: '2023-12-28',
      valueDate: '2023-12-28',
      transactionAmount: {
        amount: '-1242.47',
        currency: 'EUR',
      },
      creditorName: 'Peter Muster',
      remittanceInformationStructured: 'Miete 12/2023',
      proprietaryBankTransactionCode: 'NSTO+111+1111+111-BB',
      internalTransactionId: '5a20ac78b146401e940b6fee30ee404b',
      date: '2023-12-28',
    },
    {
      transactionId: '166983e65ec54000a361a952e6161f33',
      bookingDate: '2023-12-27',
      valueDate: '2023-12-27',
      transactionAmount: {
        amount: '1541.23',
        currency: 'EUR',
      },
      debtorName: 'Arbeitgeber AG',
      remittanceInformationStructured: 'Lohn/Gehalt 12/2023',
      proprietaryBankTransactionCode: 'NSTO+222+2222+222-CC',
      internalTransactionId: '51630dda877f45f186d315b8058d891a',
      date: '2023-12-27',
    },
    {
      transactionId: '4dd9f4c9968a45739c0705ebc675b54b',
      bookingDate: '2023-12-26',
      valueDate: '2023-12-26',
      transactionAmount: {
        amount: '-8.00',
        currency: 'EUR',
      },
      remittanceInformationStructuredArray: [
        'Entgeltabrechnung',
        'siehe Anlage',
      ],
      proprietaryBankTransactionCode: 'NSTO+333+3333+333-DD',
      internalTransactionId: '9c58c87c2d1644e4a5e149c837c16bbb',
      date: '2023-12-26',
    },
  ];

  describe('#normalizeTransaction', () => {
    it('fallbacks to remittanceInformationStructured when remittanceInformationUnstructed is not set', () => {
      const transaction = {
        transactionId: 'fefa0b605ac14a7eb14f4c8ab6a6af55',
        bookingDate: '2023-12-29',
        valueDate: '2023-12-29',
        transactionAmount: {
          amount: '-40.00',
          currency: 'EUR',
        },
        creditorName: 'JET Tankstelle',
        remittanceInformationStructured: 'AUTORISATION  28.12. 18:30',
        proprietaryBankTransactionCode: 'NSTO+000+0000+000-AA',
        internalTransactionId: '761660c052ed48e78c2be39775f08da9',
        date: '2023-12-29',
      };

      expect(
        SpkMarburgBiedenkopfHeladef1mar.normalizeTransaction(transaction, true)
          .remittanceInformationUnstructured,
      ).toEqual('AUTORISATION  28.12. 18:30');
    });

    it('fallbacks to remittanceInformationStructuredArray when remittanceInformationUnstructed and remittanceInformationStructured is not set', () => {
      const transaction = {
        transactionId: '4dd9f4c9968a45739c0705ebc675b54b',
        bookingDate: '2023-12-26',
        valueDate: '2023-12-26',
        transactionAmount: {
          amount: '-8.00',
          currency: 'EUR',
        },
        remittanceInformationStructuredArray: [
          'Entgeltabrechnung',
          'siehe Anlage',
        ],
        proprietaryBankTransactionCode: 'NSTO+333+3333+333-DD',
        internalTransactionId: '9c58c87c2d1644e4a5e149c837c16bbb',
        date: '2023-12-26',
      };

      expect(
        SpkMarburgBiedenkopfHeladef1mar.normalizeTransaction(transaction, true)
          .remittanceInformationUnstructured,
      ).toEqual('Entgeltabrechnung siehe Anlage');
    });
  });

  describe('#sortTransactions', () => {
    it('handles empty arrays', () => {
      const transactions = [];
      const sortedTransactions =
        SpkMarburgBiedenkopfHeladef1mar.sortTransactions(transactions);
      expect(sortedTransactions).toEqual([]);
    });

    it('returns empty array for undefined input', () => {
      const sortedTransactions =
        SpkMarburgBiedenkopfHeladef1mar.sortTransactions(undefined);
      expect(sortedTransactions).toEqual([]);
    });

    it('returns sorted array for unsorted inputs', () => {
      const normalizeTransactions = transactionsRaw.map((tx) =>
        SpkMarburgBiedenkopfHeladef1mar.normalizeTransaction(tx, true),
      );
      const originalOrder = Array.from(normalizeTransactions);
      const swap = (a, b) => {
        const swap = normalizeTransactions[a];
        normalizeTransactions[a] = normalizeTransactions[b];
        normalizeTransactions[b] = swap;
      };
      swap(1, 4);
      swap(3, 6);
      swap(0, 7);
      const sortedTransactions =
        SpkMarburgBiedenkopfHeladef1mar.sortTransactions(normalizeTransactions);
      expect(sortedTransactions).toEqual(originalOrder);
    });
  });

  describe('#countStartingBalance', () => {
    /** @type {import('../../gocardless-node.types.js').Balance[]} */
    const balances = [
      {
        balanceAmount: { amount: '3596.87', currency: 'EUR' },
        balanceType: 'closingBooked',
        referenceDate: '2023-12-29',
      },
    ];

    it('should return 0 when no transactions or balances are provided', () => {
      const startingBalance =
        SpkMarburgBiedenkopfHeladef1mar.calculateStartingBalance([], []);
      expect(startingBalance).toEqual(0);
    });

    it('should calculate the starting balance correctly', () => {
      const normalizeTransactions = transactionsRaw.map((tx) =>
        SpkMarburgBiedenkopfHeladef1mar.normalizeTransaction(tx, true),
      );
      const sortedTransactions =
        SpkMarburgBiedenkopfHeladef1mar.sortTransactions(normalizeTransactions);

      const startingBalance =
        SpkMarburgBiedenkopfHeladef1mar.calculateStartingBalance(
          sortedTransactions,
          balances,
        );

      expect(startingBalance).toEqual(334611);
    });

    it('returns the same balance amount when no transactions', () => {
      const transactions = [];

      expect(
        SpkMarburgBiedenkopfHeladef1mar.calculateStartingBalance(
          transactions,
          balances,
        ),
      ).toEqual(359687);
    });
  });
});
