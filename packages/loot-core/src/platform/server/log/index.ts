let verboseMode = true;

export function setVerboseMode(verbose: boolean) {
  verboseMode = verbose;
}

export function isVerboseMode(): boolean {
  return verboseMode;
}

export const logger = {
  info: (...args: unknown[]) => {
    if (verboseMode) {
      console.log(...args);
    }
  },
  warn: (...args: unknown[]) => {
    console.warn(...args);
  },
  log: (...args: unknown[]) => {
    if (verboseMode) {
      console.log(...args);
    }
  },
  error: (...args: unknown[]) => {
    console.error(...args);
  },
  debug: (...args: unknown[]) => {
    if (verboseMode) {
      console.debug(...args);
    }
  },
  group: (...args: unknown[]) => {
    if (verboseMode) {
      console.group(...args);
    }
  },
  groupEnd: () => {
    if (verboseMode) {
      console.groupEnd();
    }
  },
};
