const isWindows =
  navigator.platform && navigator.platform.toLowerCase() === 'win32';

const isMac =
  navigator.platform && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

export const isProbablySafari = /^((?!chrome|android).)*safari/i.test(
  navigator.userAgent,
);

export const OS = isWindows ? 'windows' : isMac ? 'mac' : 'linux';
export const env: 'web' | 'mobile' = 'web';
export const isBrowser = !!window.Actual?.IS_FAKE_WEB;
