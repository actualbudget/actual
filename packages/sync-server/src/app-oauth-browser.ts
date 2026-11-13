import { randomBytes } from 'node:crypto';

import express from 'express';

import { getAccountDb } from './account-db';
import { loginWithOpenIdSetup } from './accounts/openid';
import { FilesService } from './app-sync/services/files-service';
import type { File } from './app-sync/services/files-service';
import { config } from './load-config';
import {
  authorizationCallback,
  issueAuthorizationCode,
  readAuthorizationRequest,
} from './oauth-authorization';
import { canAccessActiveFile } from './services/user-service';
import {
  browserCsrfToken,
  browserLoginCookie,
  getBrowserSession,
  hashBrowserNonce,
  matchesBrowserCsrf,
} from './util/oauth-browser-session';

const app = express();
export { app as handlers };

app.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  res.set('Referrer-Policy', 'no-referrer');
  next();
});

function authorizationQuery(query: unknown) {
  if (
    typeof query !== 'string' ||
    !query.startsWith('?') ||
    query.length > 8192
  ) {
    return null;
  }
  const parameters = new URLSearchParams(query);
  const values: Record<string, unknown> = {};
  for (const [name, value] of parameters) {
    if (name in values) return null;
    values[name] = value;
  }
  return readAuthorizationRequest(values);
}

app.get('/request', (req, res) => {
  const query = new URL(req.originalUrl, 'https://actual.invalid').search;
  const request = authorizationQuery(query);
  if (!request) {
    res
      .status(400)
      .send({ status: 'error', reason: 'invalid-authorization-request' });
    return;
  }
  if (request.error) {
    res.send({
      status: 'ok',
      data: {
        redirectUri: authorizationCallback(request, { error: request.error }),
      },
    });
    return;
  }
  const session = getBrowserSession(req);
  if (!session) {
    res.status(401).send({
      status: 'error',
      data: { loginUrl: `/oauth/browser/login${query}` },
    });
    return;
  }
  const files: File[] = new FilesService(getAccountDb()).find({
    userId: session.userId,
  });
  const budgets = files
    .filter(file => !file.deleted)
    .map(file => ({ id: file.id, name: file.name }));
  res.send({
    status: 'ok',
    data: {
      clientName: request.client.name,
      logoUri: request.client.logoUri,
      csrfToken: browserCsrfToken(session.token, query),
      budgets,
    },
  });
});

app.get('/login', async (req, res) => {
  const query = new URL(req.originalUrl, 'https://actual.invalid').search;
  const request = authorizationQuery(query);
  if (!request || request.error) {
    res.status(400).send('Invalid OAuth authorization request');
    return;
  }
  const issuer = config.get('oauth.issuer');
  if (!issuer) {
    res.status(503).send('OAuth issuer is not configured');
    return;
  }
  const nonce = randomBytes(32).toString('base64url');
  const result = await loginWithOpenIdSetup(issuer, '', {
    query,
    nonceHash: hashBrowserNonce(nonce),
  });
  if (result.error || !result.url) {
    res.status(400).send('Unable to sign in with OpenID Connect');
    return;
  }
  res.cookie(browserLoginCookie, nonce, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/openid/callback',
    maxAge: 5 * 60 * 1000,
  });
  res.redirect(result.url);
});

app.post(['/consent', '/deny'], (req, res) => {
  const query = req.body?.authorizationQuery;
  const request = authorizationQuery(query);
  const session = getBrowserSession(req);
  if (!session) {
    res.status(401).send({ status: 'error', reason: 'unauthorized' });
    return;
  }
  if (!request || request.error || typeof query !== 'string') {
    res
      .status(400)
      .send({ status: 'error', reason: 'invalid-authorization-request' });
    return;
  }
  const issuer = config.get('oauth.issuer');
  if (
    !issuer ||
    req.get('Origin') !== new URL(issuer).origin ||
    !matchesBrowserCsrf(
      req.body?.csrfToken,
      browserCsrfToken(session.token, query),
    )
  ) {
    res.status(403).send({ status: 'error', reason: 'invalid-csrf-token' });
    return;
  }
  if (req.path === '/deny') {
    res.send({
      status: 'ok',
      data: {
        redirectUri: authorizationCallback(request, { error: 'access_denied' }),
      },
    });
    return;
  }
  const fileId = req.body?.fileId;
  if (
    typeof fileId !== 'string' ||
    !canAccessActiveFile(fileId, session.userId)
  ) {
    res.status(403).send({ status: 'error', reason: 'file-access-denied' });
    return;
  }
  // Request validation above guarantees an S256 challenge.
  if (typeof request.challenge !== 'string') return;
  const code = issueAuthorizationCode(
    request.client.clientId,
    request.redirectUri,
    request.challenge,
    session.userId,
    fileId,
  );
  res.send({
    status: 'ok',
    data: { redirectUri: authorizationCallback(request, { code }) },
  });
});
