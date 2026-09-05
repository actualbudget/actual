import { isAccessLostError } from '#backups/types';

import { createFolderDestination, sanitizeFolderName } from './folder';

type FakeFile = { name: string; lastModified: number; contents: unknown[] };

type FakeEntry = {
  kind: 'file';
  name: string;
  getFile: () => Promise<{ lastModified: number }>;
};

type FakeDirectoryHandle = {
  kind: 'directory';
  name: string;
  queryPermission: ReturnType<typeof vi.fn<() => Promise<PermissionState>>>;
  requestPermission: ReturnType<typeof vi.fn<() => Promise<PermissionState>>>;
  removeEntry: ReturnType<typeof vi.fn<(name: string) => Promise<void>>>;
  getDirectoryHandle: ReturnType<
    typeof vi.fn<(name: string) => Promise<FakeDirectoryHandle>>
  >;
  getFileHandle: ReturnType<typeof vi.fn<(name: string) => Promise<unknown>>>;
  values: () => AsyncGenerator<FakeEntry>;
};

type FakeDirectory = {
  directory: FakeDirectoryHandle;
  files: Map<string, FakeFile>;
  subfolders: Map<string, FakeDirectory>;
};

function createFakeDirectory(
  name = 'root',
  existingFiles: FakeFile[] = [],
): FakeDirectory {
  const files = new Map(existingFiles.map(file => [file.name, file]));
  const subfolders = new Map<string, FakeDirectory>();

  const directory: FakeDirectoryHandle = {
    kind: 'directory',
    name,
    queryPermission: vi.fn(async () => 'granted' as const),
    requestPermission: vi.fn(async () => 'granted' as const),
    removeEntry: vi.fn(async (fileName: string) => {
      files.delete(fileName);
    }),
    getDirectoryHandle: vi.fn(async (subfolderName: string) => {
      let subfolder = subfolders.get(subfolderName);
      if (!subfolder) {
        subfolder = createFakeDirectory(subfolderName);
        subfolders.set(subfolderName, subfolder);
      }
      return subfolder.directory;
    }),
    getFileHandle: vi.fn(async (fileName: string) => {
      const file: FakeFile = files.get(fileName) ?? {
        name: fileName,
        lastModified: Date.now(),
        contents: [],
      };
      files.set(fileName, file);
      return {
        kind: 'file' as const,
        name: fileName,
        createWritable: async () => ({
          write: vi.fn(async (chunk: unknown) => {
            file.contents.push(chunk);
          }),
          close: vi.fn(async () => undefined),
          abort: vi.fn(async () => undefined),
        }),
      };
    }),
    values: async function* () {
      for (const file of files.values()) {
        yield {
          kind: 'file' as const,
          name: file.name,
          getFile: async () => ({ lastModified: file.lastModified }),
        };
      }
    },
  };

  return { directory, files, subfolders };
}

function asHandle(directory: FakeDirectoryHandle): FileSystemDirectoryHandle {
  return directory as unknown as FileSystemDirectoryHandle;
}

describe('sanitizeFolderName', () => {
  it('replaces characters that are illegal in folder names', () => {
    expect(sanitizeFolderName('My/Budget: 2024?')).toBe('My_Budget_ 2024_');
  });

  it('falls back to a default name', () => {
    expect(sanitizeFolderName('   ')).toBe('budget');
    expect(sanitizeFolderName('...')).toBe('budget');
  });
});

describe('createFolderDestination', () => {
  it('uses the folder name as its label', () => {
    const root = createFakeDirectory('Backups');
    const destination = createFolderDestination(
      asHandle(root.directory),
      'My Budget',
    );
    expect(destination.kind).toBe('folder');
    expect(destination.label).toBe('Backups');
  });

  it('maps browser permission states to destination statuses', async () => {
    const root = createFakeDirectory();
    const destination = createFolderDestination(
      asHandle(root.directory),
      'Budget',
    );

    root.directory.queryPermission.mockResolvedValue('prompt');
    expect(await destination.getStatus()).toBe('needs-reconnect');

    root.directory.queryPermission.mockResolvedValue('denied');
    expect(await destination.getStatus()).toBe('denied');

    root.directory.requestPermission.mockResolvedValue('granted');
    expect(await destination.reconnect()).toBe('ready');
  });

  it('writes into a subfolder named after the budget', async () => {
    const root = createFakeDirectory();
    const destination = createFolderDestination(
      asHandle(root.directory),
      'My/Budget',
    );
    const data = new Uint8Array([1, 2, 3]);

    await destination.write('2017-01-01_10-00-00.zip', data);

    expect(root.directory.getDirectoryHandle).toHaveBeenCalledWith(
      'My_Budget',
      { create: true },
    );
    const subfolder = root.subfolders.get('My_Budget');
    expect(subfolder?.files.get('2017-01-01_10-00-00.zip')?.contents).toEqual([
      data,
    ]);
  });

  it('lists zip files with dates parsed from their names', async () => {
    const root = createFakeDirectory();
    const subfolder = createFakeDirectory('Budget', [
      { name: '2017-01-01_10-00-00.zip', lastModified: 0, contents: [] },
      { name: 'notes.txt', lastModified: 0, contents: [] },
      { name: 'other.zip', lastModified: 5000, contents: [] },
    ]);
    root.subfolders.set('Budget', subfolder);
    root.directory.getDirectoryHandle.mockResolvedValue(subfolder.directory);
    const destination = createFolderDestination(
      asHandle(root.directory),
      'Budget',
    );

    const entries = await destination.list();

    expect(entries).toEqual([
      {
        id: '2017-01-01_10-00-00.zip',
        date: new Date(2017, 0, 1, 10, 0, 0),
      },
      { id: 'other.zip', date: new Date(5000) },
    ]);
  });

  it('removes entries from the subfolder', async () => {
    const root = createFakeDirectory();
    const subfolder = createFakeDirectory('Budget', [
      { name: 'old.zip', lastModified: 0, contents: [] },
    ]);
    root.subfolders.set('Budget', subfolder);
    root.directory.getDirectoryHandle.mockResolvedValue(subfolder.directory);
    const destination = createFolderDestination(
      asHandle(root.directory),
      'Budget',
    );

    await destination.remove('old.zip');

    expect(subfolder.directory.removeEntry).toHaveBeenCalledWith('old.zip');
    expect(subfolder.files.has('old.zip')).toBe(false);
  });

  it('converts NotAllowedError into the shared access-lost error', async () => {
    const root = createFakeDirectory();
    root.directory.getDirectoryHandle.mockRejectedValue(
      new DOMException('denied', 'NotAllowedError'),
    );
    const destination = createFolderDestination(
      asHandle(root.directory),
      'Budget',
    );

    await expect(destination.list()).rejects.toSatisfy(isAccessLostError);
  });

  it('passes other errors through unchanged', async () => {
    const root = createFakeDirectory();
    const error = new Error('disk full');
    root.directory.getDirectoryHandle.mockRejectedValue(error);
    const destination = createFolderDestination(
      asHandle(root.directory),
      'Budget',
    );

    await expect(destination.remove('x.zip')).rejects.toBe(error);
  });
});
