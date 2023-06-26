import type * as T from '.';

export let captureException: T.CaptureException = function (exc) {
  console.log('[Exception]', exc);
};

export let captureBreadcrumb: T.CaptureBreadcrumb = function (breadcrumb) {};
