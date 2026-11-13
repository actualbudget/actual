import Fineco from '#app-gocardless/banks/fineco_febiitm2xxx';
import { mockTransactionAmount } from '#app-gocardless/services/tests/fixtures';

const bookingDate = '2026-11-06';

describe('Fineco', () => {
  describe('#normalizeTransaction', () => {
    it('extracts payee from Visa payments', () => {
      const transaction = {
        bookingDate,
        remittanceInformationUnstructured:
          'ABC SRL Carta N. ***** 123 Data operazione 06/11/26',
        transactionAmount: mockTransactionAmount,
        proprietaryBankTransactionCode: 'W43-Pagamento Visa Debit',
      };

      const normalizedTransaction = Fineco.normalizeTransaction(
        transaction,
        true,
      );

      expect(normalizedTransaction?.payeeName).toEqual('ABC SRL');
      expect(normalizedTransaction?.notes).toEqual(
        transaction.remittanceInformationUnstructured,
      );
    });

    it('extracts payee from Bancomat payments', () => {
      const transaction = {
        bookingDate,
        remittanceInformationUnstructured:
          "Pag. del 06/11/26 ora 12:34 presso: ABCDEF 1234 ABC'DEF Carta N ***** 123 Num.Rif.Transazione 12345678",
        transactionAmount: mockTransactionAmount,
        proprietaryBankTransactionCode: '043-Pagamento Bancomat',
      };

      const normalizedTransaction = Fineco.normalizeTransaction(
        transaction,
        true,
      );

      expect(normalizedTransaction?.payeeName).toEqual("ABCDEF 1234 ABC'DEF");
      expect(normalizedTransaction?.notes).toEqual(
        transaction.remittanceInformationUnstructured,
      );
    });

    it('uses structured remittance as notes if present', () => {
      const transaction = {
        bookingDate,
        remittanceInformationUnstructured:
          'Data inserimento: 06/11/2026 12:34:56 Da: PHONE/VOICE P. Causale: test actual fineco bank',
        transactionAmount: mockTransactionAmount,
        remittanceInformationStructured: 'test actual fineco bank',
        proprietaryBankTransactionCode: 'V26-Bonifico Istantaneo',
      };

      const normalizedTransaction = Fineco.normalizeTransaction(
        transaction,
        true,
      );

      expect(normalizedTransaction?.notes).toEqual(
        transaction.remittanceInformationStructured,
      );
    });
  });
});
