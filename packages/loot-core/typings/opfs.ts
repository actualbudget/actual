// The backend runs in a dedicated worker, where the origin private file
// system exposes synchronous access handles. loot-core compiles against
// the DOM lib, which only declares the asynchronous parts, so add the
// worker-only pieces here.
export {};

declare global {
  // oxlint-disable-next-line typescript/consistent-type-definitions -- a lib type of the same name may exist; an interface merges with it instead of clashing
  interface FileSystemSyncAccessHandle {
    read(
      buffer: ArrayBufferView | ArrayBuffer,
      options?: { at?: number },
    ): number;
    write(
      buffer: ArrayBufferView | ArrayBuffer,
      options?: { at?: number },
    ): number;
    truncate(newSize: number): void;
    getSize(): number;
    flush(): void;
    close(): void;
  }

  // oxlint-disable-next-line typescript/consistent-type-definitions -- augmenting the DOM's FileSystemFileHandle requires an interface for declaration merging
  interface FileSystemFileHandle {
    createSyncAccessHandle(): Promise<FileSystemSyncAccessHandle>;
  }
}
