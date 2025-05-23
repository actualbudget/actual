import { mockTransactionAmount } from '../../services/tests/fixtures.js';
import RaiffeisenAtRzbaatww from '../raiffeisen_at_rzbaatww.js';

describe('raiffeisen_at', () => {
  describe('#normalizeTransaction', () => {
    it('returns the full structured information as payeeName from a transaction with no payee name', () => {
      const transaction = {
        transactionId: '10_2025-01-01_0123456789',
        bookingDate: '2025-01-01',
        valueDate: '2025-01-01',
        transactionAmount: mockTransactionAmount,
        remittanceInformationStructured: 'NOTHING STRUCTURED',
        internalTransactionId: '01234567890123456789',
      };

      const normalizedTransaction = RaiffeisenAtRzbaatww.normalizeTransaction(
        transaction,
        true,
      );

      expect(normalizedTransaction.payeeName).toEqual('NOTHING STRUCTURED');
    });

    it('returns the expected payeeName from a transaction with payee name inside structuredInformation', () => {
      const transaction = {
        transactionId: '10_2025-01-01_0123456789',
        bookingDate: '2025-01-01',
        valueDate: '2025-01-01',
        transactionAmount: mockTransactionAmount,
        remittanceInformationStructured: 'COMPANY ABCD 2610  D5   01.01. 13:37',
        internalTransactionId: '01234567890123456789',
      };

      const normalizedTransaction = RaiffeisenAtRzbaatww.normalizeTransaction(
        transaction,
        true,
      );

      expect(normalizedTransaction.payeeName).toEqual('Company Abcd');
    });

    it('returns the creditorName for transactions containing one', () => {
      const transaction = {
        transactionId: '18_2025-01-01_0123456789',
        bookingDate: '2025-01-01',
        valueDate: '2025-01-01',
        transactionAmount: mockTransactionAmount,
        creditorName: 'Reci Pient',
        creditorAccount: {
          iban: 'AT201100021493538935',
        },
        remittanceInformationStructured: 'just some text here',
        additionalInformation: 'more info',
        internalTransactionId: '01234567890123456789',
      };
      const normalizedTransaction = RaiffeisenAtRzbaatww.normalizeTransaction(
        transaction,
        true,
      );
      expect(normalizedTransaction.payeeName).toEqual(
        'Reci Pient (AT20 XXX 8935)',
      );
    });

    it('returns the unstructured information for POS transactions without payee name or useful structured information', () => {
      const transaction = {
        transactionId: '18_2025-01-01_0123456789',
        bookingDate: '2025-01-01',
        valueDate: '2025-01-01',
        transactionAmount: mockTransactionAmount,
        remittanceInformationUnstructured: 'COMPANY NAME CITY 1010',
        remittanceInformationStructured:
          'POS           1,11 AT  D4   01.01. 13:37',
        internalTransactionId: '01234567890123456789',
      };
      const normalizedTransaction = RaiffeisenAtRzbaatww.normalizeTransaction(
        transaction,
        true,
      );
      expect(normalizedTransaction.payeeName).toEqual('Company Name City 1010');
    });

    it('returns the endToEndId in notes if no structured or unstructured remittance information is present', () => {
      const transaction = {
        transactionId: '18_2025-01-01_0123456789',
        bookingDate: '2025-01-01',
        valueDate: '2025-01-01',
        transactionAmount: mockTransactionAmount,
        creditorName: 'Creditor',
        endToEndId: 'Transaction 1234',
        internalTransactionId: '01234567890123456789',
      };
      const normalizedTransaction = RaiffeisenAtRzbaatww.normalizeTransaction(
        transaction,
        true,
      );
      expect(normalizedTransaction.notes).toEqual('Transaction 1234');
    });
  });
});
