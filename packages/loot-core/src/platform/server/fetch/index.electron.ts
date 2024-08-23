// // @ts-strict-ignore
import https from 'https';

import nodeFetch from 'node-fetch';

export const fetch = (input: RequestInfo | URL, options?: RequestInit) => {
  const agent = new https.Agent({ rejectUnauthorized: false }); // Insecure - leaves vulnerable to MITM attacks
  return nodeFetch(input, {
    ...options,
    headers: {
      ...options?.headers,
      origin: 'app://actual',
    },
    agent,
  });
};
