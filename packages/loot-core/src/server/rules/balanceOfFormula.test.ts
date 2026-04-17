import { describe, expect, it } from 'vitest';

import type * as db from '#server/db';

import {
  decodeBalanceOfQuotedLiteral,
  extractBalanceOfLiterals,
  resolveAccountIdForBalanceOf,
} from './balanceOfFormula';

describe('balanceOfFormula', () => {
  it('extractBalanceOfLiterals returns distinct decoded literals', () => {
    expect(
      extractBalanceOfLiterals(
        '=BALANCE_OF("Checking") + BALANCE_OF("Checking")',
      ),
    ).toEqual(['Checking']);
    expect(extractBalanceOfLiterals('=balance_of("Savings")')).toEqual([
      'Savings',
    ]);
  });

  it('decodeBalanceOfQuotedLiteral unescapes quotes and backslashes', () => {
    expect(decodeBalanceOfQuotedLiteral(String.raw`\"x\"`)).toBe('"x"');
  });

  it('resolveAccountIdForBalanceOf prefers map key then name', () => {
    const id = 'acc-1';
    const a1: db.DbAccount = {
      id,
      name: 'Dup',
      offbudget: 0,
    } as db.DbAccount;
    const a2: db.DbAccount = {
      id: 'acc-2',
      name: 'Other',
      offbudget: 0,
    } as db.DbAccount;
    const map = new Map<string, db.DbAccount>([
      [id, a1],
      ['acc-2', a2],
    ]);
    expect(resolveAccountIdForBalanceOf(id, map)).toBe(id);
    expect(resolveAccountIdForBalanceOf('Other', map)).toBe('acc-2');
    expect(resolveAccountIdForBalanceOf('Nope', map)).toBe(null);
  });
});
