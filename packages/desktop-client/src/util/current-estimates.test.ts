import type { TFunction } from 'i18next';

import {
  convertedTotalText,
  estimateText,
  groupEstimateKey,
} from './current-estimates';

const t = ((key: string, values: Record<string, string> = {}) =>
  key.replace(/{{(\w+)}}/g, (_, name) => values[name])) as TFunction;
const formatting = {
  formatBase: (amount: number) => `$${(amount / 100).toFixed(2)}`,
  baseCurrency: 'USD',
};
const yen = { currency: 'JPY' };
const resolved = (kind: 'standing' | 'dated' | 'fetched', fallback = false) =>
  ({
    status: 'resolved',
    baseAmount: -1000,
    rate: '150',
    kind,
    source: kind === 'fetched' ? 'Frankfurter' : 'manual',
    timestamp: '2026-09-01T00:00:00.000Z',
    fallback,
  }) as const;

describe('estimate labels', () => {
  it.each([
    ['standing', false, 'manual standing rate from 2026-09-01'],
    ['dated', false, 'manual rate for 2026-09-01'],
    ['fetched', false, 'Frankfurter rate from 2026-09-01'],
    ['fetched', true, 'Frankfurter rate from 2026-09-01 (latest available)'],
  ] as const)('names a %s rate (fallback %s)', (kind, fallback, origin) => {
    expect(estimateText(t, resolved(kind, fallback), yen, formatting)).toBe(
      `≈ $-10.00 at the current rate (1 JPY = 0.00666667 USD, ${origin})`,
    );
  });

  it('shows a readable base amount for one Bitcoin', () => {
    expect(
      estimateText(
        t,
        { ...resolved('fetched'), rate: '0.00001' },
        { currency: 'BTC' },
        formatting,
      ),
    ).toContain('1 BTC = 100000 USD');
  });

  it('rounds an inverted rate instead of showing division noise', () => {
    expect(
      estimateText(
        t,
        { ...resolved('standing'), rate: '0.714286' },
        { currency: 'USD' },
        { ...formatting, baseCurrency: 'CAD' },
      ),
    ).toContain('1 USD = 1.4 CAD');
  });

  it('labels zero and unavailable estimates', () => {
    expect(
      estimateText(t, { status: 'zero', baseAmount: 0 }, yen, formatting),
    ).toBe('≈ $0.00 at the current rate (no balance)');
    expect(estimateText(t, { status: 'unavailable' }, yen, formatting)).toBe(
      'Current-rate estimate: rate unavailable',
    );
  });

  it('marks converted totals incomplete by account name', () => {
    const accounts = [
      { id: 'kwd', name: 'Dinar' },
      { id: 'eur', name: 'Euro' },
    ];
    expect(
      convertedTotalText(
        t,
        { convertedAmount: 49000, missing: [] },
        accounts,
        formatting,
      ),
    ).toBe('≈ $490.00 at current rates');
    expect(
      convertedTotalText(
        t,
        { convertedAmount: 49000, missing: ['kwd', 'eur'] },
        accounts,
        formatting,
      ),
    ).toBe(
      '≈ $490.00 at current rates, incomplete: rate unavailable for Dinar, Euro',
    );
  });

  it('maps registers to estimate groups', () => {
    expect(groupEstimateKey(undefined)).toBe('all');
    expect(groupEstimateKey('onbudget')).toBe('onBudget');
    expect(groupEstimateKey('offbudget')).toBe('offBudget');
    expect(groupEstimateKey('uncategorized')).toBeNull();
  });
});
