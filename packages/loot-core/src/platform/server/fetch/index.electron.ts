import { logger } from '../log';

import type * as T from './index';

export const fetch: typeof T.fetch = async (input, options) => {
  try {
    return await globalThis.fetch(input, {
      ...options,
      headers: {
        ...options?.headers,
        origin: 'app://actual',
      },
    });
  } catch (error) {
    logger.error(error); // log error
    throw error;
  }
};
