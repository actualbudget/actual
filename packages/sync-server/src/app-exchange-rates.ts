import express from 'express';
import type { Request } from 'express';

import { fawazahmed0ExchangeApi } from './exchange-rate-provider/fawazahmed0-exchange-api';
import type { RateProviderPlugin } from './exchange-rate-provider/types';
import { requestLoggerMiddleware } from './util/middlewares';
import { validateSession } from './util/validate-user';

export type { RateProviderPlugin };

type LookupRequest = {
  providerId: string;
  base: string;
  quote: string;
  date: string;
};
type LookupData =
  | {
      outcome: 'ok';
      plugin: { id: string; version: string };
      base: string;
      quote: string;
      rate: string;
      effectiveDate: string;
    }
  | { outcome: 'missing'; plugin: { id: string; version: string } }
  | {
      outcome: 'error';
      code:
        | 'not-installed'
        | 'not-configured'
        | 'auth'
        | 'rate-limited'
        | 'unavailable'
        | 'timeout'
        | 'provider-error';
    };

const failure = (): LookupData => ({
  outcome: 'error',
  code: 'provider-error',
});

function validDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date
  );
}

function project(
  result: Awaited<ReturnType<RateProviderPlugin['lookup']>>,
  query: LookupRequest,
  provider: RateProviderPlugin,
): LookupData {
  if (!result || typeof result !== 'object') return failure();
  const plugin = { id: provider.id, version: provider.version };
  if (result.status === 'missing') return { outcome: 'missing', plugin };
  if (result.status === 'error') {
    return ['auth', 'rate-limited', 'unavailable'].includes(result.code)
      ? { outcome: 'error', code: result.code }
      : failure();
  }
  if (
    result.status !== 'ok' ||
    result.base !== query.base ||
    result.quote !== query.quote ||
    typeof result.rate !== 'string' ||
    result.rate === '0' ||
    !/^(?:0|[1-9]\d{0,11})(?:\.\d{0,14}[1-9])?$/.test(result.rate) ||
    typeof result.effectiveDate !== 'string' ||
    !validDate(result.effectiveDate) ||
    result.effectiveDate > query.date
  ) {
    return failure();
  }
  return {
    outcome: 'ok',
    plugin,
    base: result.base,
    quote: result.quote,
    rate: result.rate,
    effectiveDate: result.effectiveDate,
  };
}

async function callProvider(
  provider: RateProviderPlugin,
  query: LookupRequest,
): Promise<LookupData> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<LookupData>(resolve => {
    timer = setTimeout(() => {
      resolve({ outcome: 'error', code: 'timeout' });
      controller.abort();
    }, 15000);
  });
  // The rejection handler remains attached after the deadline settles.
  const lookup = Promise.resolve()
    .then(() =>
      provider.lookup(
        { base: query.base, quote: query.quote, date: query.date },
        { config: {}, signal: controller.signal },
      ),
    )
    .then(result => project(result, query, provider))
    .catch(failure);
  try {
    return await Promise.race([lookup, deadline]);
  } finally {
    clearTimeout(timer);
  }
}

/** A single direct binding; tests inject a provider without a production registry. */
export function createExchangeRateHandlers(
  provider: RateProviderPlugin | null,
) {
  const app = express();
  app.use(requestLoggerMiddleware);
  const parseJson = express.json();
  app.use((req, res, next) => {
    parseJson(req, res, error => {
      if (error) {
        res.status(400).json({ status: 'error', reason: 'invalid-request' });
        return;
      }
      next();
    });
  });
  app.use((req, res, next) => {
    if (
      req.body !== undefined &&
      (!req.body ||
        typeof req.body !== 'object' ||
        Array.isArray(req.body) ||
        Object.prototype.hasOwnProperty.call(req.body, 'token'))
    ) {
      res.status(400).json({ status: 'error', reason: 'invalid-request' });
      return;
    }
    if (validateSession(req, res)) next();
  });
  app.post('/providers', (_req, res) => {
    const providers = provider
      ? [
          {
            id: provider.id,
            name: provider.name,
            version: provider.version,
            origins: [...provider.origins],
            fields: [],
          },
        ]
      : [];
    res.json({ status: 'ok', data: { providers } });
  });
  app.post(
    '/lookup',
    async (
      req: Request<Record<string, string>, object, Partial<LookupRequest>>,
      res,
    ) => {
      const body = req.body;
      if (
        !body ||
        typeof body.providerId !== 'string' ||
        typeof body.base !== 'string' ||
        !/^[A-Z]{3}$/.test(body.base) ||
        typeof body.quote !== 'string' ||
        !/^[A-Z]{3}$/.test(body.quote) ||
        body.base === body.quote ||
        typeof body.date !== 'string' ||
        !validDate(body.date)
      ) {
        res.status(400).json({ status: 'error', reason: 'invalid-request' });
        return;
      }
      let data: LookupData;
      if (!provider || provider.id !== body.providerId) {
        data = { outcome: 'error', code: 'not-installed' };
      } else if (provider.fields.some(field => field.required)) {
        data = { outcome: 'error', code: 'not-configured' };
      } else {
        data = await callProvider(provider, {
          providerId: body.providerId,
          base: body.base,
          quote: body.quote,
          date: body.date,
        });
      }
      console.log(
        'fx lookup',
        provider?.id ?? 'none',
        data.outcome === 'error' ? data.code : data.outcome,
      );
      res.json({ status: 'ok', data });
    },
  );
  return app;
}

export const handlers = createExchangeRateHandlers(fawazahmed0ExchangeApi);
