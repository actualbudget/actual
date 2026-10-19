import {
  amountToInteger,
  currencyToAmount,
} from '@actual-app/core/shared/util';

import { matchCategory, parseQuickAddText } from './quickAddParser';
import type { QuickAddContext } from './quickAddParser';

const context: QuickAddContext = {
  // A Monday
  today: '2026-10-19',
  dateFormat: 'MM/dd/yyyy',
  parseAmount: text => {
    const amount = currencyToAmount(text);
    return amount == null ? null : amountToInteger(amount);
  },
  payees: [
    { id: 'payee-target', name: 'Target' },
    { id: 'payee-starbucks', name: 'Starbucks' },
    { id: 'payee-acme', name: 'Acme Corporation' },
    { id: 'payee-transfer', name: '', transfer_acct: 'account-savings' },
  ],
  categoryGroups: [
    {
      id: 'group-usual',
      name: 'Usual Expenses',
      categories: [
        { id: 'cat-groceries', name: 'Groceries' },
        { id: 'cat-rent', name: 'Rent' },
        { id: 'cat-misc-usual', name: 'Misc' },
      ],
    },
    {
      id: 'group-bills',
      name: 'Bills',
      categories: [
        { id: 'cat-power', name: 'Power' },
        { id: 'cat-misc-bills', name: 'Misc' },
      ],
    },
    {
      id: 'group-income',
      name: 'Income',
      categories: [{ id: 'cat-salary', name: 'Salary' }],
    },
  ],
};

function parse(text: string, overrides: Partial<QuickAddContext> = {}) {
  return parseQuickAddText(text, { ...context, ...overrides });
}

describe('parseQuickAddText', () => {
  it('parses "Spent $40 at Target on groceries yesterday"', () => {
    const result = parse('Spent $40 at Target on groceries yesterday');

    expect(result.amount).toMatchObject({ value: 4000, confidence: 'high' });
    expect(result.direction).toMatchObject({
      value: 'outflow',
      confidence: 'high',
    });
    expect(result.date).toMatchObject({
      value: '2026-10-18',
      confidence: 'high',
    });
    expect(result.payee).toMatchObject({
      value: { id: 'payee-target', name: 'Target' },
      confidence: 'high',
    });
    expect(result.category).toMatchObject({
      value: 'cat-groceries',
      confidence: 'high',
    });
    expect(result.isUnparsed).toBe(false);
  });

  it('parses "paid 12.50 to Starbucks" with no category or date', () => {
    const result = parse('paid 12.50 to Starbucks');

    expect(result.amount.value).toBe(1250);
    expect(result.direction.value).toBe('outflow');
    expect(result.payee.value).toEqual({
      id: 'payee-starbucks',
      name: 'Starbucks',
    });
    expect(result.category).toEqual({ value: null, confidence: 'none' });
    expect(result.date).toEqual({ value: '2026-10-19', confidence: 'low' });
  });

  it('parses "received $500 from Acme on 10/16" as an inflow', () => {
    const result = parse('received $500 from Acme on 10/16');

    expect(result.amount.value).toBe(50000);
    expect(result.direction).toMatchObject({
      value: 'inflow',
      confidence: 'high',
    });
    expect(result.date).toMatchObject({
      value: '2026-10-16',
      confidence: 'high',
    });
    // "Acme" is a close match for "Acme Corporation"
    expect(result.payee).toMatchObject({
      value: { id: 'payee-acme', name: 'Acme Corporation' },
      confidence: 'low',
    });
    expect(result.category.value).toBeNull();
  });

  it('parses "bought lunch for $18 last friday"', () => {
    const result = parse('bought lunch for $18 last friday');

    expect(result.amount.value).toBe(1800);
    expect(result.direction.value).toBe('outflow');
    expect(result.date).toMatchObject({
      value: '2026-10-16',
      confidence: 'high',
    });
    expect(result.payee.value).toBeNull();
    expect(result.category.value).toBeNull();
  });

  it('parses "1,200 rent" with no verb and no payee', () => {
    const result = parse('1,200 rent');

    expect(result.amount).toMatchObject({ value: 120000, confidence: 'high' });
    // No verb, so the direction is assumed
    expect(result.direction).toEqual({ value: 'outflow', confidence: 'low' });
    expect(result.payee).toEqual({ value: null, confidence: 'none' });
    expect(result.category.value).toBe('cat-rent');
  });

  it('returns an unparsed result for gibberish instead of throwing', () => {
    const result = parse('qwzx blorp ???');

    expect(result.isUnparsed).toBe(true);
    expect(result.amount).toEqual({ value: null, confidence: 'none' });
    expect(result.payee.value).toBeNull();
    expect(result.category.value).toBeNull();
  });

  it('returns an unparsed result for empty input', () => {
    expect(parse('   ').isUnparsed).toBe(true);
  });

  it('matches a "Group:Category" category', () => {
    const result = parse('paid 1200 to Landlord for Usual Expenses:Rent');

    expect(result.category.value).toBe('cat-rent');
    expect(result.payee).toMatchObject({
      value: { id: null, name: 'Landlord' },
      confidence: 'low',
    });
  });

  it('matches a #tag category', () => {
    expect(parse('spent 9 at Target #groceries').category.value).toBe(
      'cat-groceries',
    );
    expect(parse('spent 9 #Bills:Misc').category.value).toBe('cat-misc-bills');
  });

  it('keeps unmatched category text but leaves it uncategorized', () => {
    const result = parse('spent 5 on snacks');

    expect(result.category).toEqual({
      value: null,
      confidence: 'none',
      text: 'snacks',
    });
  });

  it('reads "for" as a category when one matches, otherwise as a payee', () => {
    expect(parse('paid 80 for power').category.value).toBe('cat-power');
    expect(parse('paid 80 for Target').payee.value).toEqual({
      id: 'payee-target',
      name: 'Target',
    });
  });

  it.each([
    ['40', 4000],
    ['$40', 4000],
    ['40.50', 4050],
    ['$1,200.75', 120075],
    ['40 dollars', 4000],
  ])('parses the amount "%s"', (text, expected) => {
    const result = parse(`spent ${text} at Target`);

    expect(result.amount.value).toBe(expected);
    expect(result.payee.value?.id).toBe('payee-target');
  });

  it.each([
    ['today', '2026-10-19'],
    ['yesterday', '2026-10-18'],
    ['2 days ago', '2026-10-17'],
    ['a week ago', '2026-10-12'],
    ['last friday', '2026-10-16'],
    ['last monday', '2026-10-12'],
    ['on 10/16', '2026-10-16'],
    ['on 10/16/2025', '2025-10-16'],
    ['Oct 16', '2026-10-16'],
    ['October 3rd 2025', '2025-10-03'],
    ['16 oct', '2026-10-16'],
    ['2026-09-30', '2026-09-30'],
  ])('parses the date "%s"', (text, expected) => {
    const result = parse(`spent $10 at Target ${text}`);

    expect(result.date).toMatchObject({ value: expected, confidence: 'high' });
    expect(result.amount.value).toBe(1000);
    expect(result.payee.value?.id).toBe('payee-target');
  });

  it('reads a date without a year as its most recent occurrence', () => {
    expect(parse('spent $5 on 12/20').date.value).toBe('2025-12-20');
    expect(parse('spent $5 Dec 20').date.value).toBe('2025-12-20');
    expect(parse('spent $5 on 10/19').date.value).toBe('2026-10-19');
    expect(parse('spent $5 on 12/20/2026').date.value).toBe('2026-12-20');
  });

  it('does not read a number before "days ago" as the amount', () => {
    const result = parse('2 days ago spent 40 at Target');

    expect(result.amount.value).toBe(4000);
    expect(result.date.value).toBe('2026-10-17');
  });

  it('reads numeric dates with the budget date format', () => {
    expect(
      parse('spent $10 on 16/10', { dateFormat: 'dd/MM/yyyy' }).date.value,
    ).toBe('2026-10-16');
  });

  it('only reads a dotted day and month as a date after "on"', () => {
    const dotted = { dateFormat: 'dd.MM.yyyy' };

    expect(parse('spent 12.05 at Target', dotted).amount.value).toBe(1205);
    expect(parse('spent 12.05 at Target', dotted).date.confidence).toBe('low');
    expect(parse('spent 7 on 12.05', dotted).date.value).toBe('2026-05-12');
  });

  it('does not read short weekday names as dates unless after "on"', () => {
    const result = parse('paid 20 to Sun Valley');

    expect(result.date.confidence).toBe('low');
    expect(result.payee.value?.name).toBe('Sun Valley');
  });

  it.each([
    ['earned', 'inflow'],
    ['got paid', 'inflow'],
    ['deposited', 'inflow'],
    ['refund', 'inflow'],
    ['charged', 'outflow'],
    ['cost', 'outflow'],
  ])('reads "%s" as %s', (verb, expected) => {
    expect(parse(`${verb} $25`).direction).toMatchObject({
      value: expected,
      confidence: 'high',
    });
  });

  it('never matches transfer payees', () => {
    expect(parse('paid 10 to Savings').payee.value).toEqual({
      id: null,
      name: 'Savings',
    });
  });
});

describe('matchCategory', () => {
  const groups = context.categoryGroups;

  it('ignores case and spaces', () => {
    expect(matchCategory('  GROCERIES ', groups)).toBe('cat-groceries');
    expect(matchCategory('usual expenses : rent', groups)).toBe('cat-rent');
  });

  it('does not guess a name used by two groups', () => {
    expect(matchCategory('Misc', groups)).toBeNull();
    expect(matchCategory('Bills:Misc', groups)).toBe('cat-misc-bills');
  });

  it('returns null when nothing matches', () => {
    expect(matchCategory('Bills:Rent', groups)).toBeNull();
    expect(matchCategory('Vacation', groups)).toBeNull();
  });
});
