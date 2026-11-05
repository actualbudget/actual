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
});
