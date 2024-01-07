import electronLogger from 'electron-log';

import type * as T from '.';

if (electronLogger.transports) {
  electronLogger.transports.file.appName = 'Actual';
  electronLogger.transports.file.level = 'info';
  electronLogger.transports.file.maxSize = 7 * 1024 * 1024;
  electronLogger.transports.console.level = false;
}

export const logger: T.Logger = electronLogger;
