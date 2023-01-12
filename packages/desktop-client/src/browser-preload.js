import * as Sentry from '@sentry/electron';

if (process.env.NODE_ENV !== 'development') {
  Sentry.init({
    dsn: 'https://f2fa901455894dc8bf28210ef1247e2d:b9e69eb21d9740539b3ff593f7346396@sentry.io/261029',
    release: window.Actual.ACTUAL_VERSION
  });

  window.SentryClient = Sentry;
}
