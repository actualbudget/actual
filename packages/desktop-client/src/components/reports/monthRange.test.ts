import { describe, expect, it } from 'vitest';

import { clampMonthRangeToBounds } from './monthRange';

describe('clampMonthRangeToBounds', () => {
  it('clamps ranges to the transaction bounds, including inverted fallback ranges', () => {
    expect(
      clampMonthRangeToBounds('2025-12', '2026-02', '2026-03', '2026-12'),
    ).toEqual(['2026-03', '2026-03']);

    expect(
      clampMonthRangeToBounds('2026-12', '2027-01', '2026-03', '2026-12'),
    ).toEqual(['2026-12', '2026-12']);

    expect(
      clampMonthRangeToBounds('2027-01', '2027-03', '2026-03', '2026-12'),
    ).toEqual(['2026-12', '2026-12']);
  });
});
