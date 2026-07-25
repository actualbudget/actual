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
  navigator.userAgent.includes('playwright');

export const OS: 'windows' | 'mac' | 'linux' | 'unknown' = isWindows
  ? 'windows'
  : isMac
    ? 'mac'
    : 'linux';
export const env: 'web' | 'mobile' | 'unknown' = 'web';
export const isBrowser: boolean = true;

const userAgent = navigator.userAgent;

// True for all browsers on iOS (iPhone/iPad/iPod) — not macOS.
export const isIOS = /iP(hone|ad|od)/.test(userAgent);

export const isAndroid = /Android/.test(userAgent);

// True only for Safari on iOS — Chrome (CriOS), Firefox (FxiOS), Edge (EdgiOS),
// etc. carry their own tokens and are excluded.
export const isIOSAgent =
  isIOS &&
  /Safari/.test(userAgent) &&
  /Mobile\//.test(userAgent) &&
  !/(CriOS|FxiOS|EdgiOS|OPiOS|mercury)/.test(userAgent);
