declare module 'absurd-sql/dist/indexeddb-main-thread' {
  export function initBackend(worker: Worker): void;
}
