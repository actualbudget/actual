import { captureException } from '../../platform/exceptions';
import asyncStorage from '../../platform/server/asyncStorage';
import logger from '../../platform/server/log';
import { sequential, once } from '../../shared/async';
import { setIn, getIn } from '../../shared/util';
import { triggerBudgetChanges, setType as setBudgetType } from '../budget/base';
import {
  serializeClock,
  deserializeClock,
  getClock,
  Timestamp,
  merkle
} from '../crdt';
import * as db from '../db';
import app from '../main-app';
import { runMutator } from '../mutators';
import { postBinary } from '../post';
import * as prefs from '../prefs';
import { getServer } from '../server-config';
import * as sheet from '../sheet';
import * as undo from '../undo';

import * as encoder from './encoder';
import { rebuildMerkleHash } from './repair';

const connection = require('../../platform/server/connection');
const { PostError, SyncError } = require('../errors');

export { default as makeTestMessage } from './make-test-message';
export { default as resetSync } from './reset';
export { default as repairSync } from './repair';

let FULL_SYNC_DELAY = 1000;
let SYNCING_MODE = 'enabled';

export function setSyncingMode(mode) {
  let prevMode = SYNCING_MODE;
  switch (mode) {
    case 'enabled':
      SYNCING_MODE = 'enabled';
      break;
    case 'offline':
      SYNCING_MODE = 'offline';
      break;
    case 'disabled':
      SYNCING_MODE = 'disabled';
      break;
    case 'import':
      SYNCING_MODE = 'import';
      break;
    default:
      throw new Error('setSyncingMode: invalid mode: ' + mode);
  }
  return prevMode;
}

export function checkSyncingMode(mode) {
  switch (mode) {
    case 'enabled':
      return SYNCING_MODE === 'enabled' || SYNCING_MODE === 'offline';
    case 'disabled':
      return SYNCING_MODE === 'disabled' || SYNCING_MODE === 'import';
    case 'offline':
      return SYNCING_MODE === 'offline';
    case 'import':
      return SYNCING_MODE === 'import';
    default:
      throw new Error('checkSyncingMode: invalid mode: ' + mode);
  }
}

function apply(msg, prev) {
  let { dataset, row, column, value } = msg;

  if (dataset === 'prefs') {
    // Do nothing, it doesn't exist in the db
  } else {
    try {
      let query;
      if (prev) {
        query = {
          sql: db.cache(`UPDATE ${dataset} SET ${column} = ? WHERE id = ?`),
          params: [value, row]
        };
      } else {
        query = {
          sql: db.cache(`INSERT INTO ${dataset} (id, ${column}) VALUES (?, ?)`),
          params: [row, value]
        };
      }

      db.runQuery(query.sql, query.params);
    } catch (e) {
      //console.log(e);
      throw new SyncError('invalid-schema');
    }
  }
}

async function fetchAll(table, ids) {
  let results = [];

  // TODO: convert to `whereIn`

  for (let i = 0; i < ids.length; i += 500) {
    let partIds = ids.slice(i, i + 500);
    let sql;
    let column = `${table}.id`;

    // We have to provide *mapped* data so the spreadsheet works. The functions
    // which trigger budget changes based on data changes assumes data has been
    // mapped. The only mapped data that the budget is concerned about is
    // categories. This is kind of annoying, but we manually map it here
    if (table === 'transactions') {
      sql = `
        SELECT t.*, c.transferId AS category
        FROM transactions t
        LEFT JOIN category_mapping c ON c.id = t.category
      `;
      column = 't.id';
    } else {
      sql = `SELECT * FROM ${table}`;
    }

    sql += ` WHERE `;
    sql += partIds.map(id => `${column} = ?`).join(' OR ');

    try {
      let rows = await db.runQuery(sql, partIds, true);
      results = results.concat(rows);
    } catch (e) {
      throw new SyncError('invalid-schema');
    }
  }

  return results;
}

export function serializeValue(value) {
  if (value === null) {
    return '0:';
  } else if (typeof value === 'number') {
    return 'N:' + value;
  } else if (typeof value === 'string') {
    return 'S:' + value;
  }

  throw new Error('Unserializable value type: ' + JSON.stringify(value));
}

export function deserializeValue(value) {
  const type = value[0];
  switch (type) {
    case '0':
      return null;
    case 'N':
      return parseFloat(value.slice(2));
    case 'S':
      return value.slice(2);
    default:
  }

  throw new Error('Invalid type key for value: ' + value);
}

let _syncListeners = [];

export function addSyncListener(func) {
  _syncListeners.push(func);

  return () => {
    _syncListeners = _syncListeners.filter(f => f !== func);
  };
}

async function compareMessages(messages) {
  let newMessages = [];

  for (let i = 0; i < messages.length; i++) {
    let message = messages[i];
    let { dataset, row, column, timestamp } = message;
    let timestampStr = timestamp.toString();

    let res = db.runQuery(
      db.cache(
        'SELECT timestamp FROM messages_crdt WHERE dataset = ? AND row = ? AND column = ? AND timestamp >= ?'
      ),
      [dataset, row, column, timestampStr],
      true
    );

    // Returned message is any one that is "later" than this message,
    // meaning if the result exists this message is an old one
    if (res.length === 0) {
      newMessages.push(message);
    } else if (res[0].timestamp !== timestampStr) {
      newMessages.push({ ...message, old: true });
    }
  }

  return newMessages;
}

// This is the fast path `apply` function when in "import" mode.
// There's no need to run through the whole sync system when
// importing, but **there is a caveat**: because we don't run sync
// listeners importers should not rely on any functions that use any
// projected state (like rules). We can't fire those because they
// depend on having both old and new data which we don't quere here
function applyMessagesForImport(messages) {
  db.transaction(() => {
    for (let i = 0; i < messages.length; i++) {
      let msg = messages[i];
      let { dataset } = msg;

      if (!msg.old) {
        try {
          apply(msg);
        } catch (e) {
          apply(msg, true);
        }

        if (dataset === 'prefs') {
          throw new Error('Cannot set prefs while importing');
        }
      }
    }
  });
}

export const applyMessages = sequential(async messages => {
  if (checkSyncingMode('import')) {
    return applyMessagesForImport(messages);
  } else if (checkSyncingMode('enabled')) {
    // Compare the messages with the existing crdt. This filters out
    // already applied messages and determines if a message is old or
    // not. An "old" message doesn't need to be applied, but it still
    // needs to be put into the merkle trie to maintain the hash.
    messages = await compareMessages(messages);
  }

  messages = [...messages].sort((m1, m2) => {
    let t1 = m1.timestamp ? m1.timestamp.toString() : '';
    let t2 = m2.timestamp ? m2.timestamp.toString() : '';
    if (t1 < t2) {
      return -1;
    } else if (t1 > t2) {
      return 1;
    }
    return 0;
  });

  let idsPerTable = {};
  messages.forEach(msg => {
    if (msg.dataset === 'prefs') {
      return;
    }

    if (idsPerTable[msg.dataset] == null) {
      idsPerTable[msg.dataset] = [];
    }
    idsPerTable[msg.dataset].push(msg.row);
  });

  async function fetchData() {
    let data = new Map();

    for (let table of Object.keys(idsPerTable)) {
      const rows = await fetchAll(table, idsPerTable[table]);

      for (let i = 0; i < rows.length; i++) {
        let row = rows[i];
        setIn(data, [table, row.id], row);
      }
    }

    return data;
  }

  let prefsToSet = {};
  let oldData = await fetchData();

  undo.appendMessages(messages, oldData);

  // It's important to not mutate the clock while processing the
  // messages. We only want to mutate it if the transaction succeeds.
  // The merkle variable will be updated while applying the messages and
  // we'll apply it afterwards.
  let clock;
  let currentMerkle;
  if (checkSyncingMode('enabled')) {
    clock = getClock();
    currentMerkle = clock.merkle;
  }

  if (sheet.get()) {
    sheet.get().startCacheBarrier();
  }

  // Now that we have all of the data, go through and apply the
  // messages carefully. This transaction is **crucial**: it
  // guarantees that everything is atomically committed to the
  // database, and if any part of it fails everything aborts and
  // nothing is changed. This is critical to maintain consistency. We
  // also avoid any side effects to in-memory objects, and apply them
  // after this succeeds.
  db.transaction(() => {
    let added = new Set();

    for (let i = 0; i < messages.length; i++) {
      let msg = messages[i];
      let { dataset, row, column, timestamp, value } = msg;

      if (!msg.old) {
        apply(msg, getIn(oldData, [dataset, row]) || added.has(dataset + row));

        if (dataset === 'prefs') {
          prefsToSet[row] = value;
        } else {
          // Keep track of which items have been added it in this sync
          // so it knows whether they already exist in the db or not. We
          // ignore any changes to the spreadsheet.
          added.add(dataset + row);
        }
      }

      if (checkSyncingMode('enabled')) {
        db.runQuery(
          db.cache(`INSERT INTO messages_crdt (timestamp, dataset, row, column, value)
           VALUES (?, ?, ?, ?, ?)`),
          [timestamp.toString(), dataset, row, column, serializeValue(value)]
        );

        currentMerkle = merkle.insert(currentMerkle, msg.timestamp);
      }
    }

    if (checkSyncingMode('enabled')) {
      currentMerkle = merkle.prune(currentMerkle);

      // Save the clock in the db first (queries might throw
      // exceptions)
      db.runQuery(
        db.cache(
          'INSERT OR REPLACE INTO messages_clock (id, clock) VALUES (1, ?)'
        ),
        [serializeClock({ ...clock, merkle: currentMerkle })]
      );
    }
  });

  if (checkSyncingMode('enabled')) {
    // The transaction succeeded, so we can update in-memory objects
    // now. Update the in-memory clock.
    clock.merkle = currentMerkle;
  }

  // Save any synced prefs
  if (Object.keys(prefsToSet).length > 0) {
    prefs.savePrefs(prefsToSet, { avoidSync: true });

    if (prefsToSet.budgetType) {
      setBudgetType(prefsToSet.budgetType);
    }

    connection.send('prefs-updated');
  }

  let newData = await fetchData();

  // In testing, sometimes the spreadsheet isn't loaded, and that's ok
  if (sheet.get()) {
    // Need to clean up these APIs and make them consistent
    sheet.startTransaction();
    triggerBudgetChanges(oldData, newData);
    sheet.get().triggerDatabaseChanges(oldData, newData);
    sheet.endTransaction();

    // Allow the cache to be used in the future. At this point it's guaranteed
    // to be up-to-date because we are done mutating any other data
    sheet.get().endCacheBarrier();
  }

  _syncListeners.forEach(func => func(oldData, newData));

  let tables = getTablesFromMessages(messages.filter(msg => !msg.old));
  app.events.emit('sync', {
    type: 'applied',
    tables,
    data: newData,
    prevData: oldData
  });

  return messages;
});

export function receiveMessages(messages) {
  messages.forEach(msg => {
    Timestamp.recv(msg.timestamp);
  });

  return runMutator(() => applyMessages(messages));
}

async function _sendMessages(messages) {
  try {
    await applyMessages(messages);
  } catch (e) {
    if (e instanceof SyncError) {
      if (e.reason === 'invalid-schema') {
        // We know this message came from a local modification, and it
        // couldn't apply, which doesn't make any sense. Must be a bug
        // in the code. Send a specific error type for it for a custom
        // message.
        app.events.emit('sync', {
          type: 'error',
          subtype: 'apply-failure'
        });
      } else {
        app.events.emit('sync', { type: 'error' });
      }
    }

    throw e;
  }

  await scheduleFullSync();
}

let IS_BATCHING = false;
let _BATCHED = [];
export async function batchMessages(func) {
  if (IS_BATCHING) {
    await func();
    return;
  }

  IS_BATCHING = true;
  let batched = [];

  try {
    await func();
    // TODO: if it fails, it shouldn't apply them?
  } finally {
    IS_BATCHING = false;
    batched = _BATCHED;
    _BATCHED = [];
  }

  if (batched.length > 0) {
    await _sendMessages(batched);
  }
}

export async function sendMessages(messages) {
  if (IS_BATCHING) {
    _BATCHED = _BATCHED.concat(messages);
  } else {
    return _sendMessages(messages);
  }
}

export function getMessagesSince(since) {
  return db.runQuery(
    'SELECT timestamp, dataset, row, column, value FROM messages_crdt WHERE timestamp > ?',
    [since],
    true
  );
}

export async function syncAndReceiveMessages(messages, since) {
  let localMessages = await getMessagesSince(since);
  await receiveMessages(
    messages.map(msg => ({
      ...msg,
      value: deserializeValue(msg.value),
      timestamp: Timestamp.parse(msg.timestamp)
    }))
  );
  return localMessages;
}

export function clearFullSyncTimeout() {
  if (syncTimeout) {
    clearTimeout(syncTimeout);
    syncTimeout = null;
  }
}

let syncTimeout = null;
export function scheduleFullSync() {
  clearFullSyncTimeout();

  if (checkSyncingMode('enabled') && !checkSyncingMode('offline')) {
    if (global.__TESTING__) {
      return fullSync().then(res => {
        if (res.error) {
          throw res.error;
        }
        return res;
      });
    } else {
      syncTimeout = setTimeout(fullSync, FULL_SYNC_DELAY);
    }
  }
}

function getTablesFromMessages(messages) {
  return messages.reduce((acc, message) => {
    let dataset =
      message.dataset === 'schedules_next_date' ? 'schedules' : message.dataset;

    if (!acc.includes(dataset)) {
      acc.push(dataset);
    }
    return acc;
  }, []);
}

// This is different than `fullSync` because it waits for the
// spreadsheet to finish any processing. This is useful if we want to
// perform a full sync and wait for everything to finish, usually if
// you're doing an initial sync before working with a file.
export async function initialFullSync() {
  let result = await fullSync();
  if (!result.error) {
    // Make sure to wait for anything in the spreadsheet to process
    await sheet.waitOnSpreadsheet();
  }
}

export const fullSync = once(async function () {
  app.events.emit('sync', { type: 'start' });
  let messages;

  try {
    messages = await _fullSync(null, 0, null);
  } catch (e) {
    console.log(e);

    if (e instanceof SyncError) {
      if (e.reason === 'out-of-sync') {
        captureException(e);

        app.events.emit('sync', {
          type: 'error',
          subtype: 'out-of-sync'
        });
      } else if (e.reason === 'invalid-schema') {
        app.events.emit('sync', {
          type: 'error',
          subtype: 'invalid-schema'
        });
      } else if (
        e.reason === 'decrypt-failure' ||
        e.reason === 'encrypt-failure'
      ) {
        app.events.emit('sync', {
          type: 'error',
          subtype: e.reason,
          meta: e.meta
        });
      } else if (e.reason === 'beta-version') {
        app.events.emit('sync', {
          type: 'error',
          subtype: e.reason
        });
      } else {
        app.events.emit('sync', { type: 'error' });
      }
    } else if (e instanceof PostError) {
      console.log(e);
      if (e.reason === 'unauthorized') {
        app.events.emit('sync', { type: 'unauthorized' });

        // Set the user into read-only mode
        asyncStorage.setItem('readOnly', 'true');
      } else if (e.reason === 'network-failure') {
        app.events.emit('sync', { type: 'error', subtype: 'network' });
      } else {
        app.events.emit('sync', { type: 'error', subtype: e.reason });
      }
    } else {
      captureException(e);
      // TODO: Send the message to the client and allow them to expand & view it
      app.events.emit('sync', { type: 'error' });
    }

    return { error: { message: e.message, reason: e.reason, meta: e.meta } };
  }

  let tables = getTablesFromMessages(messages);

  app.events.emit('sync', {
    type: 'success',
    tables,
    syncDisabled: checkSyncingMode('disabled')
  });
  return { messages };
});

async function _fullSync(sinceTimestamp, count, prevDiffTime) {
  let { cloudFileId, groupId, lastSyncedTimestamp } = prefs.getPrefs() || {};

  clearFullSyncTimeout();

  if (checkSyncingMode('disabled') || checkSyncingMode('offline')) {
    return [];
  }

  // Snapshot the point at which we are currently syncing
  let currentTime = getClock().timestamp.toString();

  let since =
    sinceTimestamp ||
    lastSyncedTimestamp ||
    // Default to 5 minutes ago
    new Timestamp(Date.now() - 5 * 60 * 1000, 0, '0').toString();

  let messages = getMessagesSince(since);

  let userToken = await asyncStorage.getItem('user-token');

  logger.info(
    'Syncing since',
    since,
    messages.length,
    '(attempt: ' + count + ')'
  );

  let buffer = await encoder.encode(groupId, cloudFileId, since, messages);

  // TODO: There a limit on how many messages we can send because of
  // the payload size. Right now it's at 20MB on the server. We should
  // check the worst case here and make multiple requests if it's
  // really large.
  let resBuffer = await postBinary(getServer().SYNC_SERVER + '/sync', buffer, {
    'X-ACTUAL-TOKEN': userToken
  });

  // Abort if the file is either no longer loaded, the group id has
  // changed because of a sync reset
  if (!prefs.getPrefs() || prefs.getPrefs().groupId !== groupId) {
    return [];
  }

  let res = await encoder.decode(resBuffer);

  logger.info('Got messages from server', res.messages.length);

  let localTimeChanged = getClock().timestamp.toString() !== currentTime;

  // Apply the new messages
  let receivedMessages = [];
  if (res.messages.length > 0) {
    receivedMessages = await receiveMessages(
      res.messages.map(msg => ({
        ...msg,
        value: deserializeValue(msg.value),
        timestamp: Timestamp.parse(msg.timestamp)
      }))
    );
  }

  let diffTime = merkle.diff(res.merkle, getClock().merkle);

  if (diffTime !== null) {
    // This is a bit wonky, but we loop until we are in sync with the
    // server. While syncing, either the client or server could change
    // out from under us, so it might take a couple passes to
    // completely sync up. This is a check that stops the loop in case
    // we are corrupted and can't sync up. We try 10 times if we keep
    // getting the same diff time, and add a upper limit of 300 no
    // matter what (just to stop this from ever being an infinite
    // loop).
    //
    // It's slightly possible for the user to add more messages while we
    // are in `receiveMessages`, but `localTimeChanged` would still be
    // false. In that case, we don't reset the counter but it should be
    // very unlikely that this happens enough to hit the loop limit.

    if ((count >= 10 && diffTime === prevDiffTime) || count >= 100) {
      logger.info('SENT -------');
      logger.info(JSON.stringify(messages));
      logger.info('RECEIVED -------');
      logger.info(JSON.stringify(res.messages));

      let rebuiltMerkle = rebuildMerkleHash();

      console.log(
        count,
        'messages:',
        messages.length,
        messages.length > 0 ? messages[0] : null,
        'res.messages:',
        res.messages.length,
        res.messages.length > 0 ? res.messages[0] : null,
        'clientId',
        getClock().timestamp.node(),
        'groupId',
        groupId,
        'diffTime:',
        diffTime,
        diffTime === prevDiffTime,
        'local clock:',
        getClock().timestamp.toString(),
        getClock().merkle.hash,
        'rebuilt hash:',
        rebuiltMerkle.numMessages,
        rebuiltMerkle.trie.hash,
        'server hash:',
        res.merkle.hash,
        'localTimeChanged:',
        localTimeChanged
      );

      if (rebuiltMerkle.trie.hash === res.merkle.hash) {
        // Rebuilding the merkle worked... but why?
        let clocks = await db.all('SELECT * FROM messages_clock');
        if (clocks.length !== 1) {
          console.log('Bad number of clocks:', clocks.length);
        }
        let hash = deserializeClock(clocks[0]).merkle.hash;
        console.log('Merkle hash in db:', hash);
      }

      throw new SyncError('out-of-sync');
    }

    receivedMessages = receivedMessages.concat(
      await _fullSync(
        new Timestamp(diffTime, 0, '0').toString(),
        // If something local changed while we were syncing, always
        // reset, token the counter. We never want to think syncing failed
        // because we tried to syncing many times and couldn't sync,
        // but it was because the user kept changing stuff in the
        // middle of syncing.
        localTimeChanged ? 0 : count + 1,
        diffTime
      )
    );
  } else {
    // All synced up, store the current time as a simple optimization
    // for the next sync
    await prefs.savePrefs({
      lastSyncedTimestamp: getClock().timestamp.toString()
    });
  }

  return receivedMessages;
}
