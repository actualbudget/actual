import { qif2json } from './qif2json';

describe('qif2json', () => {
  test('reads a CRLF file with blank lines between transactions', () => {
    const qif = [
      '!Type:Bank',
      'D01/02/2026',
      'T-12.50',
      'PCoffee Shop',
      '^',
      '',
      'D01/03/2026',
      'T1,200.00',
      'PSalary',
      '^',
      '',
    ].join('\r\n');

    expect(qif2json(qif).transactions).toEqual([
      { date: '01/02/2026', amount: '-12.50', payee: 'Coffee Shop' },
      { date: '01/03/2026', amount: '1,200.00', payee: 'Salary' },
    ]);
  });

  test('ignores whitespace-only lines', () => {
    const qif = '!Type:Bank\n  \nD01/02/2026\n\t\nT5.00\n^\n';
    expect(qif2json(qif).transactions).toEqual([
      { date: '01/02/2026', amount: '5.00' },
    ]);
  });

  test('still rejects a file without a type header', () => {
    expect(() => qif2json('D01/02/2026\nT5.00\n^')).toThrow(
      'File does not appear to be a valid qif file',
    );
  });

  test('imports Quicken transactions with U before T', () => {
    const qif = [
      '!Type:Bank',
      "D3/ 1' 8",
      'U-50.00',
      'T-50.00',
      'CX',
      'PShop',
      'LFood',
      '^',
    ].join('\n');

    expect(qif2json(qif).transactions).toEqual([
      {
        date: "3/ 1' 8",
        amount: '-50.00',
        clearedStatus: 'X',
        payee: 'Shop',
        category: 'Food',
      },
    ]);
  });

  test('ignores U when it follows T without overwriting the amount', () => {
    const qif = [
      '!Type:Bank',
      'D03/01/2026',
      'T-50.00',
      'U-50.0000',
      'PShop',
      '^',
    ].join('\n');

    expect(qif2json(qif).transactions).toEqual([
      { date: '03/01/2026', amount: '-50.00', payee: 'Shop' },
    ]);
  });

  test('still rejects unsupported transaction detail codes', () => {
    expect(() => qif2json('!Type:Bank\nZunexpected\n^')).toThrow(
      'Unknown Detail Code: Z',
    );
  });
});
