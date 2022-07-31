import * as Sentry from '@actual-app/mobile/node_modules/@sentry/react-native';

export function captureException(exc) {
  console.log('[Exception]', exc);
  Sentry.captureException(exc);
}

export function captureBreadcrumb(breadcrumb) {
  console.log('[Breadcrumb]', breadcrumb);
  Sentry.addBreadcrumb(breadcrumb);
}
