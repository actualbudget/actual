import fc from 'fast-check';

import arbs from '../../mocks/arbitrary-schema';
import { execTracer } from '../../shared/test-helpers';
import { convertInputType, schema, schemaConfig } from '../aql';
import * as db from '../db';

import { listen, unlisten } from './migrate';

import { addSyncListener, sendMessages } from './index';

beforeEach(() => {
  listen();
  return global.emptyDatabase()();
});

afterEach(() => {
  unlisten();
});

let tableSchema = schema.transactions;
let fields = Object.keys(tableSchema);

function toInternalField(publicField) {
  return schemaConfig.views.transactions.fields[publicField];
}

let messageArb = fc
  .oneof(...fields.filter(f => f !== 'id').map(field => fc.constant(field)))
  .chain(field => {
    let value = arbs
      .typeArbitrary(tableSchema[field])
      .map(v => convertInputType(v, tableSchema[field].type));

    let timestamp = fc
      .date({
        min: new Date('2020-01-01T00:00:00.000Z'),
        max: new Date('2020-05-01T00:00:00.000Z')
      })
      .noBias()
      .noShrink()
      .map(date => date.toISOString() + '-0000-0123456789ABCDEF');

    return fc.record({
      timestamp: timestamp,
      dataset: fc.constant('transactions'),
      column: fc.constant(toInternalField(field) || field),
      row: fc.oneof(
        fc.integer(0, 5).map(i => `id${i}`),
        fc.integer(0, 5).chain(i => {
          return fc.integer(0, 5).map(j => `id${i}/child${j}`);
        })
      ),
      value: value
    });
  });

describe('sync migrations', () => {
  it('should set the parent_id', async () => {
    let tracer = execTracer();
    tracer.start();

    let cleanup = addSyncListener((oldValues, newValues) => {
      tracer.event('applied', [...newValues.get('transactions').keys()]);
    });

    await db.insert('transactions', {
      id: 'trans1/child1',
      isChild: 1,
      amount: 4500
    });
    tracer.expectNow('applied', ['trans1/child1']);
    await tracer.expectWait('applied', ['trans1/child1']);

    let transactions = db.runQuery('SELECT * FROM transactions', [], true);
    expect(transactions.length).toBe(1);
    expect(transactions[0].parent_id).toBe('trans1');

    cleanup();
    tracer.end();
  });

  it('child transactions should always have a parent_id', async () => {
    await fc.assert(
      fc
        .asyncProperty(fc.array(messageArb, { maxLength: 100 }), async msgs => {
          let tracer = execTracer();
          tracer.start();
          let cleanup = addSyncListener((oldValues, newValues) => {
            let ts = newValues.get('transactions');
            if (
              ts &&
              [...ts.values()].find(
                t =>
                  t.isChild === 1 && t.parent_id == null && t.id.includes('/')
              )
            ) {
            } else {
              tracer.event('applied');
            }
          });

          await sendMessages(msgs);
          await tracer.expect('applied');

          let transactions = await db.all(
            'SELECT * FROM transactions',
            [],
            true
          );
          for (let trans of transactions) {
            let transMsgs = msgs
              .filter(msg => msg.row === trans.id)
              .sort((m1, m2) => {
                let t1 = m1.timestamp.toString();
                let t2 = m2.timestamp.toString();
                if (t1 < t2) {
                  return 1;
                } else if (t1 > t2) {
                  return -1;
                }
                return 0;
              });
            let msg = transMsgs.find(m => m.column === 'parent_id');

            if (
              trans.isChild === 1 &&
              trans.id.includes('/') &&
              (msg == null || msg.value == null)
            ) {
              // This is a child transaction didn't have a `parent_id`
              // set in the messages. It should have gotten set from
              // the `id`
              let [parentId] = trans.id.split('/');
              expect(parentId).not.toBe(null);
              expect(trans.parent_id).toBe(parentId);
            } else if (msg) {
              // At least one message set `parent_id`
              expect(trans.parent_id).toBe(msg.value);
            } else {
              // `parent_id` should never have been set
              expect(trans.parent_id).toBe(null);
            }
          }

          cleanup();
          tracer.end();
        })
        .beforeEach(() => {
          return db.execQuery(`DELETE FROM transactions`);
        })
    );
  });
});
