import { qif2json } from './qif2json';

describe('qif2json', () => {
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
