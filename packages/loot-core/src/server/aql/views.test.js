import * as db from '../db';

import { makeViews } from './views';

beforeEach(global.emptyDatabase());

const schema = {
  transactions: {
    id: { type: 'id' },
    amount: { type: 'integer' },
    transfer_id: { type: 'integer' }
  }
};

const schemaConfig = {
  views: {
    transactions: {
      fields: {
        amount: 'a_mo_unt'
      },

      v_transactions1: internalFields => {
        let fields = internalFields({
          transfer_id: 'CASE WHEN amount < 4 THEN null ELSE transfer_id END'
        });

        return `SELECT ${fields} FROM transactions`;
      },

      v_transactions2: (_, publicFields) => {
        let fields = publicFields({
          transfer_id: 'COERCE(transfer_id, "foo")'
        });

        return `SELECT ${fields} FROM v_transactions1`;
      }
    }
  }
};

describe('schema views', () => {
  test('generates views with all the right fields', () => {
    let str = makeViews(schema, schemaConfig);
    expect(str).toMatch('DROP VIEW IF EXISTS v_transactions1;');
    expect(str).toMatch(
      'CREATE VIEW v_transactions1 AS SELECT _.id, _.a_mo_unt AS amount, CASE WHEN amount < 4 THEN null ELSE transfer_id END AS transfer_id FROM transactions;'
    );
    expect(str).toMatch('DROP VIEW IF EXISTS v_transactions2;');
    expect(str).toMatch(
      'CREATE VIEW v_transactions2 AS SELECT _.id, _.amount, COERCE(transfer_id, "foo") AS transfer_id FROM v_transactions1;'
    );

    db.execQuery('DROP TABLE transactions');
    db.execQuery(
      'CREATE TABLE transactions (id TEXT PRIMARY KEY, a_mo_unt INTEGER, transfer_id TEXT)'
    );

    // Make sure the string is valid SQL
    db.execQuery(str);
  });
});
