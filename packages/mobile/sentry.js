import * as Sentry from '@sentry/react-native';
import { SentryMetricIntegration } from '@jlongster/sentry-metrics-actual';

if (!__DEV__) {
  Sentry.init({
    dsn: 'https://45f67076016a4fe7bd2af69c4d37afba@sentry.io/1364085',
    ignoreErrors: ['PostError', 'HttpError'],
    integrations: [
      new SentryMetricIntegration({
        url: 'https://sync.actualbudget.com/metrics',
        metric: 'app-errors',
        dimensions: { platform: 'mobile' },
        headers: { Origin: 'app://actual-mobile' }
      })
    ]
  });

  global.SentryClient = Sentry;
}
