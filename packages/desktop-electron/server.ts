// @ts-strict-ignore

import fs from 'fs';
import https from 'https';
import Module from 'module';
import tls from 'tls';

import fetch from 'node-fetch';

const supportSelfSignedCertificates = () => {
  // If we have specified a custom authority, we do this code
  // Read it from settings?
  if (true) {
    const cas = [...tls.rootCertificates];
    https.globalAgent.options.ca = cas;
    https.globalAgent.options.ca.push(fs.readFileSync(`path/to/rootCA.pem`));
  }
};

Module.globalPaths.push(__dirname + '/..');
global.fetch = fetch;

const lazyLoadBackend = async (isDev: boolean) => {
  // eslint-disable-next-line import/extensions
  const bundle = await import('loot-core/lib-dist/bundle.desktop.js');
  bundle.initApp(isDev);
};

const isDev = false;

// Start the app
supportSelfSignedCertificates();
lazyLoadBackend(isDev);
