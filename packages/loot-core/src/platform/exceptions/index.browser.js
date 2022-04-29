/* global SentryClient */

export function captureException(exc) {
  console.log('[Exception]', exc);
  SentryClient.captureException(exc);
}

export function captureBreadcrumb(breadcrumb) {
  SentryClient.addBreadcrumb(breadcrumb);
}
