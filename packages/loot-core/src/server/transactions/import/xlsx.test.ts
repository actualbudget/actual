import { unzipSync, zipSync } from 'fflate';
import { utils, write } from 'xlsx';

import { parseXlsx } from './xlsx';

function zipWorkbook(entries: Record<string, Uint8Array>) {
  return zipSync(entries, { mtime: new Date('2026-01-01') });
}

function workbookBytes(rows: unknown[][], extraSheet = true, date1904 = false) {
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, utils.aoa_to_sheet(rows), 'Transactions');
  if (extraSheet) {
    utils.book_append_sheet(
      workbook,
      utils.aoa_to_sheet([
        ['Date', 'Amount'],
        ['2026-10-02', 12],
      ]),
      'Savings',
    );
  }
  workbook.Workbook = { WBProps: { date1904 } };
  return new Uint8Array(write(workbook, { type: 'array', bookType: 'xlsx' }));
}

describe('native XLSX import', () => {
  it('detects a header after report titles and preserves amounts, Unicode and zero', () => {
    const result = parseXlsx(
      workbookBytes([
        ['Bank statement'],
        [],
        ['Date', 'Payee', 'Amount'],
        ['2026-10-01', 'Köp, "mat"', -1234.56],
        ['2026-10-02', 'Refund', 0],
      ]),
    );
    expect(result.xlsx.headerRow).toBe(3);
    expect(result.xlsx.worksheets).toEqual(['Transactions', 'Savings']);
    expect(result.transactions).toEqual([
      { Date: '2026-10-01', Payee: 'Köp, "mat"', Amount: '-1234.56' },
      { Date: '2026-10-02', Payee: 'Refund', Amount: '0' },
    ]);
  });

  it('selects another sheet and accepts an explicit header row', () => {
    const bytes = workbookBytes([
      ['Title'],
      ['Date', 'Amount'],
      ['2026-10-01', -1],
    ]);
    expect(parseXlsx(bytes, { worksheet: 'Savings' }).transactions).toEqual([
      { Date: '2026-10-02', Amount: '12' },
    ]);
    expect(parseXlsx(bytes, { headerRow: 2 }).xlsx.headerRow).toBe(2);
    expect(
      parseXlsx(bytes, { worksheet: 'Missing' }).errors[0].message,
    ).toContain('valid worksheet');
    expect(parseXlsx(bytes, { headerRow: 0 }).errors[0].message).toContain(
      'outside',
    );
  });

  it('filters required cells, preserves zero and ignores entirely empty rows', () => {
    const result = parseXlsx(
      workbookBytes([
        ['Date', 'Payee', 'Amount'],
        ['2026-10-01', '', 0],
        ['2026-10-02', 'Shop', null],
        [],
        ['2026-10-03', 'Shop', -5],
      ]),
      { requiredColumns: [0, 2] },
    );
    expect(result.transactions).toHaveLength(2);
    expect(result.transactions[0].Amount).toBe('0');
    expect(result.xlsx.excludedRows).toBe(1);
  });

  it('keeps duplicate and blank headers without losing columns', () => {
    const result = parseXlsx(
      workbookBytes([
        ['Amount', 'Amount', ''],
        [1, 2, 3],
      ]),
      { headerRow: 1 },
    );
    expect(result.transactions).toEqual([
      { Amount: '1', 'Amount (2)': '2', 'Column 3': '3' },
    ]);
  });

  it('supports a sheet without a header', () => {
    expect(
      parseXlsx(
        workbookBytes([
          ['2026-10-01', -1],
          ['2026-10-02', -2],
        ]),
        { hasHeaderRow: false },
      ).transactions,
    ).toEqual([
      { '0': '2026-10-01', '1': '-1' },
      { '0': '2026-10-02', '1': '-2' },
    ]);
  });

  it.each([false, true])(
    'converts Excel dates with date1904=%s without timezone shifts',
    date1904 => {
      const workbook = utils.book_new();
      const sheet = utils.aoa_to_sheet([
        ['Date', 'Amount'],
        [date1904 ? 44834 : 46296, -12.345],
      ]);
      sheet.A2.z = 'm/d/yy';
      sheet.B2.z = '$#,##0.00';
      utils.book_append_sheet(workbook, sheet, 'Transactions');
      workbook.Workbook = { WBProps: { date1904 } };
      const result = parseXlsx(
        new Uint8Array(write(workbook, { type: 'array', bookType: 'xlsx' })),
      );
      expect(result.transactions[0]).toEqual({
        Date: '2026-10-01',
        Amount: '-12.345',
      });
    },
  );

  it('uses cached formula results and rejects error cells', () => {
    const workbook = utils.book_new();
    const sheet = utils.aoa_to_sheet([
      ['Date', 'Amount'],
      ['2026-10-01', 3],
    ]);
    sheet.B2.f = '1+2';
    utils.book_append_sheet(workbook, sheet, 'Transactions');
    const bytes = () =>
      new Uint8Array(write(workbook, { type: 'array', bookType: 'xlsx' }));
    expect(parseXlsx(bytes()).transactions[0].Amount).toBe('3');
    sheet.B2 = { t: 'e', v: 7 };
    const result = parseXlsx(bytes());
    expect(result.errors[0].message).toContain('B2 contains an error');
    expect(result.transactions).toEqual([]);
    expect(result.xlsx.worksheets).toEqual(['Transactions']);
  });

  it('accepts compressed workbooks', () => {
    const bytes = zipWorkbook(unzipSync(workbookBytes([['Amount'], [3]])));
    expect(parseXlsx(bytes).transactions).toEqual([{ Amount: '3' }]);
  });

  it('enforces entry and cumulative expanded limits across unused resources', () => {
    const entries = unzipSync(workbookBytes([['Amount'], [3]]));
    expect(() =>
      parseXlsx(
        zipWorkbook({
          ...entries,
          'unused.bin': new Uint8Array(25 * 1024 * 1024 + 1),
        }),
      ),
    ).toThrow('expanded size');
    expect(() =>
      parseXlsx(
        zipWorkbook({
          ...entries,
          'unused1.bin': new Uint8Array(20 * 1024 * 1024),
          'unused2.bin': new Uint8Array(20 * 1024 * 1024),
          'unused3.bin': new Uint8Array(20 * 1024 * 1024),
        }),
      ),
    ).toThrow('expanded size');
  });

  it('rejects forged sizes even when local and central headers agree', () => {
    const bytes = zipWorkbook({ 'unused.bin': new Uint8Array(1024 * 1024) });
    const view = new DataView(bytes.buffer);
    const directory = view.getUint32(bytes.length - 6, true);
    view.setUint32(22, 1, true);
    view.setUint32(directory + 24, 1, true);
    expect(() => parseXlsx(bytes)).toThrow('Invalid XLSX ZIP sizes');
  });

  it('rejects inconsistent headers and incomplete directories', () => {
    const bytes = workbookBytes([['Amount'], [3]]);
    const view = new DataView(bytes.buffer);
    view.setUint32(22, 1, true);
    expect(() => parseXlsx(bytes)).toThrow('Invalid XLSX ZIP sizes');
    const truncated = workbookBytes([['Amount'], [3]]);
    new DataView(truncated.buffer).setUint16(truncated.length - 12, 0, true);
    expect(() => parseXlsx(truncated)).toThrow('Invalid XLSX archive');
  });

  it('rejects malformed archives, invalid columns, oversized sheets and empty sheets', () => {
    expect(() => parseXlsx(new Uint8Array([1, 2, 3]))).toThrow(
      'unencrypted XLSX',
    );
    expect(() => parseXlsx(new Uint8Array([0x50, 0x4b, 0]))).toThrow(
      'Invalid XLSX',
    );
    expect(
      parseXlsx(workbookBytes([['Date'], ['2026-10-01']]), {
        requiredColumns: [1],
      }).errors[0].message,
    ).toContain('required columns');
    expect(
      parseXlsx(workbookBytes([Array(257).fill('x')])).errors[0].message,
    ).toContain('256 columns');
    expect(parseXlsx(workbookBytes([])).transactions).toEqual([]);
  });
});
