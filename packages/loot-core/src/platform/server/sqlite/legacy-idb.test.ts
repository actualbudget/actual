import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';

import { openLegacyDatabaseReader } from './legacy-idb';

async function readLegacyDatabase(filepath: string) {
  const reader = await openLegacyDatabaseReader(filepath);
  if (reader === null) {
    return null;
  }
  try {
    const contents = new Uint8Array(reader.size);
    let offset = 0;
    while (true) {
      const block = await reader.readNext();
      if (block === undefined) {
        return contents;
      }
      contents.set(block, offset);
      offset += block.byteLength;
    }
  } finally {
    reader.close();
  }
}

function openLegacyStore(name: string) {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(name, 2);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('data');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function waitForTransaction(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

async function seedFirstBlock(name: string, firstBlock: Uint8Array) {
  const database = await openLegacyStore(name);
  const transaction = database.transaction('data', 'readwrite');
  transaction.objectStore('data').put({ size: firstBlock.byteLength }, -1);
  transaction.objectStore('data').put(firstBlock.buffer, 0);
  await waitForTransaction(transaction);
  database.close();
}

beforeEach(() => {
  global.indexedDB = new IDBFactory();
});

it('reassembles an absurd-sql block database', async () => {
  const contents = new Uint8Array(1024);
  contents.set(new TextEncoder().encode('SQLite format 3\0'));
  contents[16] = 2;
  contents[17] = 0;
  contents.fill(23, 100, 512);
  contents.fill(42, 512);

  const database = await openLegacyStore(
    'documents-Actual-test-budget-db.sqlite',
  );
  const transaction = database.transaction('data', 'readwrite');
  const store = transaction.objectStore('data');
  store.put({ size: contents.byteLength }, -1);
  store.put(contents.slice(0, 512).buffer, 0);
  store.put(contents.slice(512).buffer, 1);
  await waitForTransaction(transaction);
  database.close();

  await expect(
    readLegacyDatabase('/documents/Actual/test-budget/db.sqlite'),
  ).resolves.toEqual(contents);
});

it('returns null when the absurd-sql database does not exist', async () => {
  await expect(
    readLegacyDatabase('/documents/Actual/missing/db.sqlite'),
  ).resolves.toBeNull();
});

it.each([
  {
    name: 'bad-header',
    configure: (_block: Uint8Array) => undefined,
    message: 'SQLite header is missing',
  },
  {
    name: 'bad-page-size',
    configure: (block: Uint8Array) => {
      block.set(new TextEncoder().encode('SQLite format 3\0'));
      block[16] = 3;
    },
    message: 'bad page size',
  },
])(
  'rejects a legacy database with $name',
  async ({ name, configure, message }) => {
    const block = new Uint8Array(512);
    configure(block);
    await seedFirstBlock(`documents-Actual-${name}-db.sqlite`, block);

    await expect(
      openLegacyDatabaseReader(`/documents/Actual/${name}/db.sqlite`),
    ).rejects.toThrow(message);
  },
);

it('fences an already-open absurd-sql v2 connection before reading', async () => {
  const name = 'documents-Actual-fenced-db.sqlite';
  const database = await openLegacyStore(name);
  const transaction = database.transaction('data', 'readwrite');
  const firstBlock = new Uint8Array(512);
  firstBlock.set(new TextEncoder().encode('SQLite format 3\0'));
  firstBlock[16] = 2;
  transaction.objectStore('data').put({ size: 512 }, -1);
  transaction.objectStore('data').put(firstBlock.buffer, 0);
  await waitForTransaction(transaction);

  let didReceiveVersionChange = false;
  database.onversionchange = () => {
    didReceiveVersionChange = true;
    database.close();
  };

  const reader = await openLegacyDatabaseReader(
    '/documents/Actual/fenced/db.sqlite',
  );
  expect(reader).not.toBeNull();
  expect(didReceiveVersionChange).toBe(true);
  reader?.close();

  await expect(
    new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(name, 2);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    }),
  ).rejects.toMatchObject({ name: 'VersionError' });
});

it('streams a many-block sparse database one block at a time', async () => {
  const blockSize = 512;
  const blockCount = 64;
  const name = 'documents-Actual-large-db.sqlite';
  const database = await openLegacyStore(name);
  const transaction = database.transaction('data', 'readwrite');
  const store = transaction.objectStore('data');
  store.put({ size: blockSize * blockCount }, -1);
  for (let index = 0; index < blockCount; index++) {
    if (index === 17) {
      continue;
    }
    const block = new Uint8Array(blockSize).fill(index);
    if (index === 0) {
      block.set(new TextEncoder().encode('SQLite format 3\0'));
      block[16] = 2;
    }
    store.put(block.buffer, index);
  }
  await waitForTransaction(transaction);
  database.close();

  const reader = await openLegacyDatabaseReader(
    '/documents/Actual/large/db.sqlite',
  );
  expect(reader?.size).toBe(blockSize * blockCount);
  try {
    for (let index = 0; index < blockCount; index++) {
      const block = await reader?.readNext();
      expect(block).toHaveLength(blockSize);
      expect(block?.[blockSize - 1]).toBe(index === 17 ? 0 : index);
    }
    await expect(reader?.readNext()).resolves.toBeUndefined();
  } finally {
    reader?.close();
  }
});
