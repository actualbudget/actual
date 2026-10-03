import type { Response } from 'express';
import type { load } from 'migrate';

import type { FileId, GroupId } from '#util/paths';

// Platform storage seams. The Node implementation (./node.ts) keeps the
// original filesystem layout; other runtimes provide their own variant via
// the `#storage` conditional import in package.json.

export type SyncMessage = {
  timestamp: string;
  isEncrypted: boolean;
  content: Uint8Array;
};

export type SyncResult = {
  trie: object;
  newMessages: SyncMessage[];
};

export type SyncStore = {
  sync(
    messages: SyncMessage[],
    since: string,
    groupId: GroupId,
  ): Promise<SyncResult>;
  deleteGroup(groupId: GroupId): Promise<void>;
};

export type BlobStore = {
  write(fileId: FileId, data: Uint8Array): Promise<void>;
  /** Sends the file as the response body, or a 404 if it doesn't exist. */
  send(fileId: FileId, res: Response): Promise<void>;
};

/** What the `migrate` package accepts as `stateStore`. */
export type MigrationStateStore = NonNullable<
  Parameters<typeof load>[0]['stateStore']
>;
