import type { Conversion } from '@actual-app/core/shared/fx/convert';
import type { RateLookup } from '@actual-app/core/shared/fx/rates';
import i18next from 'i18next';

import { formatForeignAmount } from './formatCurrencyAmount';

// The English text is the translation key, so without resources i18next
// echoes it back with the values filled in
void i18next.init({
  lng: 'en',
  nsSeparator: false,
  keySeparator: false,
  interpolation: { escapeValue: false },
  resources: {
    // A language that writes the converted amount differently
    xx: {
      translation: {
        '{{original}} ({{converted}})': '{{original}} ≙ {{converted}}',
      },
    },
  },
});

afterEach(async () => {
  await i18next.changeLanguage('en');
});

// Formats like the app with the default currency shown without a symbol
function format(amount: number, currencyCode?: string) {
  const text = (amount / 100).toFixed(2);
  return currencyCode ? `${currencyCode}$${text}` : text;
}

const directRate: RateLookup = {
  rate: 1.4,
  date: '2026-10-01',
  path: 'direct',
  isFallback: false,
};

function convertedTo(amount: number, lookup: RateLookup | null) {
  return (): Conversion => ({ amount, lookup });
}

describe('formatForeignAmount', () => {
  const usd = { amount: 76003, currencyCode: 'USD', format };

  it.each([
    ['original', 'USD$760.03'],
    ['converted', '1064.04'],
    ['both', 'USD$760.03 (1064.04)'],
  ] as const)('shows the %s amount as %s', (mode, expected) => {
    expect(
      formatForeignAmount({
        ...usd,
        mode,
        convert: convertedTo(106404, directRate),
      }),
    ).toBe(expected);
  });

  it.each([
    ['counted 1:1 for lack of a rate', 76003, null, 'USD$760.03 (≈760.03)'],
    [
      'converted with a later rate',
      106404,
      { ...directRate, isFallback: true },
      'USD$760.03 (≈1064.04)',
    ],
  ])('marks amounts %s as approximate', (_reason, amount, lookup, expected) => {
    expect(
      formatForeignAmount({
        ...usd,
        mode: 'both',
        convert: convertedTo(amount, lookup),
      }),
    ).toBe(expected);
  });

  it('shows both amounts the way the language writes them', async () => {
    await i18next.changeLanguage('xx');

    expect(
      formatForeignAmount({
        ...usd,
        mode: 'both',
        convert: convertedTo(106404, directRate),
      }),
    ).toBe('USD$760.03 ≙ 1064.04');
  });

  it('does not convert when only the original is shown', () => {
    const convert = vi.fn(convertedTo(0, null));
    formatForeignAmount({ ...usd, mode: 'original', convert });
    expect(convert).not.toHaveBeenCalled();
  });
});
