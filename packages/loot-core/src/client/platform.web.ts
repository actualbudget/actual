const isWindows =
  navigator.platform && navigator.platform.toLowerCase() === 'win32';

const isMac =
  navigator.platform && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

export const isPlaywright = navigator.userAgent === 'playwright';

export const OS: 'windows' | 'mac' | 'linux' | 'unknown' = isWindows
  ? 'windows'
  : isMac
  ? 'mac'
  : 'linux';
export const env: 'web' | 'mobile' | 'unknown' = 'web';
export const isBrowser = true;
