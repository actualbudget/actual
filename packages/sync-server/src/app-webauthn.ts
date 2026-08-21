import express from 'express';
import rateLimit from 'express-rate-limit';

import { needsBootstrap } from './account-db';
import {
  getAuthenticationOptions,
  getRegistrationOptions,
  verifyAuthentication,
  verifyRegistration,
} from './accounts/webauthn';
import { errorMiddleware, requestLoggerMiddleware } from './util/middlewares';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLoggerMiddleware);

const webauthnRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  legacyHeaders: false,
  standardHeaders: true,
  skipSuccessfulRequests: true,
  message: { status: 'error', reason: 'too-many-requests' },
});

export { app as handlers, webauthnRateLimiter };

// Registration pair: only usable before the server has been bootstrapped,
// mirroring POST /account/bootstrap's "special endpoint, can't call again"
// gate. Post-bootstrap re-registration is deferred to a future change.
app.post('/registration-options', webauthnRateLimiter, async (req, res) => {
  if (!needsBootstrap()) {
    res.status(400).send({ status: 'error', reason: 'already-bootstrapped' });
    return;
  }

  const result = await getRegistrationOptions(req);
  if ('error' in result) {
    res.status(400).send({ status: 'error', reason: result.error });
    return;
  }
  res.send({ status: 'ok', data: result.options });
});

app.post('/registration-verify', webauthnRateLimiter, async (req, res) => {
  if (!needsBootstrap()) {
    res.status(400).send({ status: 'error', reason: 'already-bootstrapped' });
    return;
  }

  const result = await verifyRegistration(req, req.body?.response);
  if ('error' in result) {
    res.status(400).send({ status: 'error', reason: result.error });
    return;
  }
  res.send({ status: 'ok', data: {} });
});

// Authentication pair: pre-auth, used instead of POST /account/login since
// that endpoint is single-shot and WebAuthn needs a two-step ceremony.
app.post('/authentication-options', webauthnRateLimiter, async (req, res) => {
  const result = await getAuthenticationOptions(req);
  if ('error' in result) {
    res.status(400).send({ status: 'error', reason: result.error });
    return;
  }
  res.send({ status: 'ok', data: result.options });
});

app.post('/authentication-verify', webauthnRateLimiter, async (req, res) => {
  const result = await verifyAuthentication(req, req.body?.response);
  if ('error' in result) {
    res.status(400).send({ status: 'error', reason: result.error });
    return;
  }
  res.send({ status: 'ok', data: { token: result.token } });
});

app.use(errorMiddleware);
