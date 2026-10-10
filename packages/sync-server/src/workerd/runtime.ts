import type { SyncMessage, SyncResult } from '#storage/types';

// Handle to the Cloudflare Durable Object that is running the server. The
// `workerd` variants of `#db` and `#storage` read storage and bindings from
// here; the ActualServer Durable Object registers itself on construction.
//
// The types below are the minimal slices of @cloudflare/workers-types this
// package uses, so src/ keeps compiling against Node types.

export type SqlStorageLike = {
  exec(
    query: string,
    ...bindings: unknown[]
  ): {
    toArray(): Record<string, unknown>[];
    one(): Record<string, unknown>;
  };
};

export type DurableObjectStorageLike = {
  sql: SqlStorageLike;
  kv: {
    get<T = unknown>(key: string): T | undefined;
    put(key: string, value: unknown): void;
  };
  transactionSync<T>(fn: () => T): T;
};

export type SyncGroupStub = {
  sync(messages: SyncMessage[], since: string): Promise<SyncResult>;
  deleteAll(): Promise<void>;
};

export type R2ObjectBodyLike = {
  body: ReadableStream;
  size: number;
};

export type WorkerdEnv = {
  SYNC_GROUP: { getByName(name: string): SyncGroupStub };
  USER_FILES: {
    put(key: string, value: Uint8Array): Promise<unknown>;
    get(key: string): Promise<R2ObjectBodyLike | null>;
  };
};

type WorkerdRuntime = {
  storage: DurableObjectStorageLike;
  env: WorkerdEnv;
};

let runtime: WorkerdRuntime | null = null;

export function setWorkerdRuntime(value: WorkerdRuntime) {
  runtime = value;
}

export function getWorkerdRuntime(): WorkerdRuntime {
  if (!runtime) {
    throw new Error(
      'Workerd runtime not initialised: ActualServer must call setWorkerdRuntime() first',
    );
  }
  return runtime;
}
