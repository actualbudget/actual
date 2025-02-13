import { mockTransactionAmount } from '../../services/tests/fixtures.js';
import Abanca from '../abanca_caglesmm.js';

describe('Abanca', () => {
  describe('#normalizeTransaction', () => {
    it('returns the creditorName and debtorName as remittanceInformationStructured', () => {
      const transaction = {
        transactionId: 'non-unique-id',
        internalTransactionId: 'D202301180000003',
        transactionAmount: mockTransactionAmount,
        remittanceInformationStructured: 'some-creditor-name',
      };
      const normalizedTransaction = Abanca.normalizeTransaction(
        transaction,
        true,
      );
      expect(normalizedTransaction.creditorName).toEqual(
        transaction.remittanceInformationStructured,
      );
      expect(normalizedTransaction.debtorName).toEqual(
        transaction.remittanceInformationStructured,
      );
    });
  });
});
