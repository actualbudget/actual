export const captureException = function (exc: Error) {
  console.error('[Exception]', exc);
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const captureBreadcrumb = function (msg: unknown) {};
