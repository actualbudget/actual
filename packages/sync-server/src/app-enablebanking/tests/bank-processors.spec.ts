import { afterEach, describe, expect, it, vi } from 'vitest';

import { DanishBankProcessor } from '../banks/danish.bank.js';
import { FallbackBankProcessor } from '../banks/fallback.bank.js';
import type { components } from '../models/enablebanking-openapi.js';

describe('Bank Processors', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('FallbackBankProcessor', () => {
    const processor = new FallbackBankProcessor();

    it('should normalize debit transaction (money out)', () => {
      const transaction: components['schemas']['Transaction'] = {
        transaction_id: 'txn-123',
        credit_debit_indicator: 'DBIT',
        status: 'BOOK',
        transaction_amount: {
          amount: '100.50',
          currency: 'USD',
        },
        creditor: {
          name: 'Coffee Shop',
        },
        debtor: {
          name: 'My Account',
        },
        remittance_information: ['Coffee purchase'],
        booking_date: '2024-01-15',
        transaction_date: '2024-01-15',
        value_date: '2024-01-15',
      };

      const normalized = processor.normalizeTransaction(transaction);

      expect(normalized.amount).toBe(-100.5);
      expect(normalized.payeeName).toBe('Coffee Shop');
      expect(normalized.notes).toBe('Coffee purchase');
      expect(normalized.date).toBe('2024-01-15');
      expect(normalized.transactionAmount).toEqual({
        amount: -100.5,
        currency: 'USD',
      });
    });

    it('should normalize credit transaction (money in)', () => {
      const transaction: components['schemas']['Transaction'] = {
        transaction_id: 'txn-456',
        credit_debit_indicator: 'CRDT',
        status: 'BOOK',
        transaction_amount: {
          amount: '500.00',
          currency: 'EUR',
        },
        creditor: {
          name: 'My Account',
        },
        debtor: {
          name: 'Employer Inc',
        },
        remittance_information: ['Salary payment'],
        booking_date: '2024-01-20',
        transaction_date: '2024-01-20',
        value_date: '2024-01-20',
      };

      const normalized = processor.normalizeTransaction(transaction);

      expect(normalized.amount).toBe(500);
      expect(normalized.payeeName).toBe('Employer Inc');
      expect(normalized.notes).toBe('Salary payment');
      expect(normalized.transactionAmount.currency).toBe('EUR');
    });

    it('should handle missing currency with warning', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn');

      const transaction: components['schemas']['Transaction'] = {
        transaction_id: 'txn-no-currency',
        credit_debit_indicator: 'DBIT',
        status: 'BOOK',
        transaction_amount: {
          amount: '50.00',
          currency: '',
        },
        creditor: {
          name: 'Shop',
        },
        booking_date: '2024-01-15',
      };

      const normalized = processor.normalizeTransaction(transaction);

      expect(normalized.transactionAmount.currency).toBe('');
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Missing currency for transaction'),
      );
    });

    it('should handle missing payee information', () => {
      const transaction: components['schemas']['Transaction'] = {
        transaction_id: 'txn-no-payee',
        credit_debit_indicator: 'DBIT',
        status: 'BOOK',
        transaction_amount: {
          amount: '25.00',
          currency: 'USD',
        },
        booking_date: '2024-01-15',
      };

      const normalized = processor.normalizeTransaction(transaction);

      expect(normalized.payeeName).toBe('');
      expect(normalized.amount).toBe(-25);
    });

    it('should handle invalid amount', () => {
      const transaction: components['schemas']['Transaction'] = {
        transaction_id: 'txn-invalid-amount',
        credit_debit_indicator: 'DBIT',
        status: 'BOOK',
        transaction_amount: {
          amount: 'invalid',
          currency: 'USD',
        },
        creditor: {
          name: 'Test',
        },
        booking_date: '2024-01-15',
      };

      const normalized = processor.normalizeTransaction(transaction);

      expect(normalized.amount).toBe(0);
    });

    it('should concatenate multiple remittance information lines', () => {
      const transaction: components['schemas']['Transaction'] = {
        transaction_id: 'txn-multi-notes',
        credit_debit_indicator: 'DBIT',
        status: 'BOOK',
        transaction_amount: {
          amount: '10.00',
          currency: 'USD',
        },
        creditor: {
          name: 'Store',
        },
        remittance_information: ['Line 1', 'Line 2', 'Line 3'],
        booking_date: '2024-01-15',
      };

      const normalized = processor.normalizeTransaction(transaction);

      expect(normalized.notes).toBe('Line 1 Line 2 Line 3');
    });

    it('should use transaction_date as priority for date field', () => {
      const transaction: components['schemas']['Transaction'] = {
        transaction_id: 'txn-dates',
        credit_debit_indicator: 'DBIT',
        status: 'BOOK',
        transaction_amount: {
          amount: '10.00',
          currency: 'USD',
        },
        creditor: {
          name: 'Test',
        },
        transaction_date: '2024-01-15',
        booking_date: '2024-01-14',
        value_date: '2024-01-16',
      };

      const normalized = processor.normalizeTransaction(transaction);

      expect(normalized.date).toBe('2024-01-15');
    });

    it('should fallback to booking_date if transaction_date missing', () => {
      const transaction: components['schemas']['Transaction'] = {
        transaction_id: 'txn-booking-date',
        credit_debit_indicator: 'DBIT',
        status: 'BOOK',
        transaction_amount: {
          amount: '10.00',
          currency: 'USD',
        },
        creditor: {
          name: 'Test',
        },
        booking_date: '2024-01-14',
        value_date: '2024-01-16',
      };

      const normalized = processor.normalizeTransaction(transaction);

      expect(normalized.date).toBe('2024-01-14');
    });

    it('should fallback to value_date if transaction_date and booking_date missing', () => {
      const transaction: components['schemas']['Transaction'] = {
        transaction_id: 'txn-value-date',
        credit_debit_indicator: 'DBIT',
        status: 'BOOK',
        transaction_amount: {
          amount: '10.00',
          currency: 'USD',
        },
        creditor: {
          name: 'Test',
        },
        value_date: '2024-01-16',
      };

      const normalized = processor.normalizeTransaction(transaction);

      expect(normalized.date).toBe('2024-01-16');
    });
  });

  describe('DanishBankProcessor', () => {
    const processor = new DanishBankProcessor();

    it('should extract payee from remittance information', () => {
      const transaction: components['schemas']['Transaction'] = {
        transaction_id: 'dk-txn-1',
        credit_debit_indicator: 'DBIT',
        status: 'BOOK',
        transaction_amount: {
          amount: '100.00',
          currency: 'DKK',
        },
        remittance_information: ['Dankort-køb Store XYZ, Copenhagen'],
        booking_date: '2024-01-15',
      };

      const normalized = processor.normalizeTransaction(transaction);

      expect(normalized.payeeName).toBe('Store XYZ');
      expect(normalized.notes).toBe('Dankort-køb Store XYZ, Copenhagen');
    });

    it('should handle missing currency for Danish banks with warning', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn');

      const transaction: components['schemas']['Transaction'] = {
        transaction_id: 'dk-txn-no-currency',
        credit_debit_indicator: 'DBIT',
        status: 'BOOK',
        transaction_amount: {
          amount: '50.00',
          currency: '',
        },
        creditor: {
          name: 'Shop',
        },
        booking_date: '2024-01-15',
      };

      const normalized = processor.normalizeTransaction(transaction);

      expect(normalized.transactionAmount.currency).toBe('');
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Missing currency for transaction'),
      );
    });

    it('should fallback to FallbackBankProcessor logic when structured info missing', () => {
      const transaction: components['schemas']['Transaction'] = {
        transaction_id: 'dk-txn-fallback',
        credit_debit_indicator: 'DBIT',
        status: 'BOOK',
        transaction_amount: {
          amount: '75.00',
          currency: 'DKK',
        },
        creditor: {
          name: 'Normal Creditor',
        },
        remittance_information: ['Standard payment'],
        booking_date: '2024-01-15',
      };

      const normalized = processor.normalizeTransaction(transaction);

      expect(normalized.payeeName).toBe('Normal Creditor');
      expect(normalized.notes).toBe('Standard payment');
      expect(normalized.amount).toBe(-75);
    });

    it('should handle complex Danish remittance patterns', () => {
      const transaction: components['schemas']['Transaction'] = {
        transaction_id: 'dk-txn-complex',
        credit_debit_indicator: 'DBIT',
        status: 'BOOK',
        transaction_amount: {
          amount: '250.00',
          currency: 'DKK',
        },
        remittance_information: ['3127 MAXI ZOO, Copenhagen Nota 12345'],
        booking_date: '2024-01-15',
      };

      const normalized = processor.normalizeTransaction(transaction);

      // Danish processor should extract "MAXI ZOO" as payee (removing store number)
      expect(normalized.payeeName).toBe('MAXI ZOO');
      expect(normalized.notes).toBe('3127 MAXI ZOO, Copenhagen Nota 12345');
    });
  });
});
