import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ReadableStream as NodeWebReadableStream } from 'node:stream/web';

import { getWorkerdRuntime } from '#workerd/runtime';

import type { BlobStore, MigrationStateStore, SyncStore } from './types';

// Cloudflare implementation of the storage seams:
// - each sync group is its own SyncGroup Durable Object
// - budget files live in the USER_FILES R2 bucket under the same names the
//   Node server uses on disk
// - migration state is kept in the ActualServer Durable Object's KV storage

const MIGRATION_STATE_KEY = 'migrate-state';

function userFileKey(fileId: string) {
  return `file-${fileId}.blob`;
}

export const syncStore: SyncStore = {
  async sync(messages, since, groupId) {
    const group = getWorkerdRuntime().env.SYNC_GROUP.getByName(groupId);
    // Strip protobuf metadata so only plain data crosses the RPC boundary.
    return group.sync(
      messages.map(({ timestamp, isEncrypted, content }) => ({
        timestamp,
        isEncrypted,
        content,
      })),
      since,
    );
  },
  async deleteGroup(groupId) {
    await getWorkerdRuntime().env.SYNC_GROUP.getByName(groupId).deleteAll();
  },
};

export const blobStore: BlobStore = {
  async write(fileId, data) {
    await getWorkerdRuntime().env.USER_FILES.put(userFileKey(fileId), data);
  },
  async send(fileId, res) {
    const object = await getWorkerdRuntime().env.USER_FILES.get(
      userFileKey(fileId),
    );
    if (!object) {
      res.status(404).send('Not Found');
      return;
    }

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', String(object.size));
    await pipeline(
      Readable.fromWeb(object.body as NodeWebReadableStream<Uint8Array>),
      res,
    );
  },
};

type MigrationStateObjectStore = Exclude<MigrationStateStore, string>;
type StoredMigrationState = Parameters<
  Parameters<MigrationStateObjectStore['load']>[0]
>[1];

export function getMigrationStateStore(): MigrationStateStore {
  const { kv } = getWorkerdRuntime().storage;
  const store: Pick<MigrationStateObjectStore, 'load' | 'save'> = {
    load(fn) {
      // `{ migrations: [] }` is how migrate treats a missing state file.
      fn(
        null,
        kv.get<StoredMigrationState>(MIGRATION_STATE_KEY) ?? {
          migrations: [],
        },
      );
    },
    save(set, fn) {
      // Same fields migrate's FileStore persists (no up/down functions).
      const state: StoredMigrationState = {
        lastRun: set.lastRun ?? undefined,
        migrations: set.migrations.map(({ title, description, timestamp }) => ({
          title,
          description,
          timestamp,
        })),
      };
      kv.put(MIGRATION_STATE_KEY, state);
      fn(null);
    },
  };
  return store;
}
