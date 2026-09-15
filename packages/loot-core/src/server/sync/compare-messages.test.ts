import { getClock, Timestamp } from '@actual-app/crdt';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import * as budget from '#server/budget/base';
import * as db from '#server/db';
import * as sheet from '#server/sheet';

import { applyMessages, setSyncingMode } from './index';
import type { Message } from './index';

beforeEach(() => {
  setSyncingMode('enabled');
  return global.emptyDatabase()();
});

afterEach(() => {
  setSyncingMode('disabled');
});

function sendTimestamp(): Timestamp {
  const timestamp = Timestamp.send();
  if (timestamp == null) {
    throw new Error('Timestamp.send() returned null');
  }
  return timestamp;
}

function amountMessage(
  row: string,
  amount: number,
  timestamp: Timestamp,
): Message {
  return {
    dataset: 'transactions',
    row,
    column: 'amount',
    value: amount,
    timestamp,
  };
}

function getCrdtRows(): db.DbCrdtMessage[] {
  return db.runQuery<db.DbCrdtMessage>(
    'SELECT * FROM messages_crdt ORDER BY timestamp',
    [],
    true,
  );
}

async function getAmount(row: string): Promise<number | undefined> {
  const result = await db.first<{ amount: number }>(
    'SELECT amount FROM transactions WHERE id = ?',
    [row],
  );
  return result?.amount;
}

// `applyMessages` only returns nothing in import mode, which these
// tests never use
async function applyAll(messages: Message[]): Promise<Message[]> {
  const applied = await applyMessages(messages);
  if (applied == null) {
    throw new Error('applyMessages returned nothing');
  }
  return applied;
}

function findByTimestamp(messages: Message[], timestamp: Timestamp) {
  return messages.find(
    message => message.timestamp.toString() === timestamp.toString(),
  );
}

describe('compareMessages', () => {
  it('handles several messages for the same cell in one batch', async () => {
    const earliest = sendTimestamp();
    const middle = sendTimestamp();
    const latest = sendTimestamp();

    await applyMessages([amountMessage('t1', 100, middle)]);

    const applied = await applyAll([
      amountMessage('t1', 50, earliest),
      amountMessage('t1', 200, latest),
    ]);

    expect(applied.length).toBe(2);
    expect(findByTimestamp(applied, earliest)?.old).toBe(true);
    expect(findByTimestamp(applied, latest)?.old).toBeUndefined();
    expect(await getAmount('t1')).toBe(200);
    expect(getCrdtRows().length).toBe(3);
  });

  it('drops a message whose timestamp is already in the log', async () => {
    const first = sendTimestamp();
    const second = sendTimestamp();

    await applyMessages([amountMessage('t1', 100, first)]);

    const applied = await applyAll([
      amountMessage('t1', 100, first),
      amountMessage('t2', 300, second),
    ]);

    expect(applied.map(message => message.row)).toEqual(['t2']);
    expect(await getAmount('t2')).toBe(300);
    expect(getCrdtRows().length).toBe(2);
  });

  it('flags old and new messages correctly across more than one chunk', async () => {
    const rowCount = 250;
    const rows = Array.from({ length: rowCount }, (_, index) => `t${index}`);

    const earlyTimestamps = rows.map(() => sendTimestamp());
    const loggedTimestamps = rows.map(() => sendTimestamp());
    const lateTimestamps = rows.map(() => sendTimestamp());

    await applyMessages(
      rows.map((row, index) =>
        amountMessage(row, 1000, loggedTimestamps[index]),
      ),
    );

    // Even rows get an older value, odd rows get a newer one
    const applied = await applyAll(
      rows.map((row, index) =>
        index % 2 === 0
          ? amountMessage(row, 1, earlyTimestamps[index])
          : amountMessage(row, 2, lateTimestamps[index]),
      ),
    );

    expect(applied.length).toBe(rowCount);
    expect(applied.filter(message => message.old).length).toBe(rowCount / 2);
    for (let index = 0; index < rowCount; index++) {
      const isOld = index % 2 === 0;
      const message = findByTimestamp(
        applied,
        isOld ? earlyTimestamps[index] : lateTimestamps[index],
      );
      expect(message?.old).toBe(isOld ? true : undefined);
      expect(await getAmount(rows[index])).toBe(isOld ? 1000 : 2);
    }
    expect(getCrdtRows().length).toBe(rowCount * 2);
  });

  it('rolls back the whole batch when one message fails to apply', async () => {
    const merkleBefore = JSON.stringify(getClock().merkle);

    await expect(
      applyMessages([
        amountMessage('t1', 100, sendTimestamp()),
        {
          dataset: 'transactions',
          row: 't1',
          column: 'brand_new_column',
          value: 'hello',
          timestamp: sendTimestamp(),
        },
      ]),
    ).rejects.toMatchObject({ reason: 'invalid-schema' });

    expect(getCrdtRows().length).toBe(0);
    expect(await getAmount('t1')).toBeUndefined();
    expect(JSON.stringify(getClock().merkle)).toBe(merkleBefore);
  });

  it('switches the budget type when the preference arrives via sync', async () => {
    await db.insertCategoryGroup({
      id: 'income-group',
      name: 'Income',
      is_income: 1,
    });
    await db.insertCategory({
      id: 'income-cat',
      name: 'Income',
      cat_group: 'income-group',
      is_income: 1,
    });
    await db.insertCategoryGroup({
      id: 'group1',
      name: 'group1',
      is_income: 0,
    });
    await db.insertCategory({
      id: 'cat1',
      name: 'cat1',
      cat_group: 'group1',
      is_income: 0,
    });
    await sheet.loadSpreadsheet(db);
    await budget.createBudget(['2024-01']);
    expect(sheet.get().meta().budgetType).toBe('envelope');

    await applyMessages([
      {
        dataset: 'preferences',
        row: 'budgetType',
        column: 'value',
        value: 'tracking',
        timestamp: sendTimestamp(),
      },
    ]);
    await sheet.waitOnSpreadsheet();

    expect(sheet.get().meta().budgetType).toBe('tracking');
    const preference = await db.first<{ value: string }>(
      'SELECT value FROM preferences WHERE id = ?',
      ['budgetType'],
    );
    expect(preference?.value).toBe('tracking');
  });
});
