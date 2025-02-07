import config from '../load-config.js';
import ipaddr from 'ipaddr.js';
import { getSession } from '../account-db.js';

export const TOKEN_EXPIRATION_NEVER = -1;
const MS_PER_SECOND = 1000;

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export default function validateSession(req, res) {
  let { token } = req.body || {};

  if (!token) {
    token = req.headers['x-actual-token'];
  }

  let session = getSession(token);

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

export function validateAuthHeader(req) {
  // fallback to trustedProxies when trustedAuthProxies not set
  const trustedAuthProxies = config.trustedAuthProxies ?? config.trustedProxies;
  // ensure the first hop from our server is trusted
  let peer = req.socket.remoteAddress;
  let peerIp = ipaddr.process(peer);
  const rangeList = {
    allowed_ips: trustedAuthProxies.map((q) => ipaddr.parseCIDR(q)),
  };
  /* eslint-disable @typescript-eslint/ban-ts-comment */
  // @ts-ignore : there is an error in the ts definition for the function, but this is valid
  var matched = ipaddr.subnetMatch(peerIp, rangeList, 'fail');
  /* eslint-enable @typescript-eslint/ban-ts-comment */
  if (matched == 'allowed_ips') {
    console.info(`Header Auth Login permitted from ${peer}`);
    return true;
  } else {
    console.warn(`Header Auth Login attempted from ${peer}`);
    return false;
  }
}
