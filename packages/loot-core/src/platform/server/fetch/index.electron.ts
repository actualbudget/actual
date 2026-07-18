import { logger } from '#platform/server/log';

import type * as T from './index';

function getOriginHeader(input: RequestInfo | URL): { origin: string } | null {
  let url: URL;
  try {
    url = new URL(input instanceof Request ? input.url : input);
  } catch {
    return null;
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    return null;
  }

  return { origin: url.origin };
}

export const fetch: typeof T.fetch = async (input, options) => {
  try {
    return await globalThis.fetch(input, {
      ...options,
      headers: {
        ...options?.headers,
        ...getOriginHeader(input),
      },
    });
  } catch (error) {
    logger.error(error); // log error
    throw error;
  }
};
