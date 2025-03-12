// @ts-strict-ignore
import { Timestamp } from '@actual-app/crdt';
import fc from 'fast-check';

import * as arbs from '../../mocks/arbitrary-schema';
import { execTracer } from '../../shared/test-helpers';
import { convertInputType, schema, schemaConfig } from '../aql';
import * as db from '../db';

import { listen, unlisten } from './migrate';

import { Message, addSyncListener, sendMessages } from './index';

beforeEach(() => {
  listen();
  return global.emptyDatabase()();
});

afterEach(() => {
  unlisten();
});

const tableSchema = schema.transactions;
const fields = Object.keys(tableSchema);

function toInternalField(publicField) {
  return schemaConfig.views.transactions.fields[publicField];
}

const messageArb: fc.Arbitrary<Message> = fc
  .oneof(...fields.filter(f => f !== 'id').map(field => fc.constant(field)))
  .chain(field => {
    const value = arbs
      .typeArbitrary(tableSchema[field])
      .map(v => convertInputType(v, tableSchema[field].type));

    const timestamp = fc
      .date({
        min: new Date('2020-01-01T00:00:00.000Z'),
        max: new Date('2020-05-01T00:00:00.000Z'),
      })
      .noBias()
      .noShrink()
      .map(date => date.toISOString() + '-0000-0123456789ABCDEF')
      .map(Timestamp.parse);

    return fc.record<Message>({
      timestamp,
      dataset: fc.constant('transactions'),
      column: fc.constant(toInternalField(field) || field),
      row: fc.oneof(
        fc.integer({ min: 0, max: 5 }).map(i => `id${i}`),
        fc.integer({ min: 0, max: 5 }).chain(i => {
          return fc.integer({ min: 0, max: 5 }).map(j => `id${i}/child${j}`);
        }),
      ),
      value,
    });
  });

describe('sync migrations', () => {
  it('should set the parent_id', async () => {
    const tracer = execTracer();
    tracer.start();

    const cleanup = addSyncListener((oldValues, newValues) => {
      const transactionsMap = newValues.get('transactions') as Map<
        string,
        unknown
      >;
      tracer.event('applied', [...transactionsMap.keys()]);
    });

    await db.insert('transactions', {
      id: 'trans1/child1',
      isChild: 1,
      amount: 4500,
    });
    tracer.expectNow('applied', ['trans1/child1']);
    await tracer.expectWait('applied', ['trans1/child1']);

    const transactions = db.runQuery<db.DbTransaction>(
      'SELECT * FROM transactions',
      [],
      true,
    );
    expect(transactions.length).toBe(1);
    expect(transactions[0].parent_id).toBe('trans1');

    cleanup();
    tracer.end();
  });

  it('child transactions should always have a parent_id', async () => {
    await fc.assert(
      fc
        .asyncProperty(fc.array(messageArb, { maxLength: 100 }), async msgs => {
          const tracer = execTracer();
          tracer.start();
          const cleanup = addSyncListener((oldValues, newValues) => {
            const ts = newValues.get('transactions') as Map<
              string,
              { isChild: number; parent_id: string | null; id: string }
            >;
            if (
              ts &&
              [...ts.values()].find(
                t =>
                  t.isChild === 1 && t.parent_id == null && t.id.includes('/'),
              )
            ) {
            } else {
              tracer.event('applied');
            }
          });

          await sendMessages(msgs);
          await tracer.expect('applied');

          const transactions = await db.all<db.DbTransaction>(
            'SELECT * FROM transactions',
            [],
          );
          for (const trans of transactions) {
            const transMsgs = msgs
              .filter(msg => msg.row === trans.id)
              .sort((m1, m2) => {
                const t1 = m1.timestamp.toString();
                const t2 = m2.timestamp.toString();
                if (t1 < t2) {
                  return 1;
                } else if (t1 > t2) {
                  return -1;
                }
                return 0;
              });
            const msg = transMsgs.find(m => m.column === 'parent_id');

            if (
              trans.isChild === 1 &&
              trans.id.includes('/') &&
              (msg == null || msg.value == null)
            ) {
              // This is a child transaction didn't have a `parent_id`
              // set in the messages. It should have gotten set from
              // the `id`
              const [parentId] = trans.id.split('/');
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
        }),
    );
  });
});
