import IngIngddeff from '../ing_ingddeff.js';

describe('IngIngddeff', () => {
  describe('#normalizeAccount', () => {
    /** @type {import('../../gocardless.types.js').DetailedAccountWithInstitution} */
    const accountRaw = {
      resourceId: 'e896eec6-6096-4efc-a941-756bd9d74765',
      iban: 'DE02500105170137075030',
      currency: 'EUR',
      ownerName: 'Jane Doe',
      product: 'Girokonto',
      id: 'a787ba27-02ee-4fd6-be86-73831adc5498',
      created: '2023-12-29T14:17:11.630352Z',
      last_accessed: '2023-12-29T14:19:42.709478Z',
      institution_id: 'ING_INGDDEFF',
      status: 'READY',
      owner_name: 'Jane Doe',
      institution: {
        id: 'ING_INGDDEFF',
        name: 'ING',
        bic: 'INGDDEFFXXX',
        transaction_total_days: '390',
        max_access_valid_for_days: '90',
        countries: ['DE'],
        logo: 'https://storage.googleapis.com/gc-prd-institution_icons-production/DE/PNG/ing.png',
        supported_payments: {
          'single-payment': ['SCT'],
        },
        supported_features: [
          'account_selection',
          'business_accounts',
          'corporate_accounts',
          'payments',
          'pending_transactions',
          'private_accounts',
        ],
        /*identification_codes: [],*/
      },
    };

    it('returns normalized account data returned to Frontend', () => {
      expect(IngIngddeff.normalizeAccount(accountRaw)).toEqual({
        account_id: 'a787ba27-02ee-4fd6-be86-73831adc5498',
        iban: 'DE02500105170137075030',
        institution: {
          bic: 'INGDDEFFXXX',
          countries: ['DE'],
          id: 'ING_INGDDEFF',
          logo: 'https://storage.googleapis.com/gc-prd-institution_icons-production/DE/PNG/ing.png',
          name: 'ING',
          supported_features: [
            'account_selection',
            'business_accounts',
            'corporate_accounts',
            'payments',
            'pending_transactions',
            'private_accounts',
          ],
          supported_payments: {
            'single-payment': ['SCT'],
          },
          transaction_total_days: '390',
          max_access_valid_for_days: '90',
        },
        mask: '5030',
        name: 'Girokonto (XXX 5030) EUR',
        official_name: 'Girokonto',
        type: 'checking',
      });
    });
  });

  const transactionsRaw = [
    {
      transactionId: '000010348081381',
      endToEndId: 'NOTPROVIDED',
      bookingDate: '2023-12-29',
      valueDate: '2023-12-29',
      transactionAmount: {
        amount: '-4.00',
        currency: 'EUR',
      },
      creditorName: 'VISA XXXXXXXXXXXXXXXXXXXX                             ',
      remittanceInformationUnstructured:
        'mandatereference:,creditorid:,remittanceinformation:NR XXXX 63053 51590342815                              KAUFUMSATZ                 24.90                      2311825                     ARN044873748454374484719431 Google Pay                 ',
      proprietaryBankTransactionCode: 'Lastschrifteinzug',
      internalTransactionId: '085179a2e5fa34b0ff71b3f2c9f4876f',
      date: '2023-12-29',
    },
    {
      transactionId: '000010348081380',
      endToEndId: 'NOTPROVIDED',
      bookingDate: '2023-12-29',
      valueDate: '2023-12-29',
      transactionAmount: {
        amount: '-2.00',
        currency: 'EUR',
      },
      creditorName: 'VISA XXXXXXXXXXXXXXXXXXXX                             ',
      remittanceInformationUnstructured:
        'mandatereference:,creditorid:,remittanceinformation:NR XXXX 8987 90671935362                              KAUFUMSATZ                 94.81                      929614                     ARN54795476045598005130492 Google Pay                 ',
      proprietaryBankTransactionCode: 'Lastschrifteinzug',
      internalTransactionId: '0707bbe2de27e5aabfd5dc614c584951',
      date: '2023-12-29',
    },
    {
      transactionId: '000010348081379',
      endToEndId: 'NOTPROVIDED',
      bookingDate: '2023-12-29',
      valueDate: '2023-12-29',
      transactionAmount: {
        amount: '-6.00',
        currency: 'EUR',
      },
      creditorName: 'VISA XXXXXXXXXXXXXXXXXXXX                             ',
      remittanceInformationUnstructured:
        'mandatereference:,creditorid:,remittanceinformation:NR XXXX 2206 17679024325                              KAUFUMSATZ                 55.25                      819456                     ARN08595270353806495555431 Google Pay                 ',
      proprietaryBankTransactionCode: 'Lastschrifteinzug',
      internalTransactionId: '4b15b590652c9ebdc3f974591b15b250',
      date: '2023-12-29',
    },
    {
      transactionId: '000010348081378',
      endToEndId: 'NOTPROVIDED',
      bookingDate: '2023-12-29',
      valueDate: '2023-12-29',
      transactionAmount: {
        amount: '-12.99',
        currency: 'EUR',
      },
      creditorName: 'VISA XXXXXXXXXXXXXXXXXXXX                             ',
      remittanceInformationUnstructured:
        'mandatereference:,creditorid:,remittanceinformation:NR XXXX 9437 535-182-825 LU                           KAUFUMSATZ                 43.79                      665448                     ARN86236748928277201384604 ',
      proprietaryBankTransactionCode: 'Lastschrifteinzug',
      internalTransactionId: 'f930f8c153f3e37fb9906e4b3a2b4552',
      date: '2023-12-29',
    },
    {
      transactionId: '000010348081377',
      endToEndId: 'NOTPROVIDED',
      bookingDate: '2023-12-29',
      valueDate: '2023-12-29',
      transactionAmount: {
        amount: '-9.00',
        currency: 'EUR',
      },
      creditorName: 'VISA XXXXXXXXXXXXXXXXXXXX                             ',
      remittanceInformationUnstructured:
        'mandatereference:,creditorid:,remittanceinformation:NR XXXX 3582 98236826123                              KAUFUMSATZ                 88.90                      477561                     ARN64452564252952225664357 Google Pay                 ',
      proprietaryBankTransactionCode: 'Lastschrifteinzug',
      internalTransactionId: '1ce866282deb78cc4ff4cd108e11b8cc',
      date: '2023-12-29',
    },
    {
      transactionId: '000010347374680',
      endToEndId: '9212020-0900000070-2023121711315956',
      bookingDate: '2023-12-29',
      valueDate: '2023-12-29',
      transactionAmount: {
        amount: '2892.61',
        currency: 'EUR',
      },
      debtorName: 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
      remittanceInformationUnstructured:
        'mandatereference:,creditorid:,remittanceinformation:F22685813 Gehalt 80/6586',
      proprietaryBankTransactionCode: 'Gehalt/Rente',
      internalTransactionId: 'e731d8eb47f1ae96ccc11e1fb8b76a60',
      date: '2023-12-29',
    },
    {
      transactionId: '000010336959253',
      endToEndId: 'NOTPROVIDED',
      bookingDate: '2023-12-28',
      valueDate: '2023-12-28',
      transactionAmount: {
        amount: '-85.80',
        currency: 'EUR',
      },
      creditorName: 'VISA XXXXXXXXXXXXXXXXXXXX                             ',
      remittanceInformationUnstructured:
        'mandatereference:,creditorid:,remittanceinformation:NR XXXX 7082 FAUCOGNEY E FR                           KAUFUMSATZ                 38.20                      265113                     ARN47998616225906149245029 ',
      proprietaryBankTransactionCode: 'Lastschrifteinzug',
      internalTransactionId: '2bbc054ae7ba299482a7849fded864f3',
      date: '2023-12-28',
    },
    {
      transactionId: '000010350537843',
      endToEndId: 'NOTPROVIDED',
      bookingDate: '2023-12-29',
      valueDate: '2023-12-27',
      transactionAmount: {
        amount: '2.79',
        currency: 'EUR',
      },
      debtorName: '                                                      ',
      remittanceInformationUnstructured:
        'mandatereference:,creditorid:,remittanceinformation:                           Zins/Dividende             ISIN IE36B9RBWM04 VANG.FTSE',
      proprietaryBankTransactionCode: 'Zins / Dividende WP',
      internalTransactionId: '3bb7c58199d3fa5a44e85871d9001798',
      date: '2023-12-29',
    },
    {
      transactionId: '000010341786083',
      endToEndId: 'NOTPROVIDED',
      bookingDate: '2023-12-28',
      valueDate: '2023-12-27',
      transactionAmount: {
        amount: '79.80',
        currency: 'EUR',
      },
      debtorName: 'VISA XXXXXXXXXXXXXXXXXXXX                             ',
      remittanceInformationUnstructured:
        'mandatereference:,creditorid:,remittanceinformation:NR XXXX 4619                                          GUTSCHRIFTSBELEG           03.91                      134870                     ',
      proprietaryBankTransactionCode: 'Gutschrift',
      internalTransactionId: '5570eefb7213e39153a6c7fb97d7dc6f',
      date: '2023-12-28',
    },
    {
      transactionId: '000010328399902',
      endToEndId: 'NOTPROVIDED',
      bookingDate: '2023-12-27',
      valueDate: '2023-12-27',
      transactionAmount: {
        amount: '-10.90',
        currency: 'EUR',
      },
      debtorName: 'VISA XXXXXXXXXXXXXXXXXXXX                             ',
      remittanceInformationUnstructured:
        'mandatereference:,creditorid:,remittanceinformation:NR XXXX 3465 XXXXXXXXX                               KAUFUMSATZ                 90.40                      505416                     ARN63639757770303957985044 Google Pay                 ',
      proprietaryBankTransactionCode: 'Lastschrifteinzug',
      internalTransactionId: '1b1bf30b23afb56ba4d41b9c65cf0efa',
      date: '2023-12-27',
    },
  ];

  describe('#sortTransactions', () => {
    it('handles empty arrays', () => {
      const transactions = [];
      const sortedTransactions = IngIngddeff.sortTransactions(transactions);
      expect(sortedTransactions).toEqual([]);
    });

    it('returns empty array for undefined input', () => {
      const sortedTransactions = IngIngddeff.sortTransactions(undefined);
      expect(sortedTransactions).toEqual([]);
    });

    it('returns sorted array for unsorted inputs', () => {
      const normalizeTransactions = transactionsRaw.map((tx) =>
        IngIngddeff.normalizeTransaction(tx, true),
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
      const sortedTransactions = IngIngddeff.sortTransactions(
        normalizeTransactions,
      );
      expect(sortedTransactions).toEqual(originalOrder);
    });
  });

  describe('#countStartingBalance', () => {
    /** @type {import('../../gocardless-node.types.js').Balance[]} */
    const balances = [
      {
        balanceAmount: { amount: '3596.87', currency: 'EUR' },
        balanceType: 'interimBooked',
        lastChangeDateTime: '2023-12-29T16:44:06.479Z',
      },
    ];

    it('should calculate the starting balance correctly', () => {
      const normalizeTransactions = transactionsRaw.map((tx) =>
        IngIngddeff.normalizeTransaction(tx, true),
      );
      const sortedTransactions = IngIngddeff.sortTransactions(
        normalizeTransactions,
      );

      const startingBalance = IngIngddeff.calculateStartingBalance(
        sortedTransactions,
        balances,
      );

      expect(startingBalance).toEqual(75236);
    });

    it('returns the same balance amount when no transactions', () => {
      const transactions = [];

      expect(
        IngIngddeff.calculateStartingBalance(transactions, balances),
      ).toEqual(359687);
    });
  });
});
