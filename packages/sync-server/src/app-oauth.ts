import {
  createHash,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto';

import express from 'express';

import { getAccountDb } from './account-db';
import { config } from './load-config';
import {
  authorizationCallback,
  readAuthorizationRequest,
} from './oauth-authorization';
import { canAccessActiveFile } from './services/user-service';
import { errorMiddleware, requestLoggerMiddleware } from './util/middlewares';

const app = express();
export { app as handlers };

app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: false, limit: '16kb' }));
app.use(requestLoggerMiddleware);
app.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  res.set('Pragma', 'no-cache');
  next();
});

// Validate requests before serving the standalone consent entry point.
app.get('/authorize', (req, res, next) => {
  const request = readAuthorizationRequest(req.query);
  if (!request) {
    res.status(400).send('Invalid OAuth authorization request');
    return;
  }
  if (request.error) {
    res.redirect(302, authorizationCallback(request, { error: request.error }));
    return;
  }
  next();
});

// Unsupported methods must not fall through to the isolated PWA error page.
app.all('/authorize', (req, res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD') {
    next();
    return;
  }
  res.set('Allow', 'GET');
  res.status(405).send('Use GET for OAuth authorization requests');
});

function digest(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function decodeBasicCredentials(value: string) {
  try {
    const decoded = Buffer.from(value, 'base64').toString('utf8');
    const separator = decoded.indexOf(':');
    if (separator < 0) return null;
    const decode = (part: string) =>
      decodeURIComponent(part.replace(/\+/g, ' '));
    return {
      clientId: decode(decoded.slice(0, separator)),
      clientSecret: decode(decoded.slice(separator + 1)),
    };
  } catch {
    return null;
  }
}

function authenticateTokenClient(req: express.Request) {
  const authorization = req.get('Authorization');
  const hasBasicAuth = authorization?.toLowerCase().startsWith('basic ');
  if (authorization && !hasBasicAuth) return null;

  const basicCredentials =
    authorization && hasBasicAuth
      ? decodeBasicCredentials(authorization.slice(6).trim())
      : null;
  if (hasBasicAuth && !basicCredentials) return null;

  const bodyClientId = req.body?.client_id;
  const bodySecret = req.body?.client_secret;
  if (
    (basicCredentials &&
      (bodyClientId !== undefined || bodySecret !== undefined)) ||
    (bodyClientId !== undefined && typeof bodyClientId !== 'string') ||
    (bodySecret !== undefined && typeof bodySecret !== 'string')
  ) {
    return null;
  }

  const clientId = basicCredentials?.clientId ?? bodyClientId;
  if (typeof clientId !== 'string') return null;
  const client = config
    .get('oauth.clients')
    .find(registered => registered.clientId === clientId);
  if (!client) return null;

  if (client.clientSecret === undefined) {
    return bodySecret === undefined && !basicCredentials ? client : null;
  }

  const suppliedSecret = basicCredentials?.clientSecret ?? bodySecret;
  if (typeof suppliedSecret !== 'string') return null;
  const expected = Buffer.from(client.clientSecret);
  const supplied = Buffer.from(suppliedSecret);
  if (
    expected.length !== supplied.length ||
    !timingSafeEqual(expected, supplied)
  ) {
    return null;
  }
  return client;
}

// A code can mint only one budget-scoped key.
app.post('/token', (req, res) => {
  const body = req.body ?? {};
  const usesBasicAuth = req
    .get('Authorization')
    ?.toLowerCase()
    .startsWith('basic ');
  const parameters = [
    body.grant_type,
    usesBasicAuth ? 'basic-authenticated-client' : body.client_id,
    body.redirect_uri,
    body.code,
    body.code_verifier,
  ];
  if (
    !req.is('application/x-www-form-urlencoded') ||
    parameters.some(
      value => Array.isArray(value) || typeof value !== 'string' || !value,
    )
  ) {
    res.status(400).json({ error: 'invalid_request' });
    return;
  }

  const client = authenticateTokenClient(req);
  if (!client) {
    res.set('WWW-Authenticate', 'Basic realm="oauth/token"');
    res.status(401).json({ error: 'invalid_client' });
    return;
  }

  const {
    redirect_uri: redirectUri,
    grant_type: grantType,
    code,
    code_verifier: codeVerifier,
  } = body;
  if (grantType !== 'authorization_code') {
    res.status(400).json({ error: 'unsupported_grant_type' });
    return;
  }
  if (!client.redirectUris.includes(redirectUri)) {
    res.status(400).json({ error: 'invalid_grant' });
    return;
  }
  if (!/^[A-Za-z0-9._~-]{43,128}$/.test(codeVerifier)) {
    res.status(400).json({ error: 'invalid_grant' });
    return;
  }

  const key = `actual_${randomBytes(32).toString('base64url')}`;
  const keyHash = digest(key);
  const keyId = randomUUID();
  const codeHash = digest(code);
  const now = Math.floor(Date.now() / 1000);
  let exchanged = false;
  const db = getAccountDb();
  db.transaction(() => {
    const pending = db.first(
      `SELECT code_hash, code_challenge, user_id, file_id FROM oauth_authorization_codes
       WHERE code_hash = ? AND client_id = ? AND redirect_uri = ? AND expires_at > ?`,
      [codeHash, client.clientId, redirectUri, now],
    );
    if (!pending) {
      const previouslyIssued = db.first(
        'SELECT key_id FROM oauth_issued_tokens WHERE code_hash = ? AND client_id = ?',
        [codeHash, client.clientId],
      );
      if (previouslyIssued) {
        db.mutate('DELETE FROM api_keys WHERE id = ?', [
          previouslyIssued.key_id,
        ]);
      }
      return;
    }
    const user = db.first('SELECT enabled FROM users WHERE id = ?', [
      pending.user_id,
    ]);
    if (
      !user?.enabled ||
      !canAccessActiveFile(pending.file_id, pending.user_id)
    ) {
      return;
    }
    const expected = Buffer.from(pending.code_challenge);
    // PKCE S256 is base64url(SHA-256(verifier)); use the canonical encoding.
    const challenge = createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');
    if (
      expected.length !== Buffer.byteLength(challenge) ||
      !timingSafeEqual(expected, Buffer.from(challenge))
    ) {
      return;
    }
    const consumed = db.mutate(
      'DELETE FROM oauth_authorization_codes WHERE code_hash = ? AND expires_at > ?',
      [pending.code_hash, now],
    );
    if (consumed.changes !== 1) return;
    const userId: string = pending.user_id;
    const fileId: string = pending.file_id;
    db.mutate(
      'INSERT INTO api_keys (id, user_id, name, key_hash, created_at) VALUES (?, ?, ?, ?, ?)',
      [keyId, userId, client.name, keyHash, now],
    );
    db.mutate(
      'INSERT INTO oauth_issued_tokens (key_id, client_id, code_hash) VALUES (?, ?, ?)',
      [keyId, client.clientId, pending.code_hash],
    );
    db.mutate('INSERT INTO api_key_budgets (key_id, file_id) VALUES (?, ?)', [
      keyId,
      fileId,
    ]);
    exchanged = true;
  });
  if (!exchanged) {
    res.status(400).json({ error: 'invalid_grant' });
    return;
  }
  res.json({ access_token: key, token_type: 'Bearer' });
});

app.post('/revoke', (req, res) => {
  if (
    !req.is('application/x-www-form-urlencoded') ||
    typeof req.body?.token !== 'string'
  ) {
    res.status(400).json({ error: 'invalid_request' });
    return;
  }
  const client = authenticateTokenClient(req);
  if (!client) {
    res.set('WWW-Authenticate', 'Basic realm="oauth/revoke"');
    res.status(401).json({ error: 'invalid_client' });
    return;
  }
  // This endpoint accepts only a key presented by its holder and deletes only
  // that exact key. No owner supplied in the request can widen its authority.
  getAccountDb().mutate(
    'DELETE FROM api_keys WHERE key_hash = ? AND id IN (SELECT key_id FROM oauth_issued_tokens WHERE client_id = ?)',
    [digest(req.body.token), client.clientId],
  );
  res.status(200).end();
});

export function authorizationServerMetadata(
  _req: express.Request,
  res: express.Response,
) {
  const issuer = config.get('oauth.issuer');
  if (!issuer) {
    res.status(404).end();
    return;
  }
  const base = issuer.endsWith('/') ? issuer.slice(0, -1) : issuer;
  res.json({
    issuer,
    authorization_endpoint: `${base}/oauth/authorize`,
    token_endpoint: `${base}/oauth/token`,
    revocation_endpoint: `${base}/oauth/revoke`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code'],
    token_endpoint_auth_methods_supported: [
      'client_secret_basic',
      'client_secret_post',
      'none',
    ],
    code_challenge_methods_supported: ['S256'],
  });
}

app.use(errorMiddleware);
