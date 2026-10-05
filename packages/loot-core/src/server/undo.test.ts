import * as db from '#server/db';

import { runMutator } from './mutators';
import { clearUndo, redo, undo, withUndo } from './undo';

const payeeLive = (id: string) =>
  db.firstSync<{ tombstone: number }>(
    'SELECT tombstone FROM payees WHERE id = ?',
    [id],
  )?.tombstone === 0;

beforeEach(async () => {
  await global.emptyDatabase()();
  clearUndo();
});

it('keeps undo and redo after a mutation that fails without recording', async () => {
  await runMutator(() =>
    withUndo(async () => {
      await db.insertPayee({ id: 'payee', name: 'Payee' });
    }),
  );
  await undo();
  expect(payeeLive('payee')).toBe(false);

  await expect(
    runMutator(() =>
      withUndo(async () => {
        throw new Error('storage-failed');
      }),
    ),
  ).rejects.toThrow('storage-failed');

  await redo();
  expect(payeeLive('payee')).toBe(true);
});
