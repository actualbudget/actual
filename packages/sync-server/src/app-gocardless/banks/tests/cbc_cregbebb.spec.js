import CBCcregbebb from '../cbc_cregbebb.js';

describe('cbc_cregbebb', () => {
  describe('#normalizeTransaction', () => {
    it('returns the remittanceInformationUnstructured as payeeName when the amount is negative', () => {
      const transaction = {
        remittanceInformationUnstructured:
          'ONKART FR Viry Paiement Maestro par Carte de débit CBC 05-09-2024 à 15.43 heures 6703 19XX XXXX X201 5 JOHN DOE',
        transactionAmount: { amount: '-45.00', currency: 'EUR' },
      };
      const normalizedTransaction = CBCcregbebb.normalizeTransaction(
        transaction,
        true,
      );
      expect(normalizedTransaction.payeeName).toEqual('ONKART FR Viry');
    });

    it('returns the debtorName as payeeName when the amount is positive', () => {
      const transaction = {
        debtorName: 'ONKART FR Viry',
        remittanceInformationUnstructured:
          'ONKART FR Viry Paiement Maestro par Carte de débit CBC 05-09-2024 à 15.43 heures 6703 19XX XXXX X201 5 JOHN DOE',
        transactionAmount: { amount: '10.99', currency: 'EUR' },
      };
      const normalizedTransaction = CBCcregbebb.normalizeTransaction(
        transaction,
        true,
      );
      expect(normalizedTransaction.payeeName).toEqual('ONKART FR Viry');
    });
  });
});
