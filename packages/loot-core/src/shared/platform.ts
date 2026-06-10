import { UAParser } from 'ua-parser-js';

const isWindows =
  typeof navigator !== 'undefined' &&
  navigator.platform &&
  navigator.platform.toLowerCase() === 'win32';

const isMac =
  typeof navigator !== 'undefined' &&
  navigator.platform &&
  navigator.platform.toUpperCase().indexOf('MAC') >= 0;

export const isPlaywright =
  typeof navigator !== 'undefined' &&
  navigator.userAgent === 'playwright';

export const OS: 'windows' | 'mac' | 'linux' | 'unknown' = isWindows
  ? 'windows'
  : isMac
    ? 'mac'
    : 'linux';
export const env: 'web' | 'mobile' | 'unknown' = 'web';
export const isBrowser: boolean = true;

const agent = UAParser(typeof navigator !== 'undefined' ? navigator.userAgent : '');
export const isIOSAgent = agent.browser.name === 'Mobile Safari';
// True for all browsers on iOS (iPhone/iPad/iPod) — not macOS.
export const isIOS = agent.os.name === 'iOS';
