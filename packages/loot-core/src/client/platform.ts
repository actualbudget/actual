let isWindows =
  navigator.platform && navigator.platform.toLowerCase() === 'win32';

let isMac =
  navigator.platform && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

export let isProbablySafari = /^((?!chrome|android).)*safari/i.test(
  navigator.userAgent,
);

export let OS = isWindows ? 'windows' : isMac ? 'mac' : 'linux';
export let env: 'web' | 'mobile' = 'web';
export let isBrowser = !!window.Actual?.IS_FAKE_WEB;
