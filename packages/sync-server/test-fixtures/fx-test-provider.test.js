import request from 'supertest';

import { createExchangeRateHandlers } from '../src/app-exchange-rates';

import fixture, { __control } from './fx-test-provider/index.js';

const query = { base: 'USD', quote: 'EUR', date: '2026-03-11' };
const context = () => ({ signal: new AbortController().signal });
beforeEach(() => {
  __control.reset();
});
afterEach(() => {
  __control.reset();
  vi.useRealTimers();
});
it.each([
  ['USD', 'EUR', '2026-03-04', '0.9', '2026-03-04'],
  ['USD', 'EUR', '2026-03-11', '0.92', '2026-03-11'],
  ['USD', 'EUR', '2026-03-12', '0.921', '2026-03-11'],
  ['USD', 'EUR', '2026-03-14', '0.93', '2026-03-13'],
  ['USD', 'EUR', '2026-03-18', '0.94', '2026-03-11'],
  ['USD', 'EUR', '2026-03-19', '0.95', '2026-03-11'],
  ['USD', 'EUR', '2026-12-31', '2', '2026-12-31'],
  ['USD', 'EUR', '2027-01-07', '2.5', '2026-12-31'],
  ['USD', 'EUR', '2027-01-08', '2.5', '2026-12-31'],
  ['USD', 'JPY', '2026-03-11', '150', '2026-03-11'],
  ['JPY', 'USD', '2026-03-11', '0.006666666666667', '2026-03-11'],
  ['USD', 'JPY', '2026-03-31', '125', '2026-03-31'],
  ['USD', 'KWD', '2026-03-11', '0.307', '2026-03-11'],
])(
  'retains the exact fixed table %s/%s on %s',
  async (base, quote, date, rate, effectiveDate) => {
    expect(await fixture.lookup({ base, quote, date }, context())).toEqual({
      status: 'ok',
      base,
      quote,
      rate,
      effectiveDate,
    });
  },
);
it('provides the seven business-day outcomes and rate limit after the first', async () => {
  __control.mode = 'business-days';
  const rates = [];
  for (let day = 9; day <= 15; day++) {
    rates.push(
      await fixture.lookup(
        { ...query, date: `2026-03-${String(day).padStart(2, '0')}` },
        context(),
      ),
    );
  }
  expect(rates.map(row => row.rate)).toEqual([
    '0.909',
    '0.91',
    '0.911',
    '0.912',
    '0.913',
    '0.913',
    '0.913',
  ]);
  expect(rates.slice(-2).map(row => row.effectiveDate)).toEqual([
    '2026-03-13',
    '2026-03-13',
  ]);
  __control.reset();
  __control.mode = 'rate-limited-after-first';
  expect(await fixture.lookup(query, context())).toMatchObject({
    status: 'ok',
  });
  expect(await fixture.lookup(query, context())).toEqual({
    status: 'error',
    code: 'rate-limited',
  });
});
it('holds all dates and releases exactly the requested date', async () => {
  __control.holdAll();
  const first = fixture.lookup(query, context());
  const second = fixture.lookup({ ...query, date: '2026-03-12' }, context());
  let secondSettled = false;
  void second.then(() => {
    secondSettled = true;
  });
  __control.release('2026-03-11');
  expect(await first).toMatchObject({ status: 'ok' });
  expect(secondSettled).toBe(false);
  __control.release('2026-03-12');
  await second;
  expect(__control.calls).toEqual([query, { ...query, date: '2026-03-12' }]);
});
it('keeps the fixture outside the production binding while redacting hostile fixture modes', async () => {
  const app = createExchangeRateHandlers(fixture);
  for (const mode of [
    'throw',
    'extra-fields',
    'bad-code',
    'malformed-1',
    'malformed-2',
    'malformed-3',
    'malformed-4',
    'malformed-5',
    'malformed-6',
    'malformed-7',
    'malformed-8',
    'malformed-9',
  ]) {
    __control.mode = mode;
    const response = await request(app)
      .post('/lookup')
      .set('x-actual-token', 'valid-token')
      .send({ ...query, providerId: 'fxtest' });
    expect(response.body).toMatchObject({ status: 'ok' });
    expect(JSON.stringify(response.body)).not.toContain('SECRET123');
    if (mode === 'extra-fields') {
      expect(response.body.data.outcome).toBe('ok');
    } else {
      expect(response.body.data).toEqual({
        outcome: 'error',
        code: 'provider-error',
      });
    }
  }
});
