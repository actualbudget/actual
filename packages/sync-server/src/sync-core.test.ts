import type { SyncMessage } from '#storage/types';

import { openDatabase } from './db';
import { messagesSql, syncGroup } from './sync-core';

const since = '2026-01-01T00:00:00.000Z-0000-0000000000000000';
const firstMessage = {
  timestamp: '2026-01-01T00:00:01.000Z-0000-0000000000000001',
  isEncrypted: true,
  content: Buffer.from([0, 128, 255]),
} satisfies SyncMessage;
const secondMessage = {
  timestamp: '2026-01-01T00:00:02.000Z-0000-0000000000000001',
  isEncrypted: false,
  content: Buffer.from('second message'),
} satisfies SyncMessage;

describe('syncGroup', () => {
  let db: ReturnType<typeof openDatabase>;

  beforeEach(() => {
    db = openDatabase(':memory:');
    db.exec(messagesSql);
  });

  afterEach(() => {
    db.close();
  });

  it('returns stored messages in timestamp order without echoing new messages', () => {
    const initial = syncGroup(db, [secondMessage, firstMessage], since);
    expect(initial.newMessages).toEqual([]);

    const result = syncGroup(db, [], since);
    expect(result.newMessages).toEqual([firstMessage, secondMessage]);
    expect(result.trie).toEqual(initial.trie);
    expect(syncGroup(db, [], firstMessage.timestamp).newMessages).toEqual([
      secondMessage,
    ]);
  });

  it('keeps message contents and the merkle trie unchanged when retrying a timestamp', () => {
    const initial = syncGroup(db, [firstMessage], since);
    const retry = syncGroup(
      db,
      [{ ...firstMessage, content: Buffer.from('different content') }],
      since,
    );

    expect(retry.trie).toEqual(initial.trie);
    expect(retry.newMessages).toEqual([firstMessage]);
    expect(syncGroup(db, [], since).newMessages).toEqual([firstMessage]);
  });

  it('rolls back the entire batch if a message cannot be applied', () => {
    expect(() =>
      syncGroup(
        db,
        [firstMessage, { ...secondMessage, timestamp: 'invalid' }],
        since,
      ),
    ).toThrow();

    expect(syncGroup(db, [], since).newMessages).toEqual([]);
    expect(db.all('SELECT * FROM messages_binary')).toEqual([]);
  });
});
