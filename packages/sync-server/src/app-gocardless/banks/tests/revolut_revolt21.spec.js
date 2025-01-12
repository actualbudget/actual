import RevolutRevolt21 from '../revolut_revolt21.js';

describe('RevolutRevolt21', () => {
  describe('#normalizeTransaction', () => {
    it('returns the expected remittanceInformationUnstructured from a bizum expense transfer', () => {
      const transaction = {
        transactionAmount: { amount: '-1.00', currency: 'EUR' },
        remittanceInformationUnstructuredArray: [
          'Bizum payment to: CREDITOR NAME',
          'Bizum description',
        ],
        bookingDate: '2024-09-21',
      };

      const normalizedTransaction = RevolutRevolt21.normalizeTransaction(
        transaction,
        true,
      );

      expect(normalizedTransaction.remittanceInformationUnstructured).toEqual(
        'Bizum description',
      );
    });
  });

  it('returns the expected payeeName and remittanceInformationUnstructured from a bizum income transfer', () => {
    const transaction = {
      transactionAmount: { amount: '1.00', currency: 'EUR' },
      remittanceInformationUnstructuredArray: [
        'Bizum payment from: DEBTOR NAME',
        'Bizum description',
      ],
      bookingDate: '2024-09-21',
    };

    const normalizedTransaction = RevolutRevolt21.normalizeTransaction(
      transaction,
      true,
    );

    expect(normalizedTransaction.payeeName).toEqual('DEBTOR NAME');
    expect(normalizedTransaction.remittanceInformationUnstructured).toEqual(
      'Bizum description',
    );
  });
});
