import assert from 'node:assert/strict';
import { request } from 'node:http';

import { test } from 'vitest';

import { createOAuthListener } from '../oauth-server';

function callbackUrl(base: string) {
  const url = new URL(base);
  url.pathname = '/openid-cb';
  url.searchParams.set('code', 'c'.repeat(43));
  url.searchParams.set('state', 's'.repeat(43));
  return url;
}

function send(url: URL, method = 'GET', host = url.host): Promise<number> {
  return new Promise((resolve, reject) => {
    const req = request(
      {
        hostname: '127.0.0.1',
        port: url.port,
        path: url.pathname + url.search,
        method,
        headers: { host },
      },
      res => {
        res.resume();
        res.on('end', () => resolve(res.statusCode || 0));
      },
    );
    req.on('error', reject);
    req.end();
  });
}

test('invalid requests leave the listener available for a legitimate callback', async () => {
  const callbacks: URLSearchParams[] = [];
  const listener = await createOAuthListener({
    port: 0,
    onCallback: async params => {
      callbacks.push(params);
    },
  });
  const valid = callbackUrl(listener.url);
  try {
    const noNonce = new URL(valid);
    noNonce.searchParams.delete('nonce');
    assert.equal(await send(noNonce), 400);
    assert.equal(await send(valid, 'POST'), 400);
    assert.equal(await send(valid, 'GET', 'attacker.example'), 400);
    const wrongPath = new URL(valid);
    wrongPath.pathname = '/other';
    assert.equal(await send(wrongPath), 400);
    assert.equal(callbacks.length, 0);
    assert.equal(await send(valid), 200);
    assert.equal(callbacks.length, 1);
    assert.equal(await send(valid), 409);
    await listener.complete(valid.searchParams.get('nonce') || '', true);
    await assert.rejects(send(valid));
  } finally {
    await listener.close();
  }
});

test('failed exchanges can be followed by a valid callback and simultaneous requests are not forwarded twice', async () => {
  let calls = 0;
  const listener = await createOAuthListener({
    port: 0,
    onCallback: async () => {
      calls++;
    },
  });
  const valid = callbackUrl(listener.url);
  try {
    const results = await Promise.all([send(valid), send(valid)]);
    assert.deepEqual(
      results.sort((a, b) => a - b),
      [200, 409],
    );
    assert.equal(calls, 1);
    await listener.complete('wrong-nonce', true);
    assert.equal(await send(valid), 409);
    await listener.complete(valid.searchParams.get('nonce') || '', false);
    assert.equal(await send(valid), 200);
    assert.equal(calls, 2);
  } finally {
    await listener.close();
  }
});

test('cancellation releases the port and a new attempt rejects the previous nonce', async () => {
  const first = await createOAuthListener({
    port: 0,
    onCallback: async params => {
      assert.equal(params.get('code'), 'c'.repeat(43));
    },
  });
  const old = callbackUrl(first.url);
  await first.close();
  const second = await createOAuthListener({
    port: Number(old.port),
    onCallback: async params => {
      assert.equal(params.get('code'), 'c'.repeat(43));
    },
  });
  try {
    assert.equal(await send(old), 400);
    assert.equal(await send(callbackUrl(second.url)), 200);
  } finally {
    await second.close();
  }
});

test('an expired attempt closes its listener', async () => {
  const listener = await createOAuthListener({
    port: 0,
    timeout: 20,
    onCallback: async params => {
      assert.equal(params.get('code'), 'c'.repeat(43));
    },
  });
  await new Promise(resolve => setTimeout(resolve, 40));
  await assert.rejects(send(callbackUrl(listener.url)));
  await listener.close();
});
