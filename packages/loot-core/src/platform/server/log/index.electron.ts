import type { Logger } from '.';

export const logger: Logger = {
  info: (...args) => {
    console.log(...args);
  },
  warn: (...args) => {
    console.warn(...args);
  },
};
