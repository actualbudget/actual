import { incompatibleAccountIds } from './account-encoding';

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
