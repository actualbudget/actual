import { createHash, randomBytes } from 'node:crypto';

import { getAccountDb } from './account-db';
import { config } from './load-config';
import type { OAuthClient } from './oauth-clients';

export function getRegisteredOAuthClient(
  clientId: string,
  redirectUri: string,
) {
  const clients: OAuthClient[] = config.get('oauth.clients');
  return clients.find(
    client =>
      client.clientId === clientId && client.redirectUris.includes(redirectUri),
  );
}

export function readAuthorizationRequest(query: Record<string, unknown>) {
  const {
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: responseType,
    code_challenge: challenge,
    code_challenge_method: method,
    state,
    scope,
  } = query;
  const client =
    typeof clientId === 'string' && typeof redirectUri === 'string'
      ? getRegisteredOAuthClient(clientId, redirectUri)
      : undefined;
  if (!client || typeof redirectUri !== 'string') return null;
  let error: string | undefined;
  if (responseType !== 'code') {
    error = 'unsupported_response_type';
  } else if (scope !== undefined && scope !== '') {
    error = 'invalid_scope';
  } else if (
    typeof state !== 'string' ||
    typeof challenge !== 'string' ||
    !/^[A-Za-z0-9_-]{43}$/.test(challenge) ||
    method !== 'S256'
  ) {
    error = 'invalid_request';
  }
  return { client, redirectUri, responseType, challenge, state, error };
}

export function authorizationCallback(
  request: NonNullable<ReturnType<typeof readAuthorizationRequest>>,
  parameters: Record<string, string>,
) {
  const callback = new URL(request.redirectUri);
  const result = new URLSearchParams(parameters);
  if (typeof request.state === 'string') result.set('state', request.state);
  if (
    typeof request.responseType === 'string' &&
    request.responseType.split(' ').includes('token')
  ) {
    callback.hash = result.toString();
  } else {
    for (const [name, value] of result) callback.searchParams.set(name, value);
  }
  return callback.toString();
}

export function issueAuthorizationCode(
  clientId: string,
  redirectUri: string,
  challenge: string,
  userId: string,
  fileId: string,
) {
  const code = randomBytes(32).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const db = getAccountDb();
  db.mutate('DELETE FROM oauth_authorization_codes WHERE expires_at <= ?', [
    now,
  ]);
  db.mutate(
    `INSERT INTO oauth_authorization_codes
    (code_hash, client_id, redirect_uri, code_challenge, user_id, file_id, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      createHash('sha256').update(code).digest('hex'),
      clientId,
      redirectUri,
      challenge,
      userId,
      fileId,
      now + 120,
    ],
  );
  return code;
}
