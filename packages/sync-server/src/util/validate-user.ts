import type { Request, Response } from 'express';
import ipaddr from 'ipaddr.js';

import { getSession } from '#account-db';
import { config } from '#load-config';

export const TOKEN_EXPIRATION_NEVER = -1;
const MS_PER_SECOND = 1000;

function sendInvalidBearerRequest(res: Response) {
  res.setHeader('WWW-Authenticate', 'Bearer error="invalid_request"');
  res.status(400).send({ status: 'error', reason: 'invalid_request' });
}

// Keep legacy token transport available for existing Actual clients.
export function getRequestToken(req: Request, res: Response) {
  const authorization = req.headers.authorization;
  const legacyToken = req.body?.token || req.headers['x-actual-token'];
  if (authorization !== undefined) {
    if (legacyToken) {
      sendInvalidBearerRequest(res);
      return undefined;
    }
    const match = /^Bearer +([A-Za-z0-9\-._~+/]+=*)$/i.exec(authorization);
    if (!match) {
      sendInvalidBearerRequest(res);
      return undefined;
    }
    return match[1];
  }
  return legacyToken;
}

export function validateSession(req: Request, res: Response) {
  const token = getRequestToken(req, res);
  if (res.headersSent) return null;

  const session = getSession(token);

  if (!session) {
    res.setHeader(
      'WWW-Authenticate',
      token ? 'Bearer error="invalid_token"' : 'Bearer',
    );
    res.status(401);
    res.send({
      status: 'error',
      reason: 'unauthorized',
      details: 'token-not-found',
    });
    return null;
  }

  if (
    session.expires_at !== TOKEN_EXPIRATION_NEVER &&
    session.expires_at * MS_PER_SECOND <= Date.now()
  ) {
    res.setHeader(
      'WWW-Authenticate',
      token ? 'Bearer error="invalid_token"' : 'Bearer',
    );
    res.status(401);
    res.send({
      status: 'error',
      reason: 'token-expired',
    });
    return null;
  }

  return session;
}

export function validateAuthHeader(req: Request) {
  // fallback to trustedProxies when trustedAuthProxies not set
  const trustedAuthProxies: string[] =
    config.get('trustedAuthProxies') ?? config.get('trustedProxies');
  // ensure the first hop from our server is trusted
  const peer = req.socket.remoteAddress;
  if (peer === undefined) {
    console.error(`Header Auth Login attempted but there was no defined peer.`);
    return false;
  }
  const peerIp = ipaddr.process(peer);
  const rangeList = {
    allowed_ips: trustedAuthProxies.map(q => ipaddr.parseCIDR(q)),
  };

  const matched = ipaddr.subnetMatch(peerIp, rangeList, 'fail');

  if (matched === 'allowed_ips') {
    console.info(`Header Auth Login permitted from ${peer}`);
    return true;
  } else {
    console.warn(`Header Auth Login attempted from ${peer}`);
    return false;
  }
}
