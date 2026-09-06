import {
  csvRecordToRow,
  findDuplicates,
  resolveCsvMapping,
} from './transactions';

vi.mock('@actual-app/api', () => ({}));
vi.mock('#connection', () => ({ withConnection: vi.fn() }));

describe('resolveCsvMapping', () => {
  it('auto-detects common headers', () => {
    const mapping = resolveCsvMapping(
      ['Date', 'Description', 'Amount', 'Memo'],
      {},
    );
    expect(mapping).toEqual({
      date: 'Date',
      amount: 'Amount',
      payee: 'Description',
      notes: 'Memo',
    });
  });

  it('detects inflow/outflow columns when there is no amount', () => {
    const mapping = resolveCsvMapping(['Date', 'Debit', 'Credit'], {});
    expect(mapping.amount).toBeUndefined();
    expect(mapping.outflow).toBe('Debit');
    expect(mapping.inflow).toBe('Credit');
  });

  it('prefers explicit mappings over guesses', () => {
    const mapping = resolveCsvMapping(['Posted', 'Amount', 'Payee'], {
      date: 'Posted',
    });
    expect(mapping.date).toBe('Posted');
    expect(mapping.payee).toBe('Payee');
  });

  it('rejects unknown fields and missing columns', () => {
    expect(() =>
      resolveCsvMapping(['Date', 'Amount'], { foo: 'Date' }),
    ).toThrow('Unknown --map field "foo"');
    expect(() =>
      resolveCsvMapping(['Date', 'Amount'], { payee: 'Nope' }),
    ).toThrow('CSV has no column "Nope"');
  });

  it('requires a date and an amount column', () => {
    expect(() => resolveCsvMapping(['Amount'], {})).toThrow(
      'Could not find a date column',
    );
    expect(() => resolveCsvMapping(['Date'], {})).toThrow(
      'Could not find an amount column',
    );
  });
});

describe('csvRecordToRow', () => {
  it('builds a row from an amount column', () => {
    const row = csvRecordToRow(
      {
        Date: '3/9/2024',
        Amount: '-12.50',
        Payee: ' Coffee ',
        Notes: '',
        Id: 'abc',
        Category: 'Food',
      },
      {
        date: 'Date',
        amount: 'Amount',
        payee: 'Payee',
        notes: 'Notes',
        imported_id: 'Id',
        category: 'Category',
      },
      {},
    );
    expect(row).toEqual({
      date: '2024-03-09',
      amount: -1250,
      payee_name: 'Coffee',
      imported_id: 'abc',
      category: 'Food',
    });
  });

  it('combines inflow and outflow columns', () => {
    const mapping = { date: 'Date', inflow: 'Credit', outflow: 'Debit' };
    expect(
      csvRecordToRow(
        { Date: '2024-01-01', Credit: '', Debit: '20' },
        mapping,
        {},
      ).amount,
    ).toBe(-2000);
    expect(
      csvRecordToRow(
        { Date: '2024-01-01', Credit: '5', Debit: '' },
        mapping,
        {},
      ).amount,
    ).toBe(500);
  });

  it('honors --invert and --date-format', () => {
    const row = csvRecordToRow(
      { Date: '09/03/2024', Amount: '10' },
      { date: 'Date', amount: 'Amount' },
      { invert: true, dateFormat: 'DD/MM/YYYY' },
    );
    expect(row).toEqual({ date: '2024-03-09', amount: -1000 });
  });
});

describe('findDuplicates', () => {
  const base = { account: 'acct', payee: 'Store', notes: '', imported_id: '' };

  it('flags same-amount transactions within the window', () => {
    const dupes = findDuplicates(
      [
        { ...base, id: 'b', date: '2024-01-03', amount: -500 },
        { ...base, id: 'a', date: '2024-01-01', amount: -500 },
        { ...base, id: 'c', date: '2024-01-10', amount: -500 },
      ],
      3,
      false,
    );
    expect(dupes.map(d => [d.id, d.duplicateOf])).toEqual([['b', 'a']]);
  });

  it('ignores different accounts or amounts', () => {
    const dupes = findDuplicates(
      [
        { ...base, id: 'a', date: '2024-01-01', amount: -500 },
        { ...base, id: 'b', date: '2024-01-01', amount: -500, account: 'x' },
        { ...base, id: 'c', date: '2024-01-01', amount: -501 },
      ],
      3,
      false,
    );
    expect(dupes).toEqual([]);
  });

  it('can require a matching payee', () => {
    const rows = [
      { ...base, id: 'a', date: '2024-01-01', amount: -500 },
      { ...base, id: 'b', date: '2024-01-01', amount: -500, payee: 'store' },
      { ...base, id: 'c', date: '2024-01-01', amount: -500, payee: 'Other' },
    ];
    expect(findDuplicates(rows, 3, true).map(d => d.id)).toEqual(['b']);
    expect(findDuplicates(rows, 3, false).map(d => d.id)).toEqual(['b', 'c']);
  });
});
