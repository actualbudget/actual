export const captureException = function (exc: Error) {
  console.error('[Exception]', exc);
};

export const captureBreadcrumb = function (_crumb: unknown) {};
