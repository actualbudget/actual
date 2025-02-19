import NbgEthngraaxxx from '../nbg_ethngraaxxx.js';

describe('NbgEthngraaxxx', () => {
  describe('#normalizeTransaction', () => {
    it('provides correct amount in pending transaction and removes payee prefix', () => {
      const transaction = {
        bookingDate: '2024-09-03',
        date: '2024-09-03',
        remittanceInformationUnstructured: 'ΑΓΟΡΑ testingson',
        transactionAmount: {
          amount: '100.00',
          currency: 'EUR',
        },
        valueDate: '2024-09-03',
      };

      const normalizedTransaction = NbgEthngraaxxx.normalizeTransaction(
        transaction,
        false,
      );

      expect(normalizedTransaction.transactionAmount.amount).toEqual('-100.00');
      expect(normalizedTransaction.payeeName).toEqual('Testingson');
    });
  });

  it('provides correct amount and payee in booked transaction', () => {
    const transaction = {
      transactionId: 'O244015L68IK',
      bookingDate: '2024-09-03',
      date: '2024-09-03',
      remittanceInformationUnstructured: 'testingson',
      transactionAmount: {
        amount: '-100.00',
        currency: 'EUR',
      },
      valueDate: '2024-09-03',
    };

    const normalizedTransaction = NbgEthngraaxxx.normalizeTransaction(
      transaction,
      true,
    );

    expect(normalizedTransaction.transactionAmount.amount).toEqual('-100.00');
    expect(normalizedTransaction.payeeName).toEqual('Testingson');
  });
});
