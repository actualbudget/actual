import logger from 'electron-log';

import type * as T from '.';

if (logger.transports) {
  logger.transports.file.appName = 'Actual';
  logger.transports.file.level = 'info';
  logger.transports.file.maxSize = 7 * 1024 * 1024;
  logger.transports.console.level = false;
}

export default logger as T.Logger;
