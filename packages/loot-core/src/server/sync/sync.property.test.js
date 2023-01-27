import { merkle, getClock, Timestamp } from '../crdt';
import * as db from '../db';
import * as prefs from '../prefs';
import * as sheet from '../sheet';

import * as encoder from './encoder';

import * as sync from './index';

const jsc = require('jsverify');
const uuidGenerator = jsc.integer(97, 122).smap(
  x => String.fromCharCode(x),
  x => x.charCodeAt(x)
);

const mockSyncServer = require('../tests/mockSyncServer');

beforeEach(() => {
  sync.setSyncingMode('enabled');
  mockSyncServer.reset();
  global.restoreDateNow();
});

afterEach(() => {
  sync.setSyncingMode('disabled');
  global.resetTime();
});

let schema = {
  spreadsheet_cells: {
    expr: 'text'
  },
  accounts: {
    account_id: 'text',
    name: 'text',
    balance_current: 'integer',
    balance_available: 'integer',
    balance_limit: 'integer',
    mask: 'text',
    official_name: 'text',
    type: 'text',
    subtype: 'text',
    bank: 'text',
    offbudget: 'integer',
    closed: 'integer',
    tombstone: 'integer'
  },
  transactions: {
    isParent: 'integer',
    isChild: 'integer',
    acct: 'text',
    category: 'text',
    amount: 'integer',
    description: 'text',
    notes: 'text',
    date: 'integer',
    financial_id: 'text',
    type: 'text',
    location: 'text',
    error: 'text',
    imported_description: 'text',
    starting_balance_flag: 'integer',
    transferred_id: 'text',
    sort_order: 'real',
    tombstone: 'integer'
  },
  categories: {
    name: 'text',
    is_income: 'integer',
    cat_group: 'text',
    sort_order: 'real',
    tombstone: 'integer'
  },
  category_groups: {
    name: 'text',
    is_income: 'integer',
    sort_order: 'real',
    tombstone: 'integer'
  },
  category_mapping: { transferId: 'text' },
  payees: {
    name: 'text',
    transfer_acct: 'text',
    category: 'text',
    tombstone: 'integer'
  },
  payee_rules: {
    payee_id: 'text',
    type: 'text',
    value: 'text',
    tombstone: 'integer'
  },
  payee_mapping: { targetId: 'text' }
};

// The base time is 2019-08-09T18:14:31.903Z
let baseTime = 1565374471903;
let clientId1 = '80dd7da215247293';
let clientId2 = '90xU1sd5124329ac';

function makeGen({ table, row, field, value }) {
  return jsc.record({
    dataset: jsc.constant(table),
    row: row || uuidGenerator,
    column: jsc.constant(field),
    value,
    timestamp: jsc.integer(1000, 10000).smap(
      x => {
        let clientId;
        switch (jsc.random(0, 1)) {
          case 0:
            clientId = clientId1;
            break;
          case 1:
          default:
            clientId = clientId2;
        }
        return new Timestamp(baseTime + x, 0, clientId);
      },
      x => x.millis - baseTime
    )
  });
}

let generators = [];
Object.keys(schema).forEach(table => {
  Object.keys(schema[table]).reduce((obj, field) => {
    if (table === 'spreadsheet_cells' && field === 'expr') {
      generators.push(
        makeGen({
          table,
          row: jsc.asciinestring.smap(
            x => 'sheet!' + x,
            x => x
          ),
          field: 'expr',
          value: jsc.constant(JSON.stringify('fooooo'))
        })
      );
      return obj;
    }

    let type = schema[table][field];
    switch (type) {
      case 'text':
        generators.push(makeGen({ table, field, value: jsc.asciinestring }));
        break;

      case 'integer':
        if (field === 'amount') {
          generators.push(makeGen({ table, field, value: jsc.uint8 }));
        } else {
          generators.push(
            makeGen({ table, field, value: jsc.elements([0, 1]) })
          );
        }
        break;

      case 'real':
        generators.push(makeGen({ table, field, value: jsc.uint32 }));
        break;

      default:
        throw new Error('Unknown type: ' + type);
    }
    return obj;
  }, {});
});

function shuffle(arr) {
  let src = [...arr];
  let shuffled = new Array(src.length);
  let item;
  while ((item = src.pop())) {
    let idx = Math.floor(Math.random() * shuffled.length);
    if (shuffled[idx]) {
      src.push(item);
    } else {
      shuffled[idx] = item;
    }
  }
  return shuffled;
}

function divide(arr) {
  let res = [];
  for (let i = 0; i < arr.length; i += 10) {
    res.push(arr.slice(i, i + 10));
  }
  return res;
}

async function run(msgs) {
  mockSyncServer.reset();

  // Do some post-processing of the data
  let knownTimestamps = new Set();
  let res = msgs.reduce(
    (acc, msg) => {
      // Filter out duplicate timestamps
      let ts = msg.timestamp.toString();
      if (knownTimestamps.has(ts)) {
        return acc;
      }
      knownTimestamps.add(ts);

      if (msg.timestamp.node() === clientId1) {
        acc.firstMessages.push(msg);
      } else if (msg.timestamp.node() === clientId2) {
        acc.secondMessages.push(msg);
      } else {
        throw new Error('unknown client');
      }

      return acc;
    },
    { firstMessages: [], secondMessages: [] }
  );

  prefs.loadPrefs();
  prefs.savePrefs({
    groupId: 'group',
    lastSyncedTimestamp: new Timestamp(
      Date.now(),
      0,
      '0000000000000000'
    ).toString()
  });

  await global.emptyDatabase()();
  await sheet.loadSpreadsheet(db, () => {});

  // The test: split up the messages into chunks and in parallel send
  // them all through `sendMessages`. Then add some messages to the
  // server from another client, wait for all the `sendMessages` to
  // complete, then do another `fullSync`, and finally check the
  // merkle tree to see if there are any differences.
  let chunks = divide(res.firstMessages);

  let client1Sync = Promise.all(
    chunks.slice(0, -1).map(slice => sync.receiveMessages(slice))
  );
  await client1Sync;

  await mockSyncServer.handlers['/sync/sync'](
    await encoder.encode(
      'group',
      clientId2,
      Timestamp.zero(),
      res.secondMessages.map(x => ({
        ...x,
        value: sync.serializeValue(x.value),
        timestamp: x.timestamp.toString()
      }))
    )
  );

  let syncPromise = sync.fullSync();

  // Add in some more messages while the sync is running, this makes
  // sure that the loop works
  let lastReceive = sync.receiveMessages(chunks[chunks.length - 1]);

  mockSyncServer.handlers['/sync/sync'](
    await encoder.encode(
      'group',
      clientId2,
      Timestamp.zero(),
      res.secondMessages.map(x => ({
        ...x,
        value: sync.serializeValue(x.value),
        timestamp: x.timestamp.toString()
      }))
    )
  );

  let { error } = await syncPromise;
  if (error) {
    console.log(error);
    throw error;
  }

  let serverMerkle = mockSyncServer.getClock().merkle;

  // Double-check that the data is in sync
  let diff = merkle.diff(serverMerkle, getClock().merkle);
  if (diff !== null) {
    return false;
  }

  // Make sure that last batch of messages is applied
  await lastReceive;

  // The full sync should have looped completely until it was fully in
  // sync, including the messages we sent while it was syncing. Make
  // sure it properly finished by compared the previous merkle trie on
  // the server.
  diff = merkle.diff(serverMerkle, getClock().merkle);
  if (diff !== null) {
    return false;
  }

  return true;
}

describe('sync property test', () => {
  xit('should always sync clients into the same state', async () => {
    let test = await jsc.check(
      jsc.forall(
        jsc.tuple(Array.from(new Array(100)).map(() => jsc.oneof(generators))),
        async msgs => {
          let r;

          try {
            r = await run(msgs);
          } catch (e) {
            console.log(e);
            throw e;
          }

          if (r === false) {
            return false;
          }

          for (let i = 0; i < 10; i++) {
            let shuffled = shuffle(msgs);
            r = await run(shuffled);
            if (r === false) {
              return false;
            }
          }

          return true;
        }
      ),
      { tests: 100, quiet: true }
    );

    if (test.counterexample) {
      console.log('---------------------');
      console.log(
        test.counterexample[0].map(x => ({
          ...x,
          timestamp: x.timestamp.toString()
        }))
      );

      throw new Error('property test failed');
    }
  }, 50000);

  xit('should run a counterexample that needs to be fixed', async () => {
    function convert(data) {
      return data.map(x => ({
        ...x,
        timestamp: Timestamp.parse(x.timestamp)
      }));
    }

    // Copy and paste a counterexample that the property test finds
    // here. That way you can work on it separately and figure out
    // what's wrong.
    let msgs = convert([
      {
        dataset: 'accounts',
        row: 't',
        column: 'balance_limit',
        value: 0,
        timestamp: '2019-08-09T18:14:34.545Z-0000-90xU1sd5124329ac'
      }
      // ...
    ]);

    let res = await run(msgs);
    expect(res).toBe(true);
  });
});
