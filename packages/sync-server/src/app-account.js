import express from 'express';
import rateLimit from 'express-rate-limit';

import {
  bootstrap,
  getActiveLoginMethod,
  getLoginMethod,
  getServerPrefs,
  getUserInfo,
  isAdmin,
  listLoginMethods,
  needsBootstrap,
  setServerPrefs,
} from './account-db';
import {
  createMfaChallenge,
  deleteMfaChallenge,
  getMfaChallenge,
  recordFailedMfaAttempt,
} from './accounts/mfa-challenge';
import { isValidRedirectUrl, loginWithOpenIdSetup } from './accounts/openid';
import {
  changePassword,
  createPasswordSession,
  loginWithPassword,
  resolvePasswordUserId,
  verifyPasswordForLogin,
} from './accounts/password';
import {
  confirmTotpEnrollment,
  disableTotp,
  generateTotpSecret,
  hasPendingTotpEnrollment,
  isTotpEnabled,
  verifyTotp,
} from './accounts/totp';
import { errorMiddleware, requestLoggerMiddleware } from './util/middlewares';
import { validateAuthHeader, validateSession } from './util/validate-user';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(errorMiddleware);
app.use(requestLoggerMiddleware);

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  legacyHeaders: false,
  standardHeaders: true,
  skipSuccessfulRequests: true,
  message: { status: 'error', reason: 'too-many-requests' },
});

// Unlike authRateLimiter this does not skip successful requests: a correct
// password must not refund the budget for guessing 6-digit codes.
const mfaRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  legacyHeaders: false,
  standardHeaders: true,
  message: { status: 'error', reason: 'too-many-requests' },
});

export { app as handlers, authRateLimiter, mfaRateLimiter };

// Non-authenticated endpoints:
//
// /needs-bootstrap
// /boostrap (special endpoint for setting up the instance, cant call again)
// /login

app.get('/needs-bootstrap', (req, res) => {
  const availableLoginMethods = listLoginMethods();
  res.send({
    status: 'ok',
    data: {
      bootstrapped: !needsBootstrap(),
      loginMethod:
        availableLoginMethods.length === 1
          ? availableLoginMethods[0].method
          : getLoginMethod(),
      availableLoginMethods,
      multiuser: getActiveLoginMethod() === 'openid',
      // Lets a newer client know it may offer the TOTP settings. Older servers
      // omit this, so the client hides the feature rather than showing controls
      // backed by endpoints that do not exist.
      supportsTotp: true,
    },
  });
});

app.post('/bootstrap', authRateLimiter, async (req, res) => {
  const boot = await bootstrap(req.body);

  if (boot?.error) {
    res.status(400).send({ status: 'error', reason: boot?.error });
    return;
  }
  res.send({ status: 'ok', data: boot });
});

app.get('/login-methods', (req, res) => {
  const methods = listLoginMethods();
  res.send({ status: 'ok', methods });
});

// Only rate-limit the code-verification step with the stricter limiter, so a
// normal password login is unaffected.
function mfaStepRateLimiter(req, res, next) {
  if ((req.body || {}).mfaToken) {
    return mfaRateLimiter(req, res, next);
  }
  return next();
}

app.post('/login', authRateLimiter, mfaStepRateLimiter, async (req, res) => {
  const loginMethod = getLoginMethod(req);
  console.log('Logging in via ' + loginMethod);
  let tokenRes = null;
  switch (loginMethod) {
    case 'header': {
      const headerVal = req.get('x-actual-password') || '';
      const obfuscated =
        '*'.repeat(headerVal.length) || 'No password provided.';
      console.debug('HEADER VALUE: ' + obfuscated);
      if (headerVal === '') {
        res.send({ status: 'error', reason: 'invalid-header' });
        return;
      } else {
        if (validateAuthHeader(req)) {
          // TOTP is intentionally not enforced here: header auth means an
          // upstream SSO proxy already authenticated the user, and there is no
          // interactive step to prompt for a code. MFA belongs at that proxy.
          tokenRes = await loginWithPassword(headerVal);
        } else {
          res.send({ status: 'error', reason: 'proxy-not-trusted' });
          return;
        }
      }
      break;
    }
    case 'openid': {
      if (!isValidRedirectUrl(req.body.returnUrl)) {
        res
          .status(400)
          .send({ status: 'error', reason: 'Invalid redirect URL' });
        return;
      }

      const { error, url } = await loginWithOpenIdSetup(
        req.body.returnUrl,
        req.body.password,
      );
      if (error) {
        res.status(400).send({ status: 'error', reason: error });
        return;
      }
      res.send({ status: 'ok', data: { returnUrl: url } });
      return;
    }

    default: {
      // Second step: the password was already verified and a challenge issued.
      if (req.body.mfaToken) {
        const challenge = getMfaChallenge(req.body.mfaToken);

        if (!challenge) {
          res
            .status(400)
            .send({ status: 'error', reason: 'mfa-challenge-expired' });
          return;
        }

        if (!verifyTotp(req.body.code)) {
          const stillUsable = recordFailedMfaAttempt(req.body.mfaToken);
          res.status(400).send({
            status: 'error',
            reason: stillUsable ? 'invalid-totp-code' : 'mfa-challenge-expired',
          });
          return;
        }

        deleteMfaChallenge(req.body.mfaToken);
        tokenRes = createPasswordSession(challenge.user_id);
        break;
      }

      const { error: passwordError } = await verifyPasswordForLogin(
        req.body.password,
      );
      if (passwordError) {
        res.status(400).send({ status: 'error', reason: passwordError });
        return;
      }

      const { error: userError, userId } = resolvePasswordUserId();
      if (userError) {
        res.status(400).send({ status: 'error', reason: userError });
        return;
      }

      if (isTotpEnabled()) {
        // A client that cannot complete the second step is refused outright.
        // Treating a missing marker as "skip MFA" would make the second factor
        // trivially bypassable by omitting a field, so this is never a fallback
        // path — only a clearer error than failing on the challenge response.
        if (!req.body.clientSupportsMfa) {
          res
            .status(400)
            .send({ status: 'error', reason: 'mfa-client-unsupported' });
          return;
        }

        // First factor passed but no session yet — the client must come back
        // with a code before it gets a token.
        res.send({
          status: 'ok',
          data: { mfaRequired: true, mfaToken: createMfaChallenge(userId) },
        });
        return;
      }

      tokenRes = createPasswordSession(userId);
      break;
    }
  }
  const { error, token } = tokenRes;

  if (error) {
    res.status(400).send({ status: 'error', reason: error });
    return;
  }

  res.send({ status: 'ok', data: { token } });
});

app.post('/change-password', async (req, res) => {
  const session = validateSession(req, res);
  if (!session) return;

  if (!isAdmin(session.user_id)) {
    res.status(403).send({
      status: 'error',
      reason: 'forbidden',
      details: 'permission-not-found',
    });
    return;
  }

  if (session.auth_method !== 'password') {
    res.status(403).send({
      status: 'error',
      reason: 'forbidden',
      details: 'password-auth-not-active',
    });
    return;
  }

  const { error } = await changePassword(req.body.password);

  if (error) {
    res.status(400).send({ status: 'error', reason: error });
    return;
  }

  res.send({ status: 'ok', data: {} });
});

/**
 * TOTP is a second factor for the shared server password, so every endpoint
 * requires an admin session that was itself established with password auth.
 */
function validateTotpAdminSession(req, res) {
  const session = validateSession(req, res);
  if (!session) return null;

  if (!isAdmin(session.user_id)) {
    res.status(403).send({
      status: 'error',
      reason: 'forbidden',
      details: 'permission-not-found',
    });
    return null;
  }

  if (session.auth_method !== 'password') {
    res.status(403).send({
      status: 'error',
      reason: 'forbidden',
      details: 'password-auth-not-active',
    });
    return null;
  }

  if (getActiveLoginMethod() === 'openid') {
    res.status(400).send({ status: 'error', reason: 'totp-not-available' });
    return null;
  }

  return session;
}

app.get('/totp/status', (req, res) => {
  const session = validateSession(req, res);
  if (!session) return;

  res.send({
    status: 'ok',
    data: {
      enabled: isTotpEnabled(),
      pending: hasPendingTotpEnrollment(),
    },
  });
});

app.post('/totp/enroll', (req, res) => {
  if (!validateTotpAdminSession(req, res)) return;

  // Refuse to arm a second factor from a client that could not then sign in
  // with it.
  if (!req.body.clientSupportsMfa) {
    res.status(400).send({ status: 'error', reason: 'mfa-client-unsupported' });
    return;
  }

  if (isTotpEnabled()) {
    res.status(400).send({ status: 'error', reason: 'totp-already-enabled' });
    return;
  }

  const { secret, otpauthUrl } = generateTotpSecret(
    req.get('host') || undefined,
  );

  res.send({ status: 'ok', data: { secret, otpauthUrl } });
});

app.post('/totp/confirm', mfaRateLimiter, (req, res) => {
  if (!validateTotpAdminSession(req, res)) return;

  const { error } = confirmTotpEnrollment(req.body.code);

  if (error) {
    res.status(400).send({ status: 'error', reason: error });
    return;
  }

  res.send({ status: 'ok', data: {} });
});

// Turning off a second factor is a security downgrade, so require both the
// password and a current code.
app.post('/totp/disable', mfaRateLimiter, async (req, res) => {
  if (!validateTotpAdminSession(req, res)) return;

  if (!isTotpEnabled()) {
    res.status(400).send({ status: 'error', reason: 'totp-not-enabled' });
    return;
  }

  const { error } = await verifyPasswordForLogin(req.body.password);
  if (error) {
    res.status(400).send({ status: 'error', reason: error });
    return;
  }

  if (!verifyTotp(req.body.code)) {
    res.status(400).send({ status: 'error', reason: 'invalid-totp-code' });
    return;
  }

  disableTotp();

  res.send({ status: 'ok', data: {} });
});

app.post('/server-prefs', (req, res) => {
  const session = validateSession(req, res);
  if (!session) return;

  if (!isAdmin(session.user_id)) {
    res.status(403).send({
      status: 'error',
      reason: 'forbidden',
      details: 'permission-not-found',
    });
    return;
  }

  const { prefs } = req.body || {};

  if (!prefs || typeof prefs !== 'object') {
    res.status(400).send({ status: 'error', reason: 'invalid-prefs' });
    return;
  }

  setServerPrefs(prefs);

  res.send({ status: 'ok', data: {} });
});

app.get('/validate', (req, res) => {
  const session = validateSession(req, res);
  if (session) {
    const user = getUserInfo(session.user_id);
    if (!user) {
      res.status(400).send({ status: 'error', reason: 'User not found' });
      return;
    }

    res.send({
      status: 'ok',
      data: {
        validated: true,
        userName: user?.user_name,
        permission: user?.role,
        userId: session?.user_id,
        displayName: user?.display_name,
        loginMethod: session?.auth_method,
        prefs: getServerPrefs(),
      },
    });
  }
});
