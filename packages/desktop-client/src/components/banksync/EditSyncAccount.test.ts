import { describe, it, expect } from 'vitest';

import { getFields } from './EditSyncAccount';

describe('EditSyncAccount', () => {
  describe('getFields', () => {
    it('should extract fields from a single transaction', () => {
      const transactions = [
        {
          date: '2024-01-01',
          bookingDate: '2024-01-01',
          payeeName: 'Test Payee',
          notes: 'Test notes',
        },
      ];

      const fields = getFields(transactions);

      expect(fields).toHaveLength(3); // date, payee, notes

      const dateField = fields.find(f => f.actualField === 'date');
      expect(dateField?.syncFields).toContainEqual({
        field: 'date',
        example: '2024-01-01',
      });
      expect(dateField?.syncFields).toContainEqual({
        field: 'bookingDate',
        example: '2024-01-01',
      });

      const payeeField = fields.find(f => f.actualField === 'payee');
      expect(payeeField?.syncFields).toContainEqual({
        field: 'payeeName',
        example: 'Test Payee',
      });

      const notesField = fields.find(f => f.actualField === 'notes');
      expect(notesField?.syncFields).toContainEqual({
        field: 'notes',
        example: 'Test notes',
      });
    });

    it('should aggregate fields from multiple transactions', () => {
      const transactions = [
        {
          bookingDate: '2024-01-01',
          payeeName: 'Payee 1',
        },
        {
          valueDate: '2024-01-02',
          creditorName: 'Payee 2',
        },
        {
          postedDate: '2024-01-03',
          debtorName: 'Payee 3',
        },
      ];

      const fields = getFields(transactions);

      const dateField = fields.find(f => f.actualField === 'date');

      // All three date fields should be present
      expect(dateField?.syncFields.map(f => f.field)).toContain('bookingDate');
      expect(dateField?.syncFields.map(f => f.field)).toContain('valueDate');
      expect(dateField?.syncFields.map(f => f.field)).toContain('postedDate');

      const payeeField = fields.find(f => f.actualField === 'payee');

      // All three payee fields should be present
      expect(payeeField?.syncFields.map(f => f.field)).toContain('payeeName');
      expect(payeeField?.syncFields.map(f => f.field)).toContain(
        'creditorName',
      );
      expect(payeeField?.syncFields.map(f => f.field)).toContain('debtorName');
    });

    it('should use the first example value found for each field', () => {
      const transactions = [
        {
          bookingDate: '2024-01-01',
        },
        {
          bookingDate: '2024-01-02',
        },
      ];

      const fields = getFields(transactions);

      const dateField = fields.find(f => f.actualField === 'date');
      const bookingDateField = dateField?.syncFields.find(
        f => f.field === 'bookingDate',
      );

      // Should use the first value as example
      expect(bookingDateField?.example).toBe('2024-01-01');
    });

    it('should handle nested field paths', () => {
      const transactions = [
        {
          paymentData: {
            payer: {
              name: 'John Doe',
            },
          },
        },
        {
          paymentData: {
            receiver: {
              name: 'Jane Smith',
            },
          },
        },
      ];

      const fields = getFields(transactions);

      const payeeField = fields.find(f => f.actualField === 'payee');

      expect(payeeField?.syncFields.map(f => f.field)).toContain(
        'paymentData.payer.name',
      );
      expect(payeeField?.syncFields.map(f => f.field)).toContain(
        'paymentData.receiver.name',
      );

      const payerNameField = payeeField?.syncFields.find(
        f => f.field === 'paymentData.payer.name',
      );
      expect(payerNameField?.example).toBe('John Doe');
    });

    it('should handle empty transaction array', () => {
      const transactions: Array<Record<string, unknown>> = [];

      const fields = getFields(transactions);

      expect(fields).toHaveLength(3); // date, payee, notes
      expect(fields.every(f => f.syncFields.length === 0)).toBe(true);
    });

    it('should skip fields with undefined values', () => {
      const transactions = [
        {
          bookingDate: '2024-01-01',
          valueDate: undefined,
          payeeName: 'Test Payee',
        },
      ];

      const fields = getFields(transactions);

      const dateField = fields.find(f => f.actualField === 'date');

      expect(dateField?.syncFields.map(f => f.field)).toContain('bookingDate');
      expect(dateField?.syncFields.map(f => f.field)).not.toContain(
        'valueDate',
      );
    });

    it('should handle the bug scenario - valueDate missing from first transaction', () => {
      // This simulates the bug: first transaction is a pending card transaction
      // without valueDate, but second transaction has it
      const transactions = [
        {
          bookingDate: '2024-01-01',
          payeeName: 'Card Transaction (pending)',
        },
        {
          bookingDate: '2024-01-02',
          valueDate: '2024-01-03',
          payeeName: 'Regular Transaction',
        },
      ];

      const fields = getFields(transactions);

      const dateField = fields.find(f => f.actualField === 'date');

      // Both bookingDate and valueDate should be available
      expect(dateField?.syncFields.map(f => f.field)).toContain('bookingDate');
      expect(dateField?.syncFields.map(f => f.field)).toContain('valueDate');
    });
  });
});
