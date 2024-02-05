import type * as T from '.';

export const captureException: T.CaptureException = function (exc) {
  console.log('[Exception]', exc);
};

export const captureBreadcrumb: T.CaptureBreadcrumb = function () {};
