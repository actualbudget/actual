import { describe, expect, test } from 'vitest';

import { rankAutocompleteMatch } from './autocompleteRanking';

describe('rankAutocompleteMatch', () => {
  test('exact match returns -4', () => {
    expect(rankAutocompleteMatch('Me', 'me')).toBe(-4);
    expect(rankAutocompleteMatch('me', 'Me')).toBe(-4);
    expect(rankAutocompleteMatch('Groceries', 'groceries')).toBe(-4);
  });

  test('prefix match returns -3', () => {
    expect(rankAutocompleteMatch('Memory Express', 'me')).toBe(-3);
    expect(rankAutocompleteMatch('Merchant', 'me')).toBe(-3);
  });

  test('word-boundary match returns -2', () => {
    expect(rankAutocompleteMatch('French Meadow', 'me')).toBe(-2);
    expect(rankAutocompleteMatch('Self-medicate', 'me')).toBe(-2);
  });

  test('contains match returns -1', () => {
    expect(rankAutocompleteMatch('Framework', 'me')).toBe(-1);
    expect(rankAutocompleteMatch('Homestead', 'me')).toBe(-1);
    expect(rankAutocompleteMatch('Gamestop', 'me')).toBe(-1);
  });

  test('no match returns 0', () => {
    expect(rankAutocompleteMatch('Apple Store', 'me')).toBe(0);
    expect(rankAutocompleteMatch('Target', 'me')).toBe(0);
  });

  test('empty input returns 0', () => {
    expect(rankAutocompleteMatch('Anything', '')).toBe(0);
  });

  test('diacritics are normalised', () => {
    expect(rankAutocompleteMatch('Cafe', 'café')).toBe(-4);
    expect(rankAutocompleteMatch('Café', 'cafe')).toBe(-4);
    expect(rankAutocompleteMatch('Résumé', 're')).toBe(-3);
  });

  test('case insensitive', () => {
    expect(rankAutocompleteMatch('METRO', 'me')).toBe(-3);
    expect(rankAutocompleteMatch('metro', 'ME')).toBe(-3);
  });

  test('realistic payee scenario for "me"', () => {
    const payees = [
      'Me',
      'Memory Express',
      'Merchant',
      'French Meadow',
      'Self-medicate',
      'Framework',
      'Homestead',
      'Gamestop',
      'Apple Store',
      'Target',
    ];

    const ranked = payees
      .map(name => ({ name, rank: rankAutocompleteMatch(name, 'me') }))
      .sort((a, b) => a.rank - b.rank);

    // Exact match first
    expect(ranked[0]).toEqual({ name: 'Me', rank: -4 });

    // Prefix matches next
    const prefixMatches = ranked.filter(r => r.rank === -3);
    expect(prefixMatches.map(r => r.name)).toEqual(
      expect.arrayContaining(['Memory Express', 'Merchant']),
    );

    // Word-boundary matches
    const wordBoundaryMatches = ranked.filter(r => r.rank === -2);
    expect(wordBoundaryMatches.map(r => r.name)).toEqual(
      expect.arrayContaining(['French Meadow', 'Self-medicate']),
    );

    // Contains matches
    const containsMatches = ranked.filter(r => r.rank === -1);
    expect(containsMatches.map(r => r.name)).toEqual(
      expect.arrayContaining(['Framework', 'Homestead', 'Gamestop']),
    );

    // No matches
    const noMatches = ranked.filter(r => r.rank === 0);
    expect(noMatches.map(r => r.name)).toEqual(
      expect.arrayContaining(['Apple Store', 'Target']),
    );
  });

  test('single character input', () => {
    expect(rankAutocompleteMatch('A', 'a')).toBe(-4);
    expect(rankAutocompleteMatch('Apple', 'a')).toBe(-3);
    expect(rankAutocompleteMatch('Big Apple', 'a')).toBe(-2);
    expect(rankAutocompleteMatch('Banana', 'a')).toBe(-1);
  });

  test('hyphenated word boundaries', () => {
    expect(rankAutocompleteMatch('Co-op', 'op')).toBe(-2);
    expect(rankAutocompleteMatch('Self-checkout', 'check')).toBe(-2);
  });
});
