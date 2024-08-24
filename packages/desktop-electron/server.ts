import fs from 'fs';
import https from 'https';
import Module from 'module';
import tls from 'tls';

// @ts-strict-ignore
import fetch from 'node-fetch';

const supportSelfSignedCertificates = () => {
  try {
    // Scan for self signed certificates in the data directory - we support .crt and .pem
    const certFileNames = fs
      .readdirSync(process.env.ACTUAL_DATA_DIR)
      .filter(fn => fn.endsWith('.crt') || fn.endsWith('.pem'));

    const certFiles = certFileNames.map(filename =>
      fs.readFileSync(`${process.env.ACTUAL_DATA_DIR}/${filename}`),
    );

    https.globalAgent.options.ca = [...tls.rootCertificates, ...certFiles];
    console.info('Added the self signed certificate');
  } catch (error) {
    console.error('Unable to add the self signed certificate', error);
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
