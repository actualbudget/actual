import { findHeader, parseColumnMap, parseCsv, parseCsvRecords } from './csv';

describe('parseCsv', () => {
  it('parses simple rows', () => {
    expect(parseCsv('a,b\n1,2\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('handles quoted fields, escaped quotes and embedded newlines', () => {
    const text = 'name,notes\n"Doe, Jane","said ""hi""\nthen left"\n';
    expect(parseCsv(text)).toEqual([
      ['name', 'notes'],
      ['Doe, Jane', 'said "hi"\nthen left'],
    ]);
  });

  it('handles CRLF line endings and a BOM', () => {
    expect(parseCsv('﻿a,b\r\n1,2\r\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('supports alternate delimiters', () => {
    expect(parseCsv('a;b\n1;2', ';')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('drops empty trailing rows', () => {
    expect(parseCsv('a,b\n1,2\n\n\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });
});

describe('parseCsvRecords', () => {
  it('keys rows by trimmed header names', () => {
    const { headers, records } = parseCsvRecords(
      ' Date ,Amount\n2024-01-02,-5.00\n2024-01-03',
    );
    expect(headers).toEqual(['Date', 'Amount']);
    expect(records).toEqual([
      { Date: '2024-01-02', Amount: '-5.00' },
      { Date: '2024-01-03', Amount: '' },
    ]);
  });

  it('returns empty results for empty input', () => {
    expect(parseCsvRecords('')).toEqual({ headers: [], records: [] });
  });
});

describe('parseColumnMap', () => {
  it('parses field=column pairs', () => {
    expect(
      parseColumnMap('date=Date, amount=Amount ,payee=Description'),
    ).toEqual({ date: 'Date', amount: 'Amount', payee: 'Description' });
  });

  it('rejects entries without an equals sign', () => {
    expect(() => parseColumnMap('date')).toThrow(
      'Expected field=Column Header',
    );
  });

  it('rejects empty field or column', () => {
    expect(() => parseColumnMap('=Date')).toThrow('Invalid --map entry');
    expect(() => parseColumnMap('date=')).toThrow('Invalid --map entry');
  });
});

describe('findHeader', () => {
  it('matches case-insensitively and returns the original header', () => {
    expect(findHeader(['Txn Date', ' Amount '], ['date', 'txn date'])).toBe(
      'Txn Date',
    );
    expect(findHeader(['Txn Date', ' Amount '], ['amount'])).toBe(' Amount ');
  });

  it('returns undefined when nothing matches', () => {
    expect(findHeader(['x'], ['date'])).toBeUndefined();
  });
});
