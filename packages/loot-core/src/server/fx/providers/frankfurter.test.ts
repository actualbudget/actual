import {
  fetchFrankfurterCurrencies,
  fetchFrankfurterRates,
} from './frankfurter';
import type { FetchFn } from './frankfurter';

function respond(body: unknown, status = 200) {
  const fetchFn = vi.fn<FetchFn>(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }));
  return fetchFn;
}

describe('fetchFrankfurterRates', () => {
  it('asks for a date range and keeps the rates of the requested pair', async () => {
    const fetchFn = respond([
      { date: '2026-10-01', base: 'CAD', quote: 'USD', rate: 0.70345 },
      { date: '2026-10-02', base: 'CAD', quote: 'USD', rate: 0.70293 },
      { date: '2026-10-02', base: 'CAD', quote: 'COP', rate: 2325.08 },
      { date: 'yesterday', base: 'CAD', quote: 'USD', rate: 0.7 },
      { date: '2026-10-03', base: 'CAD', quote: 'USD', rate: -1 },
    ]);

    const rates = await fetchFrankfurterRates(
      {
        baseUrl: 'https://rates.example.com/',
        base: 'CAD',
        quote: 'USD',
        startDate: '2026-10-01',
        endDate: '2026-10-03',
        group: 'month',
      },
      fetchFn,
    );

    expect(fetchFn).toHaveBeenCalledWith(
      'https://rates.example.com/v2/rates?base=CAD&quotes=USD&from=2026-10-01&to=2026-10-03&group=month',
      expect.objectContaining({
        redirect: 'follow',
        signal: expect.any(AbortSignal),
      }),
    );
    expect(rates).toEqual([
      { date: '2026-10-01', rate: 0.70345 },
      { date: '2026-10-02', rate: 0.70293 },
    ]);
  });

  it('reports the message of an error response', async () => {
    await expect(
      fetchFrankfurterRates(
        {
          baseUrl: 'https://api.frankfurter.dev',
          base: 'CAD',
          quote: 'XYZ',
          startDate: '2026-10-01',
          endDate: '2026-10-03',
        },
        respond({ status: 422, message: 'invalid currency: XYZ' }, 422),
      ),
    ).rejects.toThrow('invalid currency: XYZ');
  });
});

describe('fetchFrankfurterCurrencies', () => {
  it('lists the currency codes and the days they have rates for', async () => {
    const currencies = await fetchFrankfurterCurrencies(
      'https://api.frankfurter.dev',
      respond([
        {
          iso_code: 'CAD',
          name: 'Canadian Dollar',
          start_date: '1999-01-04',
          end_date: '2026-10-23',
        },
        { iso_code: 'COP', name: 'Colombian Peso', start_date: 'unknown' },
        { name: 'No code' },
      ]),
    );
    expect([...currencies]).toEqual([
      ['CAD', { startDate: '1999-01-04', endDate: '2026-10-23' }],
      ['COP', { startDate: null, endDate: null }],
    ]);
  });

  it('rejects an unexpected answer', async () => {
    await expect(
      fetchFrankfurterCurrencies(
        'https://api.frankfurter.dev',
        respond({ unexpected: true }),
      ),
    ).rejects.toThrow('unexpected');
  });
});
