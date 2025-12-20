import os from 'os';

const isWindows = os.platform() === 'win32';
const isMac = os.platform() === 'darwin';
const isLinux = os.platform() === 'linux';

export const isPlaywright = false;

export const OS: 'windows' | 'mac' | 'linux' | 'unknown' = isWindows
  ? 'windows'
  : isMac
    ? 'mac'
    : isLinux
      ? 'linux'
      : 'unknown';
export const env: 'web' | 'mobile' | 'unknown' = 'unknown';
export const isBrowser = false;

export const isIOSAgent = false;
