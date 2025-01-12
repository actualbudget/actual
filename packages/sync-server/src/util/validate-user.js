import config from '../load-config.js';
import proxyaddr from 'proxy-addr';
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
  if (config.trustedProxies.length == 0) {
    return true;
  }

  let sender = proxyaddr(req, 'uniquelocal');
  let sender_ip = ipaddr.process(sender);
  const rangeList = {
    allowed_ips: config.trustedProxies.map((q) => ipaddr.parseCIDR(q)),
  };
  /* eslint-disable @typescript-eslint/ban-ts-comment */
  // @ts-ignore : there is an error in the ts definition for the function, but this is valid
  var matched = ipaddr.subnetMatch(sender_ip, rangeList, 'fail');
  /* eslint-enable @typescript-eslint/ban-ts-comment */
  if (matched == 'allowed_ips') {
    console.info(`Header Auth Login permitted from ${sender}`);
    return true;
  } else {
    console.warn(`Header Auth Login attempted from ${sender}`);
    return false;
  }
}
