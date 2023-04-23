import type * as T from '.';

const logger: T.Logger = {
  info: (...args) => {
    console.log(...args);
  },
  warn: (...args) => {
    console.warn(...args);
  },
};
export default logger;
