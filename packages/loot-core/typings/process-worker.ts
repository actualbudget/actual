import type { MessagePort } from 'worker_threads';

declare global {
  namespace NodeJS {
    // oxlint-disable-next-line typescript/consistent-type-definitions -- global Process augmentation requires interface for declaration merging
    interface Process {
      parentPort?: MessagePort;
    }
  }
}

export {};
