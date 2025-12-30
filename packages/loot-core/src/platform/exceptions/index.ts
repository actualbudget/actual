import { logger } from '../server/log';

export const captureException = function (exc: Error) {
  logger.error('[Exception]', exc);
};

export const captureBreadcrumb = function (crumb: unknown) {
  logger.info('[Breadcrumb]', crumb);
};
