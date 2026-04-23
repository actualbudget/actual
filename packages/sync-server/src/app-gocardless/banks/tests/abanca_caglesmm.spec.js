import Abanca from '#app-gocardless/banks/abanca_caglesmm';
import { mockTransactionAmount } from '#app-gocardless/services/tests/fixtures';

describe('Abanca', () => {
  describe('#normalizeTransaction', () => {
    it('returns the creditorName and debtorName as remittanceInformationStructured', () => {
      const transaction = {
        transactionId: 'non-unique-id',
        internalTransactionId: 'D202301180000003',
        transactionAmount: mockTransactionAmount,
        remittanceInformationStructured: 'some-creditor-name',
        date: new Date().toISOString(),
      };
      const normalizedTransaction = Abanca.normalizeTransaction(
        transaction,
        true,
      );
      expect(normalizedTransaction.payeeName).toEqual('Some-Creditor-Name');
    });
  });
});
