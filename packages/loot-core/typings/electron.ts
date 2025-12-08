// Type augmentation for Electron's process.parentPort
// When running in an Electron worker thread context

interface ParentPort {
  on(event: 'message', listener: (message: { data: any }) => void): void;
  postMessage(message: unknown): void;
}

declare global {
  namespace NodeJS {
    interface Process {
      parentPort?: ParentPort;
    }
  }
}

export {};
