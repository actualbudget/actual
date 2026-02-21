import os from 'os';

import type * as T from './platform';

const isWindows = os.platform() === 'win32';
const isMac = os.platform() === 'darwin';
const isLinux = os.platform() === 'linux';

export const isPlaywright = false;

export const OS: typeof T.OS = isWindows
  ? 'windows'
  : isMac
    ? 'mac'
    : isLinux
      ? 'linux'
      : 'unknown';
export const env: typeof T.env = 'unknown';
export const isBrowser: typeof T.isBrowser = false;

export const isIOSAgent: typeof T.isIOSAgent = false;
