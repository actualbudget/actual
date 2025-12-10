import type { Request, Response } from 'express';
import ipaddr from 'ipaddr.js';

import { getSession } from '../account-db';
import { config } from '../load-config';
import { apiTokenService } from '../services/api-token-service';

export const TOKEN_EXPIRATION_NEVER = -1;
const MS_PER_SECOND = 1000;
const API_TOKEN_PREFIX = 'act_';

export async function validateSession(req: Request, res: Response) {
  let { token } = req.body || {};

  if (!token) {
    token = req.headers['x-actual-token'];
  }

  // Also check Authorization header for Bearer tokens
  if (!token) {
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    }
  }

  // Check if this is an API token
  if (token && token.startsWith(API_TOKEN_PREFIX)) {
    return await validateApiToken(token, res);
  }

  const session = getSession(token);

  if (!session) {
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
    res.status(401);
    res.send({
      status: 'error',
      reason: 'token-expired',
    });
    return null;
  }

  return session;
}

/**
 * Validate an API token and return session-like object
 */
async function validateApiToken(token: string, res: Response) {
  const result = await apiTokenService.validateToken(token);

  if (!result) {
    res.status(401);
    res.send({
      status: 'error',
      reason: 'unauthorized',
      details: 'invalid-api-token',
    });
    return null;
  }

  // Return a session-like object for compatibility
  return {
    user_id: result.userId,
    token_id: result.tokenId,
    budget_ids: result.budgetIds,
    auth_method: 'api_token',
  };
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
