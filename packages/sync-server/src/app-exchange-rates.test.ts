import request from 'supertest';

import { createExchangeRateHandlers } from './app-exchange-rates';
import type { RateProviderPlugin } from './app-exchange-rates';

const lookup = vi.fn<RateProviderPlugin['lookup']>();
const provider = {
  apiVersion: 1,
  id: 'fxtest',
  name: 'Test rates',
  version: '1.0.0',
  origins: ['https://rates.invalid'],
  fields: [],
  lookup,
} satisfies RateProviderPlugin;
const query = {
  providerId: 'fxtest',
  base: 'USD',
  quote: 'EUR',
  date: '2026-03-10',
};
const answer = {
  status: 'ok',
  base: 'USD',
  quote: 'EUR',
  rate: '0.92',
  effectiveDate: '2026-03-10',
} as const;

beforeEach(() => {
  lookup.mockReset();
});
afterEach(() => vi.useRealTimers());

describe('direct exchange-rate routes', () => {
  it.each(['/providers', '/lookup'])(
    'redacts malformed JSON on %s before Express handles an exception',
    async path => {
      const logged = vi
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
      onTestFinished(() => {
        logged.mockRestore();
      });
      const response = await request(createExchangeRateHandlers(provider))
        .post(path)
        .set('Content-Type', 'application/json')
        .set('x-actual-token', 'valid-token')
        .send('{"token":"SECRET_JSON_BODY",');
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        status: 'error',
        reason: 'invalid-request',
      });
      expect(response.text).not.toContain('SECRET_JSON_BODY');
      expect(JSON.stringify(logged.mock.calls)).not.toContain(
        'SECRET_JSON_BODY',
      );
      expect(lookup).not.toHaveBeenCalled();
    },
  );
  it('ships with no provider and answers readiness without configuration', async () => {
    const app = createExchangeRateHandlers(null);
    const list = await request(app)
      .post('/providers')
      .set('x-actual-token', 'valid-token')
      .send({});
    expect(list.body).toEqual({ status: 'ok', data: { providers: [] } });
    const result = await request(app)
      .post('/lookup')
      .set('x-actual-token', 'valid-token')
      .send(query);
    expect(result.body).toEqual({
      status: 'ok',
      data: { outcome: 'error', code: 'not-installed' },
    });
  });

  it.each(['/providers', '/lookup'])(
    'authenticates %s from the header only',
    async path => {
      const app = createExchangeRateHandlers(provider);
      expect((await request(app).post(path).send(query)).status).toBe(401);
      for (const token of ['valid-token', '', null]) {
        const rejected = await request(app)
          .post(path)
          .set('x-actual-token', 'valid-token')
          .send({ ...query, token });
        expect(rejected.status).toBe(400);
        expect(rejected.body).toEqual({
          status: 'error',
          reason: 'invalid-request',
        });
      }
      expect(lookup).not.toHaveBeenCalled();
    },
  );

  it('projects metadata and returns only the one direct provider', async () => {
    const app = createExchangeRateHandlers({
      ...provider,
      ...{ debug: 'SECRET123' },
    });
    const result = await request(app)
      .post('/providers')
      .set('x-actual-token', 'valid-token')
      .send({});
    expect(result.body).toEqual({
      status: 'ok',
      data: {
        providers: [
          {
            id: 'fxtest',
            name: 'Test rates',
            version: '1.0.0',
            origins: ['https://rates.invalid'],
            fields: [],
          },
        ],
      },
    });
  });

  it.each([
    { ...query, base: 'usd' },
    { ...query, quote: 'USD' },
    { ...query, quote: 'EURO' },
    { ...query, date: '2026-02-30' },
    { ...query, date: '2026-3-10' },
  ])(
    'rejects an invalid lookup before calling the provider: %j',
    async input => {
      const result = await request(createExchangeRateHandlers(provider))
        .post('/lookup')
        .set('x-actual-token', 'valid-token')
        .send(input);
      expect(result.status).toBe(400);
      expect(result.body).toEqual({
        status: 'error',
        reason: 'invalid-request',
      });
      expect(lookup).not.toHaveBeenCalled();
    },
  );

  it('passes an abort signal and projects an exact decimal answer', async () => {
    lookup.mockResolvedValue({
      ...answer,
      rate: '0.123456789012345',
      ...{ debug: 'SECRET123' },
    });
    const result = await request(createExchangeRateHandlers(provider))
      .post('/lookup')
      .set('x-actual-token', 'valid-token')
      .send(query);
    expect(result.body).toEqual({
      status: 'ok',
      data: {
        outcome: 'ok',
        plugin: { id: 'fxtest', version: '1.0.0' },
        base: 'USD',
        quote: 'EUR',
        rate: '0.123456789012345',
        effectiveDate: '2026-03-10',
      },
    });
    expect(lookup).toHaveBeenCalledWith(
      { base: 'USD', quote: 'EUR', date: '2026-03-10' },
      { config: {}, signal: expect.any(AbortSignal) },
    );
  });

  it.each([
    { ...answer, rate: '0' },
    { ...answer, rate: '1e-4' },
    { ...answer, rate: '0.9200' },
    { ...answer, rate: '0.1234567890123456' },
    { ...answer, base: 'JPY' },
    { ...answer, effectiveDate: '2026-03-11' },
    { ...answer, effectiveDate: '2026-02-30' },
  ])(
    'rejects malformed provider data without echoing it: %j',
    async invalid => {
      lookup.mockResolvedValue(invalid);
      const result = await request(createExchangeRateHandlers(provider))
        .post('/lookup')
        .set('x-actual-token', 'valid-token')
        .send(query);
      expect(result.body).toEqual({
        status: 'ok',
        data: { outcome: 'error', code: 'provider-error' },
      });
    },
  );

  it('maps an untrusted exception to a fixed safe code', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    onTestFinished(() => log.mockRestore());
    lookup.mockRejectedValue(
      new Error('401 https://rates.invalid/x?app_id=SECRET123'),
    );
    const result = await request(createExchangeRateHandlers(provider))
      .post('/lookup')
      .set('x-actual-token', 'valid-token')
      .send(query);
    expect(result.body).toEqual({
      status: 'ok',
      data: { outcome: 'error', code: 'provider-error' },
    });
    expect(JSON.stringify(log.mock.calls)).not.toContain('SECRET123');
  });

  it.each(['auth', 'rate-limited', 'unavailable'] as const)(
    'keeps the fixed %s outcome',
    async code => {
      lookup.mockResolvedValue({ status: 'error', code });
      const result = await request(createExchangeRateHandlers(provider))
        .post('/lookup')
        .set('x-actual-token', 'valid-token')
        .send(query);
      expect(result.body).toEqual({
        status: 'ok',
        data: { outcome: 'error', code },
      });
    },
  );

  it('keeps a missing result distinct from a provider failure', async () => {
    lookup.mockResolvedValue({ status: 'missing' });
    const result = await request(createExchangeRateHandlers(provider))
      .post('/lookup')
      .set('x-actual-token', 'valid-token')
      .send(query);
    expect(result.body).toEqual({
      status: 'ok',
      data: { outcome: 'missing', plugin: { id: 'fxtest', version: '1.0.0' } },
    });
  });

  it.each(['resolve', 'reject'] as const)(
    'aborts at 15 seconds and absorbs a late %s',
    async late => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
      let started: () => void = () => undefined;
      const ready = new Promise<void>(resolve => {
        started = resolve;
      });
      let release: (value: typeof answer) => void = () => undefined;
      let reject: (error: Error) => void = () => undefined;
      const held = new Promise<typeof answer>((resolve, fail) => {
        release = resolve;
        reject = fail;
      });
      const signals: AbortSignal[] = [];
      lookup.mockImplementation((_request, context) => {
        signals.push(context.signal);
        started();
        return held;
      });
      let completed = false;
      const pending = request(createExchangeRateHandlers(provider))
        .post('/lookup')
        .set('x-actual-token', 'valid-token')
        .send(query)
        .then(result => {
          completed = true;
          return result;
        });
      await ready;
      await vi.advanceTimersByTimeAsync(14999);
      expect(completed).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      const result = await pending;
      expect(result.body).toEqual({
        status: 'ok',
        data: { outcome: 'error', code: 'timeout' },
      });
      expect(signals[0].aborted).toBe(true);
      if (late === 'resolve') release(answer);
      else reject(new Error('SECRET123'));
      await Promise.resolve();
      expect(lookup).toHaveBeenCalledTimes(1);
      expect(vi.getTimerCount()).toBe(0);
    },
  );
});
