export function captureException(exc) {
  console.log('[Exception]', exc);
  if (global.SentryClient) {
    global.SentryClient.captureException(exc);
  }
}

export function captureBreadcrumb(breadcrumb) {
  if (global.SentryClient) {
    global.SentryClient.addBreadcrumb(breadcrumb);
  }
}
