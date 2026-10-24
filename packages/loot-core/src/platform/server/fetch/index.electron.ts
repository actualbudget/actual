import { logger } from '#platform/server/log';

import type * as T from './index';

export const fetchQuiet: typeof T.fetch = async (input, options) =>
  globalThis.fetch(input, {
    ...options,
    headers: {
      ...options?.headers,
      origin: 'app://actual',
    },
  });

export const fetch: typeof T.fetch = async (input, options) => {
  try {
    return await fetchQuiet(input, options);
  } catch (error) {
    logger.error(error); // log error
    throw error;
  }
};
