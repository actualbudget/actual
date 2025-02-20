import Fortuneo from '../fortuneo_ftnofrp1xxx.js';

describe('Fortuneo', () => {
  describe('#normalizeTransaction', () => {
    const transactionsRaw = [
      {
        bookingDate: '2024-07-05',
        valueDate: '2024-07-05',
        transactionAmount: {
          amount: '-12.0',
          currency: 'EUR',
        },
        remittanceInformationUnstructuredArray: ['PRLV ONG'],
        internalTransactionId: '674323725470140d5caaf7b85a135817',
        date: '2024-07-05',
      },
      {
        bookingDate: '2024-07-04',
        valueDate: '2024-07-04',
        transactionAmount: {
          amount: '-7.72',
          currency: 'EUR',
        },
        remittanceInformationUnstructuredArray: [
          'PRLV PRIXTEL  SCOR/53766825A',
        ],
        internalTransactionId: 'e8365f68077f2be249f8dfa9183296e4',
        date: '2024-07-04',
      },
      {
        bookingDate: '2024-07-04',
        valueDate: '2024-07-04',
        transactionAmount: {
          amount: '-500.0',
          currency: 'EUR',
        },
        remittanceInformationUnstructuredArray: ['VIR XXXYYYYZZZ'],
        internalTransactionId: '0c12be495b71a63d14e46c43bfcb12f6',
        date: '2024-07-04',
      },
      {
        bookingDate: '2024-07-04',
        valueDate: '2024-07-04',
        transactionAmount: {
          amount: '-10.49',
          currency: 'EUR',
        },
        remittanceInformationUnstructuredArray: [
          'CARTE 04/07 Google Payment I Dublin',
        ],
        internalTransactionId: 'b09df9be4711cb06bdd2a53aef5423cc',
        date: '2024-07-04',
      },
      {
        bookingDate: '2024-07-04',
        valueDate: '2024-07-04',
        transactionAmount: {
          amount: '-6.38',
          currency: 'EUR',
        },
        remittanceInformationUnstructuredArray: ['CARTE 03/07 SPORT MARKET'],
        internalTransactionId: '67552cc7782c742f1df8297e614470ea',
        date: '2024-07-04',
      },
      {
        bookingDate: '2024-07-04',
        valueDate: '2024-07-04',
        transactionAmount: {
          amount: '26.52',
          currency: 'EUR',
        },
        remittanceInformationUnstructuredArray: [
          'ANN CARTE WEEZEVENT SOMEPLACE',
        ],
        internalTransactionId: 'c0bed1b61806bd45fd07732e5dfb1f11',
        date: '2024-07-04',
      },
      {
        bookingDate: '2024-07-03',
        valueDate: '2024-07-03',
        transactionAmount: {
          amount: '-104.9',
          currency: 'EUR',
        },
        remittanceInformationUnstructuredArray: [
          "CARTE 02/07 HPY*L'APPAC - Sport JANDA",
        ],
        internalTransactionId: '7716b23b56cda848efd788a0d8c79d12',
        date: '2024-07-03',
      },
      {
        bookingDate: '2024-07-03',
        valueDate: '2024-07-02',
        transactionAmount: {
          amount: '-22.95',
          currency: 'EUR',
        },
        remittanceInformationUnstructuredArray: [
          'VIR INST Leclerc XXXX  Leclerc XXXX  44321IXCRT211141232',
        ],
        internalTransactionId: 'e75304593c9557f20014904f90eb23a2',
        date: '2024-07-03',
      },
      {
        bookingDate: '2024-07-02',
        valueDate: '2024-07-02',
        transactionAmount: {
          amount: '-8.9',
          currency: 'EUR',
        },
        remittanceInformationUnstructuredArray: ['CARTE 01/07 CHIK CHAK'],
        internalTransactionId: 'e9811e50c8d7453c459f4e42453cf07c',
        date: '2024-07-02',
      },
      {
        bookingDate: '2024-07-02',
        valueDate: '2024-07-02',
        transactionAmount: {
          amount: '-8.0',
          currency: 'EUR',
        },
        remittanceInformationUnstructuredArray: [
          'CARTE 01/07 SERVICE 1228 GENEV 8,00 EUR',
        ],
        internalTransactionId: '354a49232bd05de583a3d2ab834e20cd',
        date: '2024-07-02',
      },
    ];

    it('sets debtor and creditor name according to amount', () => {
      const creditorTransaction = transactionsRaw[0];
      const debtorTransaction = transactionsRaw[5];

      const normalizedCreditorTransaction = Fortuneo.normalizeTransaction(
        creditorTransaction,
        true,
      );
      const normalizedDebtorTransaction = Fortuneo.normalizeTransaction(
        debtorTransaction,
        true,
      );

      expect(normalizedCreditorTransaction.payeeName).toBeDefined();
      expect(
        parseFloat(normalizedCreditorTransaction.transactionAmount.amount),
      ).toBeLessThan(0);

      expect(normalizedDebtorTransaction.payeeName).toBeDefined();
      expect(
        parseFloat(normalizedDebtorTransaction.transactionAmount.amount),
      ).toBeGreaterThan(0);
    });

    it('extracts payee name from remittanceInformationUnstructured', () => {
      const transaction0 = transactionsRaw[0];
      const normalizedTransaction = Fortuneo.normalizeTransaction(
        transaction0,
        true,
      );

      expect(normalizedTransaction.payeeName).toBe('Ong');

      const transaction2 = transactionsRaw[2];
      const normalizedTransaction2 = Fortuneo.normalizeTransaction(
        transaction2,
        true,
      );

      expect(normalizedTransaction2.payeeName).toBe('Xxxyyyyzzz');

      const transaction3 = transactionsRaw[3];
      const normalizedTransaction3 = Fortuneo.normalizeTransaction(
        transaction3,
        true,
      );

      expect(normalizedTransaction3.payeeName).toBe('Google Payment I Dublin');

      const transaction4 = transactionsRaw[4];
      const normalizedTransaction4 = Fortuneo.normalizeTransaction(
        transaction4,
        true,
      );

      expect(normalizedTransaction4.payeeName).toBe('Sport Market');

      const transaction5 = transactionsRaw[5];
      const normalizedTransaction5 = Fortuneo.normalizeTransaction(
        transaction5,
        true,
      );

      expect(normalizedTransaction5.payeeName).toBe('Weezevent Someplace');

      const transaction7 = transactionsRaw[7];
      const normalizedTransaction7 = Fortuneo.normalizeTransaction(
        transaction7,
        true,
      );

      expect(normalizedTransaction7.payeeName).toBe(
        'Leclerc Xxxx  Leclerc Xxxx  44321ixcrt211141232',
      );
    });
  });
});
