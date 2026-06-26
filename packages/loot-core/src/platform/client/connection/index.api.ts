import { lib } from '#server/main';
import type { Handlers } from '#types/handlers';

import type * as T from './index-types';

// In-process client for the api/node platform.
export const send = (async <K extends keyof Handlers>(
  name: K,
  args?: Parameters<Handlers[K]>[0],
  options?: { catchErrors?: boolean },
) => {
  if (options?.catchErrors) {
    try {
      return { data: await lib.send(name, args), error: undefined };
    } catch (error) {
      return { data: undefined, error };
    }
  }
  return lib.send(name, args);
}) as T.Send;
