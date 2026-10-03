import * as db from '#server/db';

import { deriveAllCoupledCells, exchangeRateSpec } from './coupled-cells';
import { replayPendingMessages } from './replay';

beforeEach(global.emptyDatabase());

function insertIncoherentRate(id: string, spec: string | null) {
  db.runQuery(
    `INSERT INTO exchange_rates
       (id, base_currency, quote_currency, rate, kind, source, timestamp, spec, tombstone)
       VALUES (?, 'USD', 'JPY', '150', 'standing', 'manual', '2026-03-10T00:00:00.000Z', ?, 0)`,
    [id, spec],
  );
}

describe('coupled cells', () => {
  it('derives rate columns from the spec cell on a full pass', () => {
    insertIncoherentRate(
      'r1',
      exchangeRateSpec({
        rate: '151',
        kind: 'dated',
      }),
    );
    insertIncoherentRate('r2', null);
    insertIncoherentRate('r3', '{"rate":"1e3","kind":"dated"}');
    deriveAllCoupledCells();
    expect(
      db.runQuery(
        'SELECT id, rate, kind FROM exchange_rates ORDER BY id',
        [],
        true,
      ),
    ).toEqual([
      {
        id: 'r1',
        rate: '151',
        kind: 'dated',
      },
      // No or invalid authority leaves the row untouched.
      {
        id: 'r2',
        rate: '150',
        kind: 'standing',
      },
      {
        id: 'r3',
        rate: '150',
        kind: 'standing',
      },
    ]);
  });

  it('derives after deferred messages are replayed', () => {
    insertIncoherentRate('r1', null);
    db.runQuery(
      `INSERT INTO messages_pending (timestamp, dataset, row, column, value)
         VALUES (?, 'exchange_rates', 'r1', 'spec', ?)`,
      [
        '2026-03-10T00:00:00.000Z-0000-abcdef0123456789',
        `S:${exchangeRateSpec({ rate: '152', kind: 'standing' })}`,
      ],
    );
    replayPendingMessages();
    expect(db.firstSync('SELECT rate, kind FROM exchange_rates')).toEqual({
      rate: '152',
      kind: 'standing',
    });
  });
});
