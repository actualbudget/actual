import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

import type { Request, Response } from 'express';

import { getSession } from '#account-db';

import { TOKEN_EXPIRATION_NEVER } from './validate-user';

export const browserSessionCookie = '__Secure-actual-oauth-session';
export const browserLoginCookie = '__Secure-actual-oauth-login';

export function readBrowserCookie(req: Request, name: string) {
  const values = (req.headers.cookie ?? '')
    .split(';')
    .map(part => part.trim())
    .filter(part => part.startsWith(`${name}=`));
  return values.length === 1 ? values[0].slice(name.length + 1) : undefined;
}

export function hashBrowserNonce(nonce: string) {
  return createHash('sha256').update(nonce).digest('hex');
}

export function getBrowserSession(req: Request) {
  const token = readBrowserCookie(req, browserSessionCookie);
  if (!token) return null;
  const session = getSession(token);
  if (
    !session ||
    (session.expires_at !== TOKEN_EXPIRATION_NEVER &&
      session.expires_at * 1000 <= Date.now())
  ) {
    return null;
  }
  return { token, userId: session.user_id as string };
}

export function setBrowserSession(res: Response, token: string) {
  res.cookie(browserSessionCookie, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/oauth/browser',
  });
}

export function browserCsrfToken(sessionToken: string, query: string) {
  return createHmac('sha256', sessionToken)
    .update(`oauth-consent\n${query}`)
    .digest('hex');
}

export function matchesBrowserCsrf(value: unknown, expected: string) {
  if (typeof value !== 'string') return false;
  const actualBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expected);
  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}
