export interface Logger {
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
}

export const logger: Logger;
