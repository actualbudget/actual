import { sequential } from '../../shared/async';
import * as prefs from '../prefs';
import app from '../main-app';
import * as db from '../db';
import * as sheet from '../sheet';
import { triggerBudgetChanges, setType as setBudgetType } from '../budget/base';
import * as undo from '../undo';
import { setIn, getIn } from '../../shared/util';
import {
  serializeClock,
  getClock
} from '../timestamp';
import * as merkle from '../merkle';
import { checkSyncingMode } from "./syncing-mode";
import { getTablesFromMessages } from './utils';

const { SyncError } = require('../errors');
const connection = require('../../platform/server/connection');

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
      let { dataset, row, column, timestamp, value } = msg;

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
