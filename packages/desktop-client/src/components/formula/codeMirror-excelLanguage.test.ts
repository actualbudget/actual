import { describe, expect, it } from 'vitest';

import { getFormulaStringCompletionEdit } from './codeMirror-excelLanguage';

describe('getFormulaStringCompletionEdit', () => {
  it('completes formula string values with or without existing quotes', () => {
    expect(
      getFormulaStringCompletionEdit({
        value: 'spent',
        hasOpeningQuote: false,
        hasClosingQuote: false,
      }),
    ).toEqual({ text: '"spent"', offsetClosingQuote: 0 });

    expect(
      getFormulaStringCompletionEdit({
        value: 'spent',
        hasOpeningQuote: true,
        hasClosingQuote: false,
      }),
    ).toEqual({ text: 'spent"', offsetClosingQuote: 0 });

    expect(
      getFormulaStringCompletionEdit({
        value: 'spent',
        hasOpeningQuote: true,
        hasClosingQuote: true,
      }),
    ).toEqual({ text: 'spent"', offsetClosingQuote: 1 });
  });
});
