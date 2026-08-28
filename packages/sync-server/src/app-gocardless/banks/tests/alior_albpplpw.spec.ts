import AliorAlbpplpw from '#app-gocardless/banks/alior_albpplpw';

describe('alior_albpplpw', () => {
  describe('#normalizeTransaction', () => {
    it('takes the merchant out of remittanceInformationUnstructured on card payments', () => {
      const transaction = {
        bookingDate: '2026-01-15',
        transactionAmount: { amount: '-12.50', currency: 'PLN' },
        debtorName: 'JOHN EXAMPLE',
        debtorAccount: { iban: 'PL00000000000000000987654321' },
        remittanceInformationUnstructured:
          'Transakcja kartą debetową, Example Coffee Bar',
      };

      const normalizedTransaction = AliorAlbpplpw.normalizeTransaction(
        transaction,
        true,
      );

      expect(normalizedTransaction?.payeeName).toEqual('Example Coffee Bar');
    });

    it('does not fall back to the account holder on card payments', () => {
      const transaction = {
        bookingDate: '2026-01-16',
        transactionAmount: { amount: '-38.20', currency: 'PLN' },
        debtorName: 'JOHN EXAMPLE',
        debtorAccount: { iban: 'PL00000000000000000987654321' },
        remittanceInformationUnstructured:
          'Transakcja kartą debetową, EXAMPLE MARKET 01',
      };

      const normalizedTransaction = AliorAlbpplpw.normalizeTransaction(
        transaction,
        true,
      );

      expect(normalizedTransaction?.payeeName).toEqual('Example Market 01');
    });

    it('keeps creditorName when the bank does provide it', () => {
      const transaction = {
        bookingDate: '2026-01-17',
        transactionAmount: { amount: '-21.00', currency: 'PLN' },
        creditorName: 'EXAMPLE PHARMACY 07',
        debtorName: 'JOHN EXAMPLE',
        debtorAccount: { iban: 'PL00000000000000000987654321' },
        remittanceInformationUnstructured:
          'Transakcja kartą debetową, EXAMPLE STORE 1234',
      };

      const normalizedTransaction = AliorAlbpplpw.normalizeTransaction(
        transaction,
        true,
      );

      expect(normalizedTransaction?.payeeName).toEqual('Example Pharmacy 07');
    });

    it('leaves outgoing transfers to the default behaviour', () => {
      const transaction = {
        bookingDate: '2026-01-18',
        transactionAmount: { amount: '-500.00', currency: 'PLN' },
        debtorName: 'JOHN EXAMPLE',
        debtorAccount: { iban: 'PL00000000000000000987654321' },
        remittanceInformationUnstructured: 'Przelew wychodzący',
      };

      const normalizedTransaction = AliorAlbpplpw.normalizeTransaction(
        transaction,
        true,
      );

      expect(normalizedTransaction?.payeeName).toEqual(
        'John Example (PL00 XXX 4321)',
      );
    });

    it('leaves incoming transactions untouched', () => {
      const transaction = {
        bookingDate: '2026-01-19',
        transactionAmount: { amount: '250.00', currency: 'PLN' },
        debtorName: 'EXAMPLE COMPANY SP. Z O.O.',
        remittanceInformationUnstructured: 'Invoice 12345',
      };

      const normalizedTransaction = AliorAlbpplpw.normalizeTransaction(
        transaction,
        true,
      );

      expect(normalizedTransaction?.payeeName).toEqual(
        'Example Company Sp. Z O.O.',
      );
    });
  });
});
