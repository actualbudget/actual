import AliorAlbpplpw from '#app-gocardless/banks/alior_albpplpw';

describe('alior_albpplpw', () => {
  describe('#normalizeTransaction', () => {
    it('takes the merchant out of remittanceInformationUnstructured on card payments', () => {
      const transaction = {
        bookingDate: '2026-08-15',
        transactionAmount: { amount: '-30.83', currency: 'PLN' },
        debtorName: 'JOHN EXAMPLE',
        debtorAccount: { iban: 'PL00000000000000000987654321' },
        remittanceInformationUnstructured:
          'Transakcja kartą debetową, Grycan Lodziarnie Firm',
      };

      const normalizedTransaction = AliorAlbpplpw.normalizeTransaction(
        transaction,
        true,
      );

      expect(normalizedTransaction?.payeeName).toEqual(
        'Grycan Lodziarnie Firm',
      );
    });

    it('does not fall back to the account holder on card payments', () => {
      const transaction = {
        bookingDate: '2026-08-15',
        transactionAmount: { amount: '-24.99', currency: 'PLN' },
        debtorName: 'JOHN EXAMPLE',
        debtorAccount: { iban: 'PL00000000000000000987654321' },
        remittanceInformationUnstructured:
          'Transakcja kartą debetową, PIEKARNIA EXAMPLE 0',
      };

      const normalizedTransaction = AliorAlbpplpw.normalizeTransaction(
        transaction,
        true,
      );

      expect(normalizedTransaction?.payeeName).toEqual('Piekarnia Example 0');
    });

    it('keeps creditorName when the bank does provide it', () => {
      const transaction = {
        bookingDate: '2026-07-03',
        transactionAmount: { amount: '-19.99', currency: 'PLN' },
        creditorName: 'ROSSMANN SP. Z O.O. 01',
        debtorName: 'JOHN EXAMPLE',
        debtorAccount: { iban: 'PL00000000000000000987654321' },
        remittanceInformationUnstructured:
          'Transakcja kartą debetową, ROSSMANN 1234 WARSZAWA',
      };

      const normalizedTransaction = AliorAlbpplpw.normalizeTransaction(
        transaction,
        true,
      );

      expect(normalizedTransaction?.payeeName).toEqual(
        'Rossmann Sp. Z O.O. 01',
      );
    });

    it('leaves outgoing transfers to the default behaviour', () => {
      const transaction = {
        bookingDate: '2026-08-01',
        transactionAmount: { amount: '-2000.00', currency: 'PLN' },
        debtorName: 'JOHN EXAMPLE',
        debtorAccount: { iban: 'PL00000000000000000987654321' },
        remittanceInformationUnstructured:
          'Rata spłaty pożyczki / sierpień 2026',
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
        bookingDate: '2026-08-11',
        transactionAmount: { amount: '120.00', currency: 'PLN' },
        debtorName: 'ACME Sp. z o.o.',
        remittanceInformationUnstructured: '5300119894 Z300',
      };

      const normalizedTransaction = AliorAlbpplpw.normalizeTransaction(
        transaction,
        true,
      );

      expect(normalizedTransaction?.payeeName).toEqual('Acme Sp. Z O.O.');
    });
  });
});
