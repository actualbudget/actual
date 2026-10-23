import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';

import { bootstrap } from './account-db';
import * as accountApp from './app-account';
import * as adminApp from './app-admin';
import * as akahuApp from './app-akahu/app-akahu.js';
import * as corsApp from './app-cors-proxy';
import * as enableBankingApp from './app-enablebanking/app-enablebanking';
import * as goCardlessApp from './app-gocardless/app-gocardless';
import * as openidApp from './app-openid';
import * as pluggai from './app-pluggyai/app-pluggyai';
import * as secretApp from './app-secrets';
import * as simpleFinApp from './app-simplefin/app-simplefin';
import * as syncApp from './app-sync';
import { config } from './load-config';

/**
 * Builds the API app: middleware plus every API route. Runtime-specific
 * concerns (serving the web frontend, listening, process metrics) are added
 * by the caller.
 */
export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(cors());
  app.set('trust proxy', config.get('trustedProxies'));
  if (process.env.NODE_ENV !== 'development') {
    app.use(
      rateLimit({
        windowMs: 60 * 1000,
        max: 500,
        legacyHeaders: false,
        standardHeaders: true,
      }),
    );
  }

  app.use(express.json({ limit: `${config.get('upload.fileSizeLimitMB')}mb` }));

  app.use(
    express.raw({
      type: 'application/actual-sync',
      limit: `${config.get('upload.fileSizeSyncLimitMB')}mb`,
    }),
  );

  app.use(
    express.raw({
      type: 'application/encrypted-file',
      limit: `${config.get('upload.syncEncryptedFileSizeLimitMB')}mb`,
    }),
  );

  app.use('/sync', syncApp.handlers);
  app.use('/account', accountApp.handlers);
  app.use('/gocardless', goCardlessApp.handlers);
  app.use('/simplefin', simpleFinApp.handlers);
  app.use('/pluggyai', pluggai.handlers);
  app.use('/akahu', akahuApp.handlers);
  app.use('/enablebanking', enableBankingApp.handlers);
  app.use('/secret', secretApp.handlers);

  if (config.get('corsProxy.enabled')) {
    app.use('/cors-proxy', corsApp.handlers);
  }

  app.use('/admin', adminApp.handlers);
  app.use('/openid', openidApp.handlers);

  app.get('/mode', (req, res) => {
    res.send(config.get('mode'));
  });

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'UP' });
  });

  return app;
}

/** Applies OpenID settings from config (env vars / config.json), if any. */
export async function setupOpenIdFromConfig() {
  const openIdConfig = config?.getProperties()?.openId;
  if (
    openIdConfig?.discoveryURL ||
    openIdConfig?.issuer?.authorization_endpoint
  ) {
    console.log('OpenID configuration found. Preparing server to use it');
    try {
      const result = await bootstrap({ openId: openIdConfig }, true);
      if ('error' in result && result.error) {
        console.log(result.error);
      } else {
        console.log('OpenID configured!');
      }
    } catch (err) {
      console.error(err);
    }
  }
}
