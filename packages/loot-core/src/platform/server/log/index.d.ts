import { type Transports } from 'electron-log';

export interface Logger {
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  transports?: Transports;
}

const logger: Logger;
export default logger;
