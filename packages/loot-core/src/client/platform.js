const isWindows =
  navigator.platform && navigator.platform.toLowerCase() === 'win32';

const isMac =
  navigator.platform && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

const isProbablySafari = /^((?!chrome|android).)*safari/i.test(
  navigator.userAgent,
);

export default {
  OS: isWindows ? 'windows' : isMac ? 'mac' : 'linux',
  env: 'web',
  isBrowser: !!window.Actual?.IS_FAKE_WEB,
  isProbablySafari,
};
