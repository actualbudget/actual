import AbnamroAbnanl2a from '../abnamro_abnanl2a.js';

describe('AbnamroAbnanl2a', () => {
  describe('#normalizeTransaction', () => {
    it('correctly extracts the payee and when not provided', () => {
      const transaction = {
        transactionId: '0123456789012345',
        bookingDate: '2023-12-11',
        valueDateTime: '2023-12-09T15:43:37.950',
        transactionAmount: {
          amount: '-10.00',
          currency: 'EUR',
        },
        remittanceInformationUnstructuredArray: [
          'BEA, Betaalpas',
          'My Payee Name,PAS123',
          'NR:123A4B, 09.12.23/15:43',
          'CITY',
        ],
      };

      const normalizedTransaction = AbnamroAbnanl2a.normalizeTransaction(
        transaction,
        false,
      );

      expect(normalizedTransaction.remittanceInformationUnstructured).toEqual(
        'BEA, Betaalpas, My Payee Name,PAS123, NR:123A4B, 09.12.23/15:43, CITY',
      );
      expect(normalizedTransaction.payeeName).toEqual('My Payee Name');
    });

    it('correctly extracts the payee for google pay', () => {
      const transaction = {
        transactionId: '0123456789012345',
        bookingDate: '2023-12-11',
        valueDateTime: '2023-12-09T15:43:37.950',
        transactionAmount: {
          amount: '-10.00',
          currency: 'EUR',
        },
        remittanceInformationUnstructuredArray: [
          'BEA, Google Pay',
          'CCV*Other payee name,PAS123',
          'NR:123A4B, 09.12.23/15:43',
          'CITY',
        ],
      };

      const normalizedTransaction = AbnamroAbnanl2a.normalizeTransaction(
        transaction,
        false,
      );

      expect(normalizedTransaction.remittanceInformationUnstructured).toEqual(
        'BEA, Google Pay, CCV*Other payee name,PAS123, NR:123A4B, 09.12.23/15:43, CITY',
      );
      expect(normalizedTransaction.payeeName).toEqual('Other Payee Name');
    });
  });
});
