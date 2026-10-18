import { handlers } from '#server/main';
import {
  getSqlDefaultCurrencyCode,
  isSqlConversionEnabled,
  setSqlConversionState,
} from '#shared/fx/sql';

beforeEach(() => {
  return global.emptyDatabase()();
});

describe('close-budget', () => {
  it('forgets the exchange rates and currency settings', async () => {
    setSqlConversionState({
      enabled: true,
      defaultCurrencyCode: 'CAD',
      rateMode: 'historical',
      rates: [],
    });

    await handlers['close-budget']();

    expect(isSqlConversionEnabled()).toBe(false);
    expect(getSqlDefaultCurrencyCode()).toBe('');
  });
});
