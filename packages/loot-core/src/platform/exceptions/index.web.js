/* global globalThis */

export function captureException(exc) {
  console.log('[Exception]', exc);
  if (globalThis.SentryClient) {
    globalThis.SentryClient.captureException(exc);
  }
}

export function captureBreadcrumb(breadcrumb) {
  if (globalThis.SentryClient) {
    globalThis.SentryClient.addBreadcrumb(breadcrumb);
  }
}
