import { describe, expect, it } from 'vitest';

import {
  isSimpleFinRateLimited,
  SIMPLEFIN_RATE_LIMITED,
} from './simplefin';

describe('isSimpleFinRateLimited', () => {
  it('returns true for SIMPLEFIN_RATE_LIMITED responses', () => {
    expect(
      isSimpleFinRateLimited({
        error_type: SIMPLEFIN_RATE_LIMITED,
        error_code: SIMPLEFIN_RATE_LIMITED,
        status: 'rejected',
      }),
    ).toBe(true);
  });

  it('returns true for legacy RATE_LIMIT responses', () => {
    expect(
      isSimpleFinRateLimited({
        error_type: 'RATE_LIMIT',
        status: 'rejected',
      }),
    ).toBe(true);
  });

  it('returns false for unrelated errors', () => {
    expect(
      isSimpleFinRateLimited({
        error_type: 'INVALID_ACCESS_TOKEN',
        error_code: 'INVALID_ACCESS_TOKEN',
        status: 'rejected',
      }),
    ).toBe(false);
  });
});
