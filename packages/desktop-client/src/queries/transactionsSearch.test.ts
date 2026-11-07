import { q } from '@actual-app/core/shared/query';

import { transactionsSearch } from './index';

const search = (text: string, precision: number) =>
  transactionsSearch(
    q('transactions'),
    text,
    'MM/dd/yyyy',
    '',
    precision,
  ).serialize().filterExpressions[0];

it.each([
  [0, 1234],
  [2, 123400],
  [3, 1234000],
] as const)('searches major units at %sdp', (precision, stored) => {
  expect(JSON.stringify(search('1234', precision))).toContain(
    `"$eq":${stored}`,
  );
});

it.each([
  ['>1.234', '$gt', 1234],
  ['>=-1.234', '$gte', -1234],
  ['<1.234', '$lt', 1234],
  ['<=-1.234', '$lte', -1234],
] as const)(
  'applies %s as a recorded-precision comparison',
  (text, op, stored) => {
    expect(JSON.stringify(search(text, 3))).toContain(`"${op}":${stored}`);
  },
);

it('uses both recorded endpoints for a signed range', () => {
  const filter = JSON.stringify(search('-1.234..2.345', 3));
  expect(filter).toContain('"$gte":-1234');
  expect(filter).toContain('"$lte":2345');
});

it('does not emit an amount predicate for malformed or overflowing input', () => {
  for (const text of ['>1.2345', '>999999999999999999', '>wat']) {
    expect(JSON.stringify(search(text, 3))).not.toContain('"$gt"');
  }
});

it('searches native amounts in a foreign register', () => {
  const filter = JSON.stringify(
    transactionsSearch(
      q('transactions'),
      '1500',
      'MM/dd/yyyy',
      '',
      0,
      'transaction_amount',
    ).serialize().filterExpressions[0],
  );
  expect(filter).toContain('"transaction_amount"');
  expect(filter).toContain('"$eq":1500');
  expect(filter).not.toContain('"amount"');
});
