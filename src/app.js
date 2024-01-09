import fs from 'node:fs';
import express from 'express';
import actuator from 'express-actuator';
import bodyParser from 'body-parser';
import cors from 'cors';
import config from './load-config.js';
import rateLimit from 'express-rate-limit';

import * as accountApp from './app-account.js';
import * as syncApp from './app-sync.js';
import * as goCardlessApp from './app-gocardless/app-gocardless.js';
import * as secretApp from './app-secrets.js';

const app = express();

process.on('unhandledRejection', (reason) => {
  console.log('Rejection:', reason);
});

app.disable('x-powered-by');
app.use(cors());
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 500,
    legacyHeaders: false,
    standardHeaders: true,
  }),
);
app.use(bodyParser.json({ limit: `${config.upload.fileSizeLimitMB}mb` }));
app.use(
  bodyParser.raw({
    type: 'application/actual-sync',
    limit: `${config.upload.fileSizeSyncLimitMB}mb`,
  }),
);
app.use(
  bodyParser.raw({
    type: 'application/encrypted-file',
    limit: `${config.upload.syncEncryptedFileSizeLimitMB}mb`,
  }),
);

app.use('/sync', syncApp.handlers);
app.use('/account', accountApp.handlers);
app.use('/gocardless', goCardlessApp.handlers);
app.use('/secret', secretApp.handlers);

app.get('/mode', (req, res) => {
  res.send(config.mode);
});

app.use(actuator()); // Provides /health, /metrics, /info

// The web frontend
app.use((req, res, next) => {
  res.set('Cross-Origin-Opener-Policy', 'same-origin');
  res.set('Cross-Origin-Embedder-Policy', 'require-corp');
  next();
});
app.use(express.static(config.webRoot, { index: false }));

app.get('/*', (req, res) => res.sendFile(config.webRoot + '/index.html'));

function parseHTTPSConfig(value) {
  if (value.startsWith('-----BEGIN')) {
    return value;
  }
  return fs.readFileSync(value);
}

export default async function run() {
  if (config.https) {
    const https = await import('node:https');
    const httpsOptions = {
      ...config.https,
      key: parseHTTPSConfig(config.https.key),
      cert: parseHTTPSConfig(config.https.cert),
    };
    https.createServer(httpsOptions, app).listen(config.port, config.hostname);
  } else {
    app.listen(config.port, config.hostname);
  }
  console.log('Listening on ' + config.hostname + ':' + config.port + '...');
}
