import * as os from 'os';

import type * as T from './index';

export const getAvailableMemory: typeof T.getAvailableMemory = () =>
  os.freemem();
