import { describe, expect, it } from 'vitest';

import { makeQuery } from './makeQuery';

function serialize(groupBy?: string) {
  return makeQuery(
    'assets',
    '2026-01-01',
    '2026-01-31',
    'Daily',
    '$and',
    [],
    groupBy,
  ).serialize();
}

describe('makeQuery', () => {
  it('groups and selects notes for tag reports', () => {
    const query = serialize('Tag');

    expect(query.groupExpressions).toContain('notes');
    expect(query.selectExpressions).toContain('notes');
  });

  it.each(['Category', 'Payee', 'Account', 'Interval', undefined])(
    'does not select notes for %s reports',
    groupBy => {
      const query = serialize(groupBy);

      expect(query.groupExpressions).not.toContain('notes');
      expect(query.selectExpressions).not.toContain('notes');
    },
  );

  it('queries Quarterly reports by month so they can be rolled up', () => {
    const query = makeQuery(
      'assets',
      '2026-01-01',
      '2026-06-30',
      'Quarterly',
      '$and',
      [],
    ).serialize();

    expect(query.groupExpressions).toContainEqual({ $month: '$date' });
    expect(query.selectExpressions).toContainEqual({
      date: { $month: '$date' },
    });
  });
});
