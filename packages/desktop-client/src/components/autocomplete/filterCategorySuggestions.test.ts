import { describe, expect, it } from 'vitest';

import { filterCategorySuggestions } from './filterCategorySuggestions';

const savings = { name: 'Savings' };
const food = { name: 'Food' };
const bills = { name: 'Bills' };

const suggestions = [
  { id: '1', name: 'Emergency Fund', group: savings },
  { id: '2', name: 'Home Repairs', group: savings },
  { id: '3', name: 'Savings Goals', group: savings },
  { id: '4', name: 'New Car', group: savings },
  { id: '5', name: 'Holidays', group: savings },
  { id: '6', name: 'Groceries', group: food },
  { id: '7', name: 'Restaurants', group: food },
  { id: '8', name: 'Electric', group: bills },
];

function names(items: Array<{ name: string }>): string[] {
  return items.map(item => item.name);
}

describe('filterCategorySuggestions', () => {
  it('ranks category name matches above group-only matches', () => {
    const result = filterCategorySuggestions(suggestions, 'sav');

    expect(names(result)[0]).toBe('Savings Goals');
  });

  it('still includes categories whose group name matches', () => {
    const result = filterCategorySuggestions(suggestions, 'sav');

    expect(names(result)).toEqual([
      'Savings Goals',
      'Emergency Fund',
      'Home Repairs',
      'New Car',
      'Holidays',
    ]);
  });

  it('matches queries spanning group and category name', () => {
    const result = filterCategorySuggestions(suggestions, 'food gro');

    expect(names(result)).toEqual(['Groceries']);
  });

  it('matches case-insensitively', () => {
    const result = filterCategorySuggestions(suggestions, 'GROC');

    expect(names(result)).toEqual(['Groceries']);
  });

  it('returns all suggestions when the value is empty', () => {
    expect(filterCategorySuggestions(suggestions, '')).toEqual(suggestions);
  });

  it('returns no suggestions when nothing matches', () => {
    expect(filterCategorySuggestions(suggestions, 'zzz')).toEqual([]);
  });

  it('keeps the split option pinned to the top', () => {
    const withSplit = [{ id: 'split', name: '' }, ...suggestions];
    const result = filterCategorySuggestions(withSplit, 'sav');

    expect(result[0].id).toBe('split');
    expect(names(result.slice(1))[0]).toBe('Savings Goals');
  });
});
