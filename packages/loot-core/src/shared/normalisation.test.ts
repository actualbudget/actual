import { describe, expect, it } from 'vitest';

import { getNormalisedString } from './normalisation';

describe('getNormalisedString', () => {
  it('lowercases plain ASCII', () => {
    expect(getNormalisedString('Hello World')).toBe('hello world');
  });

  it('strips standard diacritics', () => {
    expect(getNormalisedString('café')).toBe('cafe');
    expect(getNormalisedString('naïve')).toBe('naive');
    expect(getNormalisedString('résumé')).toBe('resume');
  });

  it('matches a word with ą when searching a', () => {
    expect(getNormalisedString('Pączek')).toBe('paczek');
  });

  it('matches a word with ł when searching with l', () => {
    expect(getNormalisedString('Złoty')).toBe('zloty');
    expect(getNormalisedString('Łódź')).toBe('lodz');
  });

  it('maps ß to ss', () => {
    expect(getNormalisedString('Straße')).toBe('strasse');
    expect(getNormalisedString('STRAẞE')).toBe('strasse');
  });

  it('maps ø to o', () => {
    expect(getNormalisedString('Bjørn')).toBe('bjorn');
    expect(getNormalisedString('Øresund')).toBe('oresund');
  });

  it('maps œ to oe', () => {
    expect(getNormalisedString('Œuf')).toBe('oeuf');
    expect(getNormalisedString('œuf')).toBe('oeuf');
  });
});
