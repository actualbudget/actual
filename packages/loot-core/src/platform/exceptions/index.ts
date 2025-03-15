export const captureException = function (exc: Error) {
  console.error('[Exception]', exc);
};

// eslint-disable-next-line
export const captureBreadcrumb = function (crumb: unknown) {};
