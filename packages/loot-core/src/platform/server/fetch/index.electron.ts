// // @ts-strict-ignore
import fs from 'fs';
import https from 'https';
import tls from 'tls';

import nodeFetch from 'node-fetch';

export const fetch = (input: RequestInfo | URL, options?: RequestInit) => {
  const cas = [...tls.rootCertificates];
  // const cert = fs.readFileSync(`${process.env.ACTUAL_DATA_DIR}/localhost.pem`);
  // const key = fs.readFileSync(
  //   `${process.env.ACTUAL_DATA_DIR}/localhost-key.pem`,
  // );
  cas.push(fs.readFileSync(`${process.env.ACTUAL_DATA_DIR}/cert.pem`, 'ascii'));
  // https.globalAgent.options.cert = cert;
  https.globalAgent.options.ca = cas; // this should work but doesn't.....
  // https.globalAgent.options.key = key;
  // https.globalAgent.options.ca = cas;
  // https.globalAgent.options.rejectUnauthorized = false; // Insecure - leaves vulnerable to MITM attacks

  return nodeFetch(input, {
    ...options,
    headers: {
      ...options?.headers,
      origin: 'app://actual',
    },
  });
};
