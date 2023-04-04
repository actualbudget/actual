import type Logger from '.';

const logger: Logger = {
  info: (...args) => {
    console.log(...args);
  },
  warn: (...args) => {
    console.warn(...args);
  },
};
export default logger;
