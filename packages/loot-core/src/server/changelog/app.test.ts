import { Timestamp } from '@actual-app/crdt';

import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import * as prefs from '#server/prefs';
import {
  applyMessages,
  batchMessages,
  receiveMessages,
  setSyncingMode,
} from '#server/sync';

import { groupRowHistory, toHistoryMessage } from './replay';

import { getChangeLog } from './index';

// The test harness installs these on `globalThis` (see src/mocks/setup.ts) but
// does not declare them, so give them a type locally rather than opting the
// whole file out of strict mode.
const testEnv = global as typeof global & {
  emptyDatabase: () => () => Promise<void>;
  stepForwardInTime: (time?: number) => void;
  resetTime: () => void;
};

beforeEach(async () => {
  // 'offline' records the message log exactly like 'enabled' but never talks to
  // a server. With 'enabled' the scheduled full sync round-trips through the
  // mock server and re-applies the previous test's messages into the fresh
  // database, which quietly leaks state between tests.
  setSyncingMode('offline');
  await testEnv.emptyDatabase()();
  await loadMappings();
  await prefs.loadPrefs();
  await db.insertAccount({ id: 'account-1', name: 'Checking' });
  await db.insertAccount({ id: 'account-2', name: 'Savings' });
  await db.insertPayee({ id: 'payee-1', name: 'Coffee Shop' });
  await db.insertPayee({ id: 'payee-2', name: 'Bakery' });
  // `insertCategoryGroup`/`insertCategory` reject duplicate names, and
  // `applyMessages` is sequential: the previous test's queued messages can
  // drain into the freshly swapped database and recreate these rows. The
  // low-level inserts write the same records without the uniqueness check.
  await db.insert('category_groups', { id: 'group-1', name: 'Everyday' });
  await db.insert('categories', {
    id: 'category-1',
    name: 'Food',
    cat_group: 'group-1',
  });
  await db.insert('categories', {
    id: 'category-2',
    name: 'Restaurants',
    cat_group: 'group-1',
  });
});

afterEach(async () => {
  // `applyMessages` is sequential, so anything this test queued but did not
  // await would otherwise run against the NEXT test's freshly swapped database
  // and put rows back into its `messages_crdt`. An empty apply queues behind
  // whatever is still outstanding, so awaiting it drains the queue. It belongs
  // here rather than ahead of the reset in `beforeEach`: `emptyDatabase` is
  // what opens the database and loads the clock, and `applyMessages` needs
  // both.
  await applyMessages([]);
  testEnv.resetTime();
  setSyncingMode('disabled');
});

async function insertTransaction(overrides = {}) {
  return await db.insertTransaction({
    account: 'account-1',
    date: '2024-01-01',
    amount: -1000,
    payee: 'payee-1',
    ...overrides,
  });
}

/**
 * A timestamp in the shape a message off the wire carries: the HLC counter and
 * the ORIGINATING client's node id, neither of which this device controls.
 */
function foreignTimestamp(counter: number, node = 'FEEDFACECAFEBEEF') {
  const parsed = Timestamp.parse(
    `${new Date(Date.now()).toISOString()}-${counter
      .toString(16)
      .toUpperCase()
      .padStart(4, '0')}-${node}`,
  );
  if (!parsed) {
    throw new Error('could not build a test timestamp');
  }
  return parsed;
}

describe('changelog snapshots', () => {
  it('shows the value a column held at the time, not its value today', async () => {
    const id = await insertTransaction({ notes: 'original' });
    testEnv.stepForwardInTime();
    await db.updateTransaction({ id, amount: -2500 });
    testEnv.stepForwardInTime();
    await db.updateTransaction({ id, notes: 'rewritten later' });

    const { entries } = await getChangeLog();
    const amountEdit = entries.find(entry => entry.changed.includes('amount'));

    // The notes column changed *after* this edit, so both halves of the amount
    // entry must still show the old note.
    expect(amountEdit?.before?.notes).toBe('original');
    expect(amountEdit?.after?.notes).toBe('original');
    expect(amountEdit?.before?.amount).toBe(-1000);
    expect(amountEdit?.after?.amount).toBe(-2500);
    expect(amountEdit?.changed).toEqual(['amount']);
  });

  it('fills a column that has no messages from its current value', async () => {
    const id = await insertTransaction({ notes: 'a note' });
    testEnv.stepForwardInTime();
    await db.updateTransaction({ id, amount: -2500 });

    const [newest] = (await getChangeLog()).entries;

    // `category` was never written, so it is empty, not unknown.
    expect(newest.before?.categoryName).toBeNull();
    expect(newest.after?.categoryName).toBeNull();
  });

  it('reports a column as unknown when the log does not reach back far enough', async () => {
    const id = await insertTransaction({ notes: 'before truncation' });
    await db.run('DELETE FROM messages_crdt');
    testEnv.stepForwardInTime();
    await db.updateTransaction({ id, notes: 'after truncation' });

    const [entry] = (await getChangeLog()).entries;

    // `notes` has a message, but nothing before it, so its prior value is
    // genuinely unknown -- not null, which would read as "was empty".
    expect(entry.before?.notes).toBeUndefined();
    expect(entry.after?.notes).toBe('after truncation');
    // Columns with no messages at all still resolve from the current row.
    expect(entry.after?.accountName).toBe('Checking');
  });

  it('ends replay on the row as it exists now', async () => {
    const id = await insertTransaction();
    testEnv.stepForwardInTime();
    await db.updateTransaction({ id, amount: -4200, notes: 'final' });

    const [newest] = (await getChangeLog()).entries;
    const row = await db.first<{ amount: number; notes: string }>(
      'SELECT amount, notes FROM transactions WHERE id = ?',
      [id],
    );

    expect(newest.after?.amount).toBe(row?.amount);
    expect(newest.after?.notes).toBe(row?.notes);
  });

  it('resolves names, including for deleted entities', async () => {
    const id = await insertTransaction({ category: 'category-1' });
    testEnv.stepForwardInTime();
    await db.updateTransaction({
      id,
      payee: 'payee-2',
      category: 'category-2',
    });
    await db.delete_('payees', 'payee-1');
    await db.delete_('categories', 'category-1');

    const [entry] = (await getChangeLog()).entries;

    expect(entry.before?.payeeName).toBe('Coffee Shop');
    expect(entry.after?.payeeName).toBe('Bakery');
    expect(entry.before?.categoryName).toBe('Food');
    expect(entry.after?.categoryName).toBe('Restaurants');
    expect([...entry.changed].sort()).toEqual(['category', 'payee']);
  });

  it('shows a transfer as the other account name', async () => {
    await db.insert('payees', {
      id: 'payee-transfer',
      name: 'ignored',
      transfer_acct: 'account-2',
    });
    const id = await insertTransaction();
    testEnv.stepForwardInTime();
    await db.updateTransaction({ id, payee: 'payee-transfer' });

    const [entry] = (await getChangeLog()).entries;

    expect(entry.after?.payeeName).toBe('Savings');
  });

  it('reports a mistyped historical value as empty rather than passing it through', async () => {
    const id = await insertTransaction({ notes: 'a real note' });
    testEnv.stepForwardInTime();

    // Nothing stops a peer on another version from sending a number where the
    // schema wants text, or the other way round. `notes` as a number would
    // reach a cell that only renders text, and `amount` as a string fails both
    // sign comparisons in the UI and silently renders as two blank cells.
    await receiveMessages([
      {
        dataset: 'transactions',
        row: id,
        column: 'notes',
        value: 42,
        timestamp: foreignTimestamp(0),
      },
      {
        dataset: 'transactions',
        row: id,
        column: 'amount',
        value: 'not a number',
        timestamp: foreignTimestamp(1),
      },
    ]);

    const [entry] = (await getChangeLog()).entries;

    expect(entry.after?.notes).toBeNull();
    expect(entry.after?.amount).toBeNull();
    // The well-typed values either side are untouched.
    expect(entry.before?.notes).toBe('a real note');
    expect(entry.before?.amount).toBe(-1000);
  });
});

describe('changelog kinds', () => {
  it('classifies create, update, delete and restore', async () => {
    const id = await insertTransaction();
    testEnv.stepForwardInTime();
    await db.updateTransaction({ id, notes: 'edited' });
    testEnv.stepForwardInTime();
    await db.deleteTransaction({ id });
    testEnv.stepForwardInTime();
    await db.updateTransaction({ id, tombstone: 0 });

    const { entries } = await getChangeLog();

    expect(entries.map(entry => entry.kind)).toEqual([
      'restored',
      'deleted',
      'updated',
      'created',
    ]);
  });

  it('keeps a deletion even though tombstone is never displayed', async () => {
    const id = await insertTransaction();
    testEnv.stepForwardInTime();
    await db.deleteTransaction({ id });

    const [deletion] = (await getChangeLog()).entries;

    expect(deletion.kind).toBe('deleted');
    // The values it had are still worth showing; there is simply no "after".
    expect(deletion.after).toBeNull();
    expect(deletion.before?.payeeName).toBe('Coffee Shop');
  });

  it('has no before-state for a creation', async () => {
    await insertTransaction({ notes: 'brand new' });

    const [creation] = (await getChangeLog()).entries;

    expect(creation.kind).toBe('created');
    expect(creation.before).toBeNull();
    expect(creation.after?.notes).toBe('brand new');
  });

  it('restores with the values it comes back with', async () => {
    const id = await insertTransaction();
    testEnv.stepForwardInTime();
    await db.deleteTransaction({ id });
    testEnv.stepForwardInTime();
    await db.updateTransaction({ id, tombstone: 0 });

    const [restored] = (await getChangeLog()).entries;

    expect(restored.kind).toBe('restored');
    // The badge needs an empty half to render into, and a restore's two halves
    // are identical, so the before row is dropped.
    expect(restored.before).toBeNull();
    expect(restored.after?.payeeName).toBe('Coffee Shop');
  });

  it('classifies the message shape the app undo writes as a restore', async () => {
    const id = await insertTransaction();
    testEnv.stepForwardInTime();
    await db.deleteTransaction({ id });
    testEnv.stepForwardInTime();
    // `undoMessage` in server/undo.ts reissues the delete's own message with
    // the value the row held before it, i.e. a raw tombstone write.
    await db.update('transactions', { id, tombstone: 0 });

    const [entry] = (await getChangeLog()).entries;

    expect(entry.kind).toBe('restored');
    expect(entry.before).toBeNull();
    expect(entry.after?.payeeName).toBe('Coffee Shop');
  });

  it('merges a create with an immediately following edit', async () => {
    // Rules run right after insert, so this is the common path, not an edge.
    const id = await insertTransaction();
    await db.updateTransaction({ id, category: 'category-1' });

    const { entries } = await getChangeLog();

    expect(entries).toHaveLength(1);
    expect(entries[0].kind).toBe('created');
    expect(entries[0].after?.categoryName).toBe('Food');
  });

  it('flags a split child', async () => {
    const parent = await insertTransaction({ is_parent: true });
    const child = await insertTransaction({
      is_child: true,
      parent_id: parent,
      amount: -500,
    });

    const { entries } = await getChangeLog();
    const childEntry = entries.find(entry => entry.row === child);

    expect(childEntry?.isSplitChild).toBe(true);
  });
});

describe('changelog grouping', () => {
  it('groups the fields of one edit into a single entry', async () => {
    const id = await insertTransaction();
    testEnv.stepForwardInTime();
    await db.updateTransaction({ id, amount: -2500, notes: 'Flat white' });

    const { entries } = await getChangeLog();

    expect(entries).toHaveLength(2);
    expect([...entries[0].changed].sort()).toEqual(['amount', 'notes']);
  });

  it('keeps edits made seconds apart in separate entries', async () => {
    const id = await insertTransaction();
    testEnv.stepForwardInTime();
    await db.updateTransaction({ id, notes: 'first' });
    testEnv.stepForwardInTime();
    await db.updateTransaction({ id, notes: 'second' });

    const { entries } = await getChangeLog();

    expect(entries).toHaveLength(3);
    expect(entries.map(entry => entry.after?.notes)).toEqual([
      'second',
      'first',
      null,
    ]);
  });

  it('does not split one edit when a batch interleaves rows', async () => {
    const a = await insertTransaction();
    const b = await insertTransaction();
    testEnv.stepForwardInTime();

    // `batchUpdateTransactions` really does interleave like this, which would
    // split row A in two if grouping ran over the global message stream.
    await batchMessages(async () => {
      await db.updateTransaction({ id: a, notes: 'a1' });
      await db.updateTransaction({ id: b, notes: 'b1' });
      await db.updateTransaction({ id: a, amount: -111 });
    });

    const { entries } = await getChangeLog();
    const forA = entries.filter(
      entry => entry.row === a && entry.kind === 'updated',
    );

    expect(forA).toHaveLength(1);
    expect([...forA[0].changed].sort()).toEqual(['amount', 'notes']);
  });

  it('partitions a chained window the same way in either direction', () => {
    const base = 1_700_000_000_000;
    const at = (offset: number, counter: number) =>
      toHistoryMessage(
        'row-1',
        'notes',
        'S:x',
        `${new Date(base + offset).toISOString()}-000${counter}-0123456789ABCDEF`,
      )!;

    // 0 / 200 / 400: each gap is under the window, so this is one chain no
    // matter which end you walk from.
    const groups = groupRowHistory([at(0, 0), at(200, 1), at(400, 2)]);

    expect(groups).toHaveLength(1);
    expect(groups[0].messages).toHaveLength(3);
  });

  it('separates edits made by different devices in the same instant', () => {
    const iso = new Date(1_700_000_000_000).toISOString();
    const messages = [
      toHistoryMessage(
        'row-1',
        'notes',
        'S:a',
        `${iso}-0000-1111111111111111`,
      )!,
      toHistoryMessage(
        'row-1',
        'notes',
        'S:b',
        `${iso}-0001-2222222222222222`,
      )!,
    ];

    expect(groupRowHistory(messages)).toHaveLength(2);
  });
});

describe('changelog filtering', () => {
  it('drops an edit that only touches undisplayed columns', async () => {
    const id = await insertTransaction();
    testEnv.stepForwardInTime();
    await db.updateTransaction({ id, cleared: 1, sort_order: 12345 });

    const { entries } = await getChangeLog();

    expect(entries).toHaveLength(1);
    expect(entries[0].kind).toBe('created');
  });

  it('refills a page past a run of undisplayed edits', async () => {
    const id = await insertTransaction();
    for (let i = 0; i < 30; i++) {
      testEnv.stepForwardInTime();
      await db.updateTransaction({ id, sort_order: i });
    }
    testEnv.stepForwardInTime();
    await db.updateTransaction({ id, notes: 'visible again' });

    const { entries } = await getChangeLog({ limit: 5 });

    expect(entries.map(entry => entry.kind)).toEqual(['updated', 'created']);
    expect(entries[0].after?.notes).toBe('visible again');
  });

  it('ignores messages from other datasets', async () => {
    await db.insert('categories', {
      id: 'category-3',
      name: 'Coffee',
      cat_group: 'group-1',
    });

    const { entries } = await getChangeLog();

    expect(entries).toEqual([]);
  });
});

describe('changelog paging', () => {
  it('returns each entry exactly once and with a stable id', async () => {
    const ids: string[] = [];
    for (let i = 0; i < 4; i++) {
      testEnv.stepForwardInTime();
      ids.push(await insertTransaction());
    }

    const wide = await getChangeLog({ limit: 10 });
    expect(wide.entries).toHaveLength(4);
    expect(wide.nextCursor).toBeNull();

    const first = await getChangeLog({ limit: 2 });
    const second = await getChangeLog({ limit: 2, cursor: first.nextCursor });
    const paged = [...first.entries, ...second.entries];

    expect(paged.map(entry => entry.id)).toEqual(
      wide.entries.map(entry => entry.id),
    );
    expect(new Set(paged.map(entry => entry.id)).size).toBe(4);
    expect(paged.map(entry => entry.row)).toEqual([...ids].reverse());
  });

  it('attributes changes to this device', async () => {
    await insertTransaction();

    const result = await getChangeLog();

    expect(result.entries[0].clientId).toBe(result.currentClientId);
    expect(result.isRecording).toBe(true);
  });

  it('never drops an edit that ends exactly on the page frontier', async () => {
    const id = await insertTransaction();
    testEnv.stepForwardInTime();
    await db.updateTransaction({ id, notes: 'edge of the page' });

    const wide = await getChangeLog({ limit: 10 });
    expect(wide.entries.map(entry => entry.kind)).toEqual([
      'updated',
      'created',
    ]);

    // A one-message scan window lands the frontier on each edit's newest
    // message, and a one-message scan cap stops the refill loop right there --
    // the state a real request only reaches after MAX_SCAN messages of edits
    // the log does not display. An exclusive frontier drops those edits from
    // this page, and the cursor it hands back then skips them on the next one.
    const limits = { pageSize: 1, maxScan: 1 };
    const paged: string[] = [];
    let cursor: string | null = null;

    for (let i = 0; i < 50; i++) {
      const page = await getChangeLog({ limit: 1, cursor }, limits);
      paged.push(...page.entries.map(entry => entry.id));
      cursor = page.nextCursor;
      if (cursor === null) {
        break;
      }
    }

    expect(cursor).toBeNull();
    expect(paged).toEqual(wide.entries.map(entry => entry.id));
  });

  it('pages through more rows than one request will load', async () => {
    for (let i = 0; i < 5; i++) {
      testEnv.stepForwardInTime();
      await insertTransaction({ notes: `row ${i}` });
    }

    const wide = await getChangeLog({ limit: 10 });
    expect(wide.entries).toHaveLength(5);

    // A scan window narrower than one insert discovers the rows several rounds
    // apart, so the row cap fills partway through the log -- the shape a real
    // request only reaches at twenty thousand rows. A round whose rows are all
    // dropped still walks the frontier past them, which puts them below the
    // next cursor and off every page.
    const limits = { pageSize: 3, maxRows: 2 };
    const paged: string[] = [];
    let cursor: string | null = null;

    for (let i = 0; i < 50; i++) {
      const page = await getChangeLog({ limit: 10, cursor }, limits);
      // Only rows this request actually loaded can produce entries.
      expect(page.entries.length).toBeLessThanOrEqual(limits.maxRows);
      paged.push(...page.entries.map(entry => entry.id));
      cursor = page.nextCursor;
      if (cursor === null) {
        break;
      }
    }

    expect(cursor).toBeNull();
    expect(paged).toEqual(wide.entries.map(entry => entry.id));
    expect(new Set(paged).size).toBe(5);
  });

  it('stops on the row that reaches the cap rather than finishing the round', async () => {
    for (let i = 0; i < 5; i++) {
      testEnv.stepForwardInTime();
      await insertTransaction({ notes: `row ${i}` });
    }

    // One round holds every message here, so the cap can only be honoured by
    // stopping partway through it.
    const page = await getChangeLog({ limit: 10 }, { maxRows: 2 });

    expect(page.entries).toHaveLength(2);
    // The round ended on the cap, not on the end of the log.
    expect(page.nextCursor).not.toBeNull();
  });

  it('attributes a synced message to the device that made it', async () => {
    const id = await insertTransaction();
    testEnv.stepForwardInTime();

    // Exactly what arrives from the server: a message whose HLC timestamp
    // carries the originating client's node id rather than ours.
    await receiveMessages([
      {
        dataset: 'transactions',
        row: id,
        column: 'notes',
        value: 'edited on my laptop',
        timestamp: foreignTimestamp(0),
      },
    ]);

    const result = await getChangeLog();
    const [entry] = result.entries;

    expect(entry.after?.notes).toBe('edited on my laptop');
    expect(entry.clientId).toBe('FEEDFACECAFEBEEF');
    expect(entry.clientId).not.toBe(result.currentClientId);
  });

  it('reports when nothing is being recorded', async () => {
    setSyncingMode('disabled');
    const id = await insertTransaction();
    testEnv.stepForwardInTime();
    await db.updateTransaction({ id, amount: -2500 });

    const result = await getChangeLog();

    expect(
      await db.all(
        "SELECT * FROM messages_crdt WHERE dataset = 'transactions'",
      ),
    ).toEqual([]);
    expect(result.entries).toEqual([]);
    expect(result.isRecording).toBe(false);
  });
});
