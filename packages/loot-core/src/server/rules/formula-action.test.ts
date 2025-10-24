import { describe, it, expect } from 'vitest';

import { TransactionForRules } from '../transactions/transaction-rules';

import { Action } from './action';

describe('Formula-based rule actions', () => {
  it('should execute a simple math formula', () => {
    const action = new Action('set', 'amount', null, {});
    const transaction: Partial<TransactionForRules> = { amount: 500 };
    const result = action.executeFormulaSync('=100 + 200', transaction);

    expect(result).toBe(300);
  });

  it('should use transaction field variables', () => {
    const action = new Action('set', 'notes', null, {});
    const transaction = { amount: 5000 };
    const result = action.executeFormulaSync('=amount / 100', transaction);

    expect(result).toBe(50);
  });

  it('should support IF function with transaction fields', () => {
    const action = new Action('set', 'notes', null, {});

    const transaction1 = { amount: 1000 };
    const result1 = action.executeFormulaSync(
      '=IF(amount > 0, "Income", "Expense")',
      transaction1,
    );
    expect(result1).toBe('Income');

    const transaction2 = { amount: -1000 };
    const result2 = action.executeFormulaSync(
      '=IF(amount > 0, "Income", "Expense")',
      transaction2,
    );
    expect(result2).toBe('Expense');
  });

  it('should support UPPER string function', () => {
    const action = new Action('set', 'notes', null, {});
    const transaction = { notes: 'hello world' };
    const result = action.executeFormulaSync('=UPPER(notes)', transaction);

    expect(result).toBe('HELLO WORLD');
  });

  it('should support CONCATENATE function', () => {
    const action = new Action('set', 'notes', null, {});
    const transaction = {
      imported_payee: 'Store Name',
      notes: 'Purchase',
    };
    const result = action.executeFormulaSync(
      '=CONCATENATE(imported_payee, " - ", notes)',
      transaction,
    );

    expect(result).toBe('Store Name - Purchase');
  });

  it('should support LEFT function', () => {
    const action = new Action('set', 'notes', null, {});
    const transaction = { imported_payee: 'Store Name' };
    const result = action.executeFormulaSync(
      '=LEFT(imported_payee, 5)',
      transaction,
    );

    expect(result).toBe('Store');
  });

  it('should provide today variable', () => {
    const action = new Action('set', 'date', null, {});
    const transaction = { date: '2024-01-01' };
    const result = action.executeFormulaSync('=today', transaction);

    // Should be a date string in YYYY-MM-DD format
    expect(typeof result).toBe('string');
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should throw error for invalid formula', () => {
    const action = new Action('set', 'notes', null, {});
    const transaction = { amount: 100 };

    expect(() => {
      action.executeFormulaSync('=INVALID_FUNCTION()', transaction);
    }).toThrow();
  });

  it('should throw error for formula without = prefix', () => {
    const action = new Action('set', 'notes', null, {});
    const transaction = { amount: 100 };

    expect(() => {
      action.executeFormulaSync('amount + 100', transaction);
    }).toThrow('Formula must start with =');
  });

  it('should support balance field variable', () => {
    const action = new Action('set', 'notes', null, {});
    const transaction: Partial<TransactionForRules> = {
      balance: 1500,
      notes: 'original',
    };
    const result = action.executeFormulaSync('=balance * 2', transaction);

    expect(result).toBe(3000);
  });

  it('should execute formula and convert to number type', () => {
    const action = new Action('set', 'amount', null, {
      formula: '=500 + 250',
    });

    const transaction = { amount: 100 };
    action.exec(transaction);

    expect(transaction.amount).toBe(750);
  });

  it('should execute formula and convert to string type', () => {
    const action = new Action('set', 'notes', null, {
      formula: '=UPPER("hello")',
    });

    const transaction = { notes: 'original' };
    action.exec(transaction);

    expect(transaction.notes).toBe('HELLO');
  });

  it('should handle formula errors gracefully', () => {
    const action = new Action('set', 'notes', null, {
      formula: '=1/0', // Division by zero
    });

    const transaction = { notes: 'original' };

    // Should not throw, but keep original value on error
    expect(() => {
      action.exec(transaction);
    }).not.toThrow();

    // Original value should be preserved
    expect(transaction.notes).toBe('original');
  });

  it('should validate numeric field output', () => {
    const action = new Action('set', 'amount', null, {
      formula: '=UPPER("test")', // Returns string for numeric field
    });

    const transaction = { amount: 100 };
    action.exec(transaction);

    // Should keep original value when formula produces non-numeric result
    expect(transaction.amount).toBe(100);
  });

  it('should convert non-string results to string for text fields', () => {
    const action = new Action('set', 'notes', null, {
      formula: '=500 + 250', // Returns number
    });

    const transaction = { notes: 'original' };
    action.exec(transaction);

    // Should convert number to string
    expect(transaction.notes).toBe('750');
  });
});
