import KBCkredbebb from '../kbc_kredbebb.js';

describe('kbc_kredbebb', () => {
  describe('#normalizeTransaction', () => {
    it('returns the remittanceInformationUnstructured as payeeName when the amount is negative', () => {
      const transaction = {
        remittanceInformationUnstructured:
          'CARREFOUR ST GIL BE1060 BRUXELLES Betaling met Google Pay via Debit Mastercard 28-08-2024 om 19.15 uur 5127 04XX XXXX 1637 5853 98XX XXXX 2266 JOHN SMITH',
        transactionAmount: { amount: '-10.99', currency: 'EUR' },
      };
      const normalizedTransaction = KBCkredbebb.normalizeTransaction(
        transaction,
        true,
      );
      expect(normalizedTransaction.payeeName).toEqual(
        'CARREFOUR ST GIL BE1060 BRUXELLES',
      );
    });

    it('returns the debtorName as payeeName when the amount is positive', () => {
      const transaction = {
        debtorName: 'CARREFOUR ST GIL BE1060 BRUXELLES',
        remittanceInformationUnstructured:
          'CARREFOUR ST GIL BE1060 BRUXELLES Betaling met Google Pay via Debit Mastercard 28-08-2024 om 19.15 uur 5127 04XX XXXX 1637 5853 98XX XXXX 2266 JOHN SMITH',
        transactionAmount: { amount: '10.99', currency: 'EUR' },
      };
      const normalizedTransaction = KBCkredbebb.normalizeTransaction(
        transaction,
        true,
      );
      expect(normalizedTransaction.payeeName).toEqual(
        'CARREFOUR ST GIL BE1060 BRUXELLES',
      );
    });
  });
});
