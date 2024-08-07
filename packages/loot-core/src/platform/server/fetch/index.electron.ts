// // @ts-strict-ignore
import nodeFetch from 'node-fetch';

export const fetch = (input: RequestInfo | URL, options?: RequestInit) => {
  return nodeFetch(input, {
    ...options,
    headers: {
      ...options?.headers,
      origin: 'app://actual',
    },
  });
};
