// Type augmentations for the parts of the File System Access API that
// TypeScript's DOM lib does not ship yet. Only Chromium-based browsers
// implement these, so `showDirectoryPicker` is declared optional to force
// feature detection at the call site.

export type FileSystemPermissionMode = 'read' | 'readwrite';

export type FileSystemHandlePermissionDescriptor = {
  mode?: FileSystemPermissionMode;
};

export type DirectoryPickerOptions = {
  id?: string;
  mode?: FileSystemPermissionMode;
  startIn?:
    | FileSystemHandle
    | 'desktop'
    | 'documents'
    | 'downloads'
    | 'music'
    | 'pictures'
    | 'videos';
};

declare global {
  // oxlint-disable-next-line typescript/consistent-type-definitions -- global augmentation requires interface
  interface FileSystemHandle {
    queryPermission(
      descriptor?: FileSystemHandlePermissionDescriptor,
    ): Promise<PermissionState>;
    requestPermission(
      descriptor?: FileSystemHandlePermissionDescriptor,
    ): Promise<PermissionState>;
  }

  // oxlint-disable-next-line typescript/consistent-type-definitions -- global augmentation requires interface
  interface Window {
    showDirectoryPicker?: (
      options?: DirectoryPickerOptions,
    ) => Promise<FileSystemDirectoryHandle>;
  }
}
