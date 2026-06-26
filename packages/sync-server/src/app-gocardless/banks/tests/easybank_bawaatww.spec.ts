import EasybankBawaatww from '#app-gocardless/banks/easybank_bawaatww';

describe('easybank', () => {
  const mockNegativeTransactionAmount = { amount: '-100', currency: 'EUR' };
  describe('#normalizeTransaction', () => {
    it('returns the expected payeeName from a transaction with a set creditorName', () => {
      const transaction = {
        creditorName: 'Some Payee Name',
        transactionAmount: mockNegativeTransactionAmount,
        bookingDate: '2024-01-01',
        creditorAccount: 'AT611904300234573201',
        debtorAccount: { iban: 'AT611904300234573202' },
      };

      const normalizedTransaction = EasybankBawaatww.normalizeTransaction(
        transaction,
        true,
      );

      expect(normalizedTransaction?.payeeName).toEqual('Some Payee Name');
    });

    it('returns the expected payeeName from a transaction with payee name inside structuredInformation', () => {
      const transaction = {
        payeeName: '',
        transactionAmount: mockNegativeTransactionAmount,
        remittanceInformationStructured:
          'Bezahlung Karte MC/000001234POS 1234 K001 12.12. 23:59SOME PAYEE NAME\\\\LOCATION\\1',
        bookingDate: '2023-12-31',
        debtorAccount: { iban: 'AT611904300234573202' },
      };
      const normalizedTransaction = EasybankBawaatww.normalizeTransaction(
        transaction,
        true,
      );
      expect(normalizedTransaction?.payeeName).toEqual('Some Payee Name');
    });

    it('returns the full structured information as payeeName from a transaction with no payee name', () => {
      const transaction = {
        payeeName: '',
        transactionAmount: mockNegativeTransactionAmount,
        remittanceInformationStructured:
          'Auszahlung Karte MC/000001234AUTOMAT 00012345 K001 31.12. 23:59',
        bookingDate: '2023-12-31',
        debtorAccount: { iban: 'AT611904300234573202' },
      };
      const normalizedTransaction = EasybankBawaatww.normalizeTransaction(
        transaction,
        true,
      );
      expect(normalizedTransaction?.payeeName).toEqual(
        'Auszahlung Karte MC/000001234AUTOMAT 00012345 K001 31.12. 23:59',
      );
    });
  });
});
