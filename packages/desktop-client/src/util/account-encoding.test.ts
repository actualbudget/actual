import {
  incompatibleAccountIds,
  linkableSchedules,
  otherEncodingAccountIds,
  reencodeScheduleAmount,
} from './account-encoding';

const accounts = [
  { id: 'usd', currency: null, currency_precision: null },
  { id: 'jpy', currency: 'JPY', currency_precision: 0 },
  { id: 'jpy2', currency: 'JPY', currency_precision: 0 },
  { id: 'kwd', currency: 'KWD', currency_precision: 3 },
];

it('allows only accounts with the same recorded encoding', () => {
  expect(incompatibleAccountIds(accounts, [accounts[1]])).toEqual([
    'usd',
    'kwd',
  ]);
  expect(incompatibleAccountIds(accounts, [accounts[0]])).toEqual([
    'jpy',
    'jpy2',
    'kwd',
  ]);
});

it('allows nothing for sources with mixed encodings', () => {
  expect(incompatibleAccountIds(accounts, [accounts[0], accounts[3]])).toEqual([
    'usd',
    'jpy',
    'jpy2',
    'kwd',
  ]);
});

describe('schedules and encodings', () => {
  const schedules = [
    { id: 'yen', _account: 'jpy' },
    { id: 'dollars', _account: 'usd' },
    { id: 'anywhere', _account: null },
  ];
  const linkable = (ids: string[]) =>
    linkableSchedules(schedules, accounts, ids).map(({ id }) => id);

  it('links transactions only to schedules in their encoding', () => {
    expect(linkable(['jpy2'])).toEqual(['yen', 'anywhere']);
    expect(linkable(['usd'])).toEqual(['dollars', 'anywhere']);
    // Mixed selections share no encoding.
    expect(linkable(['usd', 'jpy'])).toEqual(['anywhere']);
  });

  it('keeps an existing schedule in its encoding', () => {
    expect(otherEncodingAccountIds(accounts, accounts[1])).toEqual([
      'usd',
      'kwd',
    ]);
    expect(otherEncodingAccountIds(accounts, undefined)).toEqual([
      'jpy',
      'jpy2',
      'kwd',
    ]);
  });

  it('re-encodes amounts and ranges exactly or not at all', () => {
    expect(reencodeScheduleAmount(1500, 0, 3)).toBe(1500000);
    expect(reencodeScheduleAmount({ num1: 1000, num2: 2000 }, 2, 0)).toEqual({
      num1: 10,
      num2: 20,
    });
    expect(reencodeScheduleAmount(1050, 2, 0)).toBeNull();
    expect(reencodeScheduleAmount({ num1: 1000, num2: 1050 }, 2, 0)).toBeNull();
  });
});
