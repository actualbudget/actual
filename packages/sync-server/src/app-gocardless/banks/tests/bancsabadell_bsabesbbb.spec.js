import Sabadell from '../bancsabadell_bsabesbbb.js';

describe('BancSabadell', () => {
  describe('#normalizeTransaction', () => {
    describe('returns the creditorName and debtorName from remittanceInformationUnstructuredArray', () => {
      it('debtor role - amount < 0', () => {
        const transaction = {
          transactionAmount: { amount: '-100', currency: 'EUR' },
          remittanceInformationUnstructuredArray: ['some-creditor-name'],
          internalTransactionId: 'd7dca139cf31d9',
          transactionId: '04704109322',
          bookingDate: '2022-05-01',
        };
        const normalizedTransaction = Sabadell.normalizeTransaction(
          transaction,
          true,
        );
        expect(normalizedTransaction.payeeName).toEqual('Some-Creditor-Name');
      });

      it('creditor role - amount > 0', () => {
        const transaction = {
          transactionAmount: { amount: '100', currency: 'EUR' },
          remittanceInformationUnstructuredArray: ['some-debtor-name'],
          internalTransactionId: 'd7dca139cf31d9',
          transactionId: '04704109322',
          bookingDate: '2022-05-01',
        };
        const normalizedTransaction = Sabadell.normalizeTransaction(
          transaction,
          true,
        );
        expect(normalizedTransaction.payeeName).toEqual('Some-Debtor-Name');
      });
    });

    it('extract date', () => {
      const transaction = {
        transactionAmount: { amount: '-100', currency: 'EUR' },
        remittanceInformationUnstructuredArray: ['some-creditor-name'],
        internalTransactionId: 'd7dca139cf31d9',
        transactionId: '04704109322',
        bookingDate: '2024-10-02',
        valueDate: '2024-10-05',
      };
      const normalizedTransaction = Sabadell.normalizeTransaction(
        transaction,
        true,
      );
      expect(normalizedTransaction.date).toEqual('2024-10-02');
    });
  });
});
