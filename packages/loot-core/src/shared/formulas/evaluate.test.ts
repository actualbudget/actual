import { describe, expect, it } from 'vitest';

import { evaluateFormula, FormulaEvaluationError } from './evaluate';

describe('evaluateFormula', () => {
  it('evaluates a constant formula', () => {
    expect(evaluateFormula('=1 + 2', {})).toBe(3);
  });

  it('evaluates named expressions', () => {
    expect(evaluateFormula('=amount * 2', { amount: 5 })).toBe(10);
    expect(evaluateFormula('=MONTH(date)', { date: '2026-03-15' })).toBe(3);
    expect(
      evaluateFormula('=IF(date > DATE(2026, 1, 1), "after", "before")', {
        date: '2026-03-15',
      }),
    ).toBe('after');
  });

  it('treats non-primitive named expression values as empty', () => {
    expect(evaluateFormula('=IF(x = "", "empty", "filled")', { x: {} })).toBe(
      'empty',
    );
  });

  it('throws when the formula does not start with =', () => {
    expect(() => evaluateFormula('1 + 2', {})).toThrow(
      'Formula must start with =',
    );
  });

  it('throws a FormulaEvaluationError with the error type for invalid formulas', () => {
    try {
      evaluateFormula('=1 +', {});
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(FormulaEvaluationError);
      expect((err as FormulaEvaluationError).formulaErrorType).toBe('ERROR');
    }
  });

  it('throws a FormulaEvaluationError for unknown functions', () => {
    try {
      evaluateFormula('=NOT_A_REAL_FUNCTION()', {});
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(FormulaEvaluationError);
      expect((err as FormulaEvaluationError).formulaErrorType).toBe('NAME');
    }
  });

  it('resolves BALANCE_OF from the prefetch context', () => {
    const prefetch = new Map<string, number>([['Checking', 123456]]);
    expect(
      evaluateFormula(
        '=BALANCE_OF("Checking")',
        {},
        { balanceOfPrefetch: prefetch },
      ),
    ).toBe(123456);
    // Unknown accounts resolve to 0
    expect(
      evaluateFormula(
        '=BALANCE_OF("Nope")',
        {},
        { balanceOfPrefetch: prefetch },
      ),
    ).toBe(0);
  });

  it('evaluates date functions against the provided date value', () => {
    expect(evaluateFormula('=DAY(date)', { date: '2026-03-15' })).toBe(15);
    expect(
      evaluateFormula('=EOMONTH(date, 1)', { date: '2026-03-15' }),
    ).toBeGreaterThan(0);
  });
});
