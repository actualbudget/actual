interface Logger {
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  transports?: any;
}

export default Logger;
