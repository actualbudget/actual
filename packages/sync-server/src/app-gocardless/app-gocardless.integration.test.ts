import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type * as Middlewares from '#util/middlewares';

// Every other test in this directory hands the route a pre-built error, which
// only proves the route's own switch. This one drives the real GoCardless
// service through the real route with nothing between them, so a mismatch
// between what the service throws and what the route recognises fails here.
//
// Nothing between the route and the credentials is stubbed either. Secrets are
// written and cleared through the real /secret endpoint against the real
// account database, and the only seam is GoCardless's own HTTP endpoint. That
// makes the restore cycle — account still linked in the budget file, server
// secrets gone, secrets re-entered — run end to end, and lets every assertion
// check which secret ID actually reached the wire.

vi.mock('#util/middlewares', async importOriginal => ({
  ...(await importOriginal<typeof Middlewares>()),
  requestLoggerMiddleware: (_req: unknown, _res: unknown, next: () => void) =>
    next(),
}));

const { SecretName } = await import('#services/secrets-service');
const { handlers: gocardlessHandlers } = await import('./app-gocardless');
const { handlers: secretHandlers } = await import('../app-secrets');

const app = express();
app.use('/secret', secretHandlers);
app.use('/gocardless', gocardlessHandlers);

// The session fixture vitest.globalSetup.js installs for an admin user; the
// real validateSessionMiddleware is in play on both routes.
const ADMIN_TOKEN = 'valid-token-admin';

type GoCardlessCall = {
  url: string;
  method: string;
  body: Record<string, unknown> | null;
  authorization: string | null;
};

let calls: GoCardlessCall[] = [];

/**
 * A token whose payload carries the secret ID it was minted for, so an
 * assertion can tell whose token was put on the wire. The shape has to be a
 * real JWT because setToken decides on reuse by reading `exp` out of it.
 */
function tokenFor(secretId: string): string {
  const payload = Buffer.from(
    JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600, secretId }),
  ).toString('base64url');
  return `header.${payload}.signature`;
}

function secretIdBehind(authorization: string | null): string | null {
  if (!authorization) {
    return null;
  }
  const payload = authorization.replace('Bearer ', '').split('.')[1];
  const claims: unknown = JSON.parse(
    Buffer.from(payload, 'base64url').toString(),
  );
  if (typeof claims !== 'object' || claims === null) {
    return null;
  }
  const { secretId } = claims as Record<string, unknown>;
  return typeof secretId === 'string' ? secretId : null;
}

const tokenRequests = () =>
  calls.filter(call => call.url.includes('/token/new/'));
const requisitionRequests = () =>
  calls.filter(call => call.url.includes('/requisitions/'));

beforeEach(() => {
  calls = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((input: unknown, init?: RequestInit): Promise<Response> => {
      const url = String(input);
      const headers = (init?.headers ?? {}) as Record<string, string>;
      const body =
        typeof init?.body === 'string'
          ? (JSON.parse(init.body) as Record<string, unknown>)
          : null;

      calls.push({
        url,
        method: init?.method ?? 'GET',
        body,
        authorization: headers.Authorization ?? null,
      });

      const json = (status: number, payload: unknown): Promise<Response> =>
        Promise.resolve(
          new Response(JSON.stringify(payload), {
            status,
            headers: { 'content-type': 'application/json' },
          }),
        );

      if (url.includes('/token/new/')) {
        const secretId = body?.secret_id;
        // GoCardless answers a bad secret pair on this call and nowhere else.
        if (typeof secretId !== 'string' || secretId.startsWith('wrong-')) {
          return json(401, {
            summary: 'Authentication failed',
            detail: 'No active account found with the given credentials',
          });
        }
        return json(200, {
          access: tokenFor(secretId),
          refresh: 'refresh-token',
          access_expires: 3600,
          refresh_expires: 7200,
        });
      }

      if (url.includes('/requisitions/')) {
        // The credentials were accepted, so the sync is past the gate this PR
        // is about; it stops on the requisition instead, which is a different
        // error entirely.
        return json(200, {
          id: 'req-1',
          status: 'CR',
          accounts: [],
          institution_id: 'INSTITUTION',
        });
      }

      return json(404, {});
    }),
  );
});

afterEach(async () => {
  vi.unstubAllGlobals();
  await clearSecrets();
});

const storeSecret = (name: string, value: string) =>
  request(app)
    .post('/secret')
    .set('x-actual-token', ADMIN_TOKEN)
    .send({ name, value })
    .expect(200);

const storeCredentials = async (secretId: string, secretKey: string) => {
  await storeSecret(SecretName.gocardless_secretId, secretId);
  await storeSecret(SecretName.gocardless_secretKey, secretKey);
};

const clearSecrets = async () => {
  await request(app)
    .delete(`/secret/${SecretName.gocardless_secretId}`)
    .set('x-actual-token', ADMIN_TOKEN)
    .expect(200);
  await request(app)
    .delete(`/secret/${SecretName.gocardless_secretKey}`)
    .set('x-actual-token', ADMIN_TOKEN)
    .expect(200);
};

const syncLinkedAccount = () =>
  request(app)
    .post('/gocardless/transactions')
    .set('x-actual-token', ADMIN_TOKEN)
    .send({
      requisitionId: 'req-1',
      accountId: 'acc-1',
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      includeBalance: false,
    });

describe('/transactions with the real GoCardless service', () => {
  it('reports a server with no secrets as GOCARDLESS_NOT_CONFIGURED', async () => {
    // exactly the state a budget is restored into: the accounts are linked in
    // the budget file, but the server's secrets never came with it
    await clearSecrets();

    const res = await syncLinkedAccount();

    expect(res.body.data).toMatchObject({
      error_type: 'CONFIG_ERROR',
      error_code: 'GOCARDLESS_NOT_CONFIGURED',
      status: 'rejected',
    });
    // and it is decided before anything is asked of GoCardless, so no client
    // left over from an earlier credential pair can answer for the missing one
    expect(calls).toEqual([]);
  });

  it('reports secrets GoCardless rejects as GOCARDLESS_INVALID_CREDENTIALS', async () => {
    // and the state the user lands in if they mistype the replacement secrets
    await storeCredentials('wrong-secret-id', 'wrong-secret-key');

    const res = await syncLinkedAccount();

    expect(res.body.data).toMatchObject({
      error_type: 'CONFIG_ERROR',
      error_code: 'GOCARDLESS_INVALID_CREDENTIALS',
      status: 'rejected',
    });
    expect(tokenRequests()).toHaveLength(1);
    expect(tokenRequests()[0].body).toMatchObject({
      secret_id: 'wrong-secret-id',
      secret_key: 'wrong-secret-key',
    });
  });

  it('gets past the credential gate once the right secrets are stored', async () => {
    await storeCredentials('restored-secret-id', 'restored-secret-key');

    const res = await syncLinkedAccount();

    expect(res.body.data).toMatchObject({ error_type: 'ITEM_ERROR' });
    expect(tokenRequests()[0].body).toMatchObject({
      secret_id: 'restored-secret-id',
    });
    // the call after the token carries a token minted for the secrets stored
    // right now — the client follows the secret store rather than being bound
    // once at import time
    expect(secretIdBehind(requisitionRequests()[0].authorization)).toBe(
      'restored-secret-id',
    );
  });

  it('keeps no client, and no session token, from a credential pair that has been replaced', async () => {
    // Correcting a mistyped secret and then putting the original back is the
    // ordinary shape of a restore, and the case where a retained client could
    // hand back a pair's still-unexpired session token instead of asking
    // GoCardless whether those credentials are still good. Each leg has to
    // reach GoCardless as itself.
    await storeCredentials('pair-a-id', 'pair-a-key');
    await syncLinkedAccount();
    expect(secretIdBehind(requisitionRequests()[0].authorization)).toBe(
      'pair-a-id',
    );

    await storeCredentials('pair-b-id', 'pair-b-key');
    await syncLinkedAccount();
    expect(secretIdBehind(requisitionRequests()[1].authorization)).toBe(
      'pair-b-id',
    );

    await storeCredentials('pair-a-id', 'pair-a-key');
    await syncLinkedAccount();
    expect(secretIdBehind(requisitionRequests()[2].authorization)).toBe(
      'pair-a-id',
    );

    // three syncs, three token requests: coming back to pair A mints a fresh
    // token rather than reviving the one the pair was holding when it was
    // replaced
    expect(tokenRequests().map(call => call.body?.secret_id)).toEqual([
      'pair-a-id',
      'pair-b-id',
      'pair-a-id',
    ]);
  });
});
