import type * as T from '.';

export const logger: T.Logger = {
  info: (...args) => {
    console.log(...args);
  },
  warn: (...args) => {
    console.warn(...args);
  },
};
