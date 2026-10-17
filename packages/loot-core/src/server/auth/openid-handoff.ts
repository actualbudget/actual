import * as asyncStorage from '#platform/server/asyncStorage';
import { randomBytes } from '#server/encryption';
import { post } from '#server/post';
import { getServer } from '#server/server-config';

function base64url(value: Uint8Array) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function prepareOpenIdLogin(server: string) {
  const verifier = base64url(randomBytes(32));
  const state = base64url(randomBytes(32));
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(verifier),
  );
  await asyncStorage.setItem('openid-login', {
    server,
    state,
    verifier,
    expires: Date.now() + 300_000,
  });
  return {
    clientState: state,
    clientChallenge: base64url(new Uint8Array(digest)),
  };
}

let exchange: Promise<{ error?: string }> | undefined;

export async function completeOpenIdLogin({
  code,
  state,
}: {
  code: string;
  state: string;
}): Promise<{ error?: string }> {
  // A fresh app can re-render while its backend connection is initialising.
  // Serialize redemption and retain its result before applying the token.
  if (exchange) {
    await exchange;
  }
  exchange = redeemOpenIdLogin(code, state);
  try {
    return await exchange;
  } finally {
    exchange = undefined;
  }
}

async function redeemOpenIdLogin(
  code: string,
  state: string,
): Promise<{ error?: string }> {
  const server = getServer();
  const pending = await asyncStorage.getItem('openid-login');
  if (
    !server ||
    !pending ||
    pending.server !== server.BASE_SERVER ||
    pending.state !== state ||
    pending.expires <= Date.now()
  ) {
    return { error: 'invalid-openid-callback' };
  }
  try {
    let token = pending.token;
    if (!token) {
      const response: { token: string } = await post(
        `${server.BASE_SERVER}/openid/exchange`,
        {
          code,
          verifier: pending.verifier,
        },
      );
      token = response.token;
      if (typeof token !== 'string' || !token) {
        return { error: 'invalid-openid-callback' };
      }
      if (getServer()?.BASE_SERVER !== pending.server) {
        return { error: 'invalid-openid-callback' };
      }
      await asyncStorage.setItem('openid-login', {
        ...pending,
        verifier: undefined,
        token,
      });
    }
    await asyncStorage.setItem('user-token', token);
    return {};
  } catch {
    return { error: 'openid-exchange-failed' };
  }
}
