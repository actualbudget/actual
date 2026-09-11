// Backup destination backed by the File System Access API: a folder the
// user picked on their device. Chromium desktop browsers only.

import { parseBackupFilename } from '@actual-app/core/shared/backups';
import type { BackupEntry } from '@actual-app/core/shared/backups';

import { createAccessLostError } from '#backups/types';
import type {
  BackupDestination,
  BackupDestinationStatus,
  BackupProvider,
  BackupProviderContext,
} from '#backups/types';

const DIRECTORY_PICKER_ID = 'actual-backups';

export const folderProvider: BackupProvider = {
  kind: 'folder',
  availability: 'available',

  isSupported() {
    return (
      typeof window !== 'undefined' &&
      typeof window.showDirectoryPicker === 'function'
    );
  },

  async connect(context: BackupProviderContext) {
    if (!window.showDirectoryPicker) {
      throw new Error('The File System Access API is not available');
    }

    let handle: FileSystemDirectoryHandle;
    try {
      handle = await window.showDirectoryPicker({
        id: DIRECTORY_PICKER_ID,
        mode: 'readwrite',
        startIn: 'documents',
      });
    } catch (error) {
      if (isDomException(error, 'AbortError')) {
        return null;
      }
      throw error;
    }

    return {
      destination: createFolderDestination(handle, context.budgetName),
      payload: handle,
    };
  },

  async restore(payload: unknown, context: BackupProviderContext) {
    if (!isDirectoryHandle(payload)) {
      return null;
    }
    return createFolderDestination(payload, context.budgetName);
  },
};

/**
 * Backups for a budget go into `<folder>/<budget name>/<timestamp>.zip` so
 * several budgets can share one backup folder.
 */
export function createFolderDestination(
  handle: FileSystemDirectoryHandle,
  budgetName: string,
): BackupDestination {
  const subfolderName = sanitizeFolderName(budgetName);

  async function getSubfolder(): Promise<FileSystemDirectoryHandle> {
    return handle.getDirectoryHandle(subfolderName, { create: true });
  }

  return {
    kind: 'folder',
    label: handle.name,

    async getStatus() {
      return toStatus(await handle.queryPermission({ mode: 'readwrite' }));
    },

    async reconnect() {
      return toStatus(await handle.requestPermission({ mode: 'readwrite' }));
    },

    write: guarded(async (name: string, data: Uint8Array) => {
      const folder = await getSubfolder();
      const file = await folder.getFileHandle(name, { create: true });
      const writable = await file.createWritable();
      try {
        // The export arrives from the worker as a plain Uint8Array; TS's
        // BufferSource type wants an ArrayBuffer-backed view, which it is.
        await writable.write(data as BufferSource);
        await writable.close();
      } catch (error) {
        await writable.abort().catch(() => undefined);
        throw error;
      }
    }),

    list: guarded(async () => {
      const folder = await getSubfolder();
      const entries: BackupEntry[] = [];
      for await (const entry of folder.values()) {
        if (entry.kind !== 'file' || !entry.name.endsWith('.zip')) {
          continue;
        }
        const parsedDate = parseBackupFilename(entry.name);
        const date =
          parsedDate ??
          new Date(
            (await (entry as FileSystemFileHandle).getFile()).lastModified,
          );
        entries.push({ id: entry.name, date });
      }
      return entries;
    }),

    remove: guarded(async (id: string) => {
      const folder = await getSubfolder();
      await folder.removeEntry(id);
    }),
  };
}

export function sanitizeFolderName(name: string): string {
  const cleaned = name
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/[. ]+$/, '')
    .trim()
    .slice(0, 100);
  return cleaned || 'budget';
}

function toStatus(permission: PermissionState): BackupDestinationStatus {
  switch (permission) {
    case 'granted':
      return 'ready';
    case 'denied':
      return 'denied';
    default:
      return 'needs-reconnect';
  }
}

/** Converts the browser's NotAllowedError into the shared access-lost error. */
function guarded<Args extends unknown[], Result>(
  operation: (...args: Args) => Promise<Result>,
): (...args: Args) => Promise<Result> {
  return async (...args) => {
    try {
      return await operation(...args);
    } catch (error) {
      if (isDomException(error, 'NotAllowedError')) {
        throw createAccessLostError(error);
      }
      throw error;
    }
  };
}

function isDirectoryHandle(value: unknown): value is FileSystemDirectoryHandle {
  return (
    typeof FileSystemDirectoryHandle !== 'undefined' &&
    value instanceof FileSystemDirectoryHandle
  );
}

function isDomException(error: unknown, name: string): boolean {
  return error instanceof DOMException && error.name === name;
}
