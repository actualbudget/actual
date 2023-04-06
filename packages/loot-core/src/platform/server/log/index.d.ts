import { type Transports } from 'electron-log';

interface Logger {
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  transports?: Transports;
}

export default Logger;
