import { describe, expect, it } from 'vitest';

import { getBankSyncErrorReason } from './bankSyncErrors';

describe('getBankSyncErrorReason', () => {
  it('combines the classification with the reason GoCardless gave', () => {
    expect(
      getBankSyncErrorReason({
        error_code: 'INTERNAL_ERROR',
        error_type: 'IP address access denied',
        error_details: {
          status: 403,
          summary: 'IP address access denied',
          detail:
            "Your IP 203.0.113.7 isn't whitelisted to perform this action",
        },
      }),
    ).toBe(
      "IP address access denied: Your IP 203.0.113.7 isn't whitelisted to perform this action",
    );
  });

  it('does not repeat the summary when it duplicates the detail', () => {
    expect(
      getBankSyncErrorReason({
        error_type: 'Rate limit exceeded',
        error_details: {
          status: 429,
          summary: 'Rate limit exceeded',
          detail: 'Rate limit exceeded',
        },
      }),
    ).toBe('Rate limit exceeded');
  });

  it('falls back to the summary when GoCardless sent no detail', () => {
    expect(
      getBankSyncErrorReason({
        error_type: 'Invalid provided parameters',
        error_details: { status: 400, summary: 'Invalid country choice.' },
      }),
    ).toBe('Invalid country choice.');
  });

  it('falls back to our own classification when GoCardless sent no body', () => {
    expect(
      getBankSyncErrorReason({
        error_type:
          'Daily request limit set by the Institution has been exceeded',
        error_details: { status: 429 },
      }),
    ).toBe('Daily request limit set by the Institution has been exceeded');
  });

  it('uses error_type alone when there are no GoCardless details at all', () => {
    expect(getBankSyncErrorReason({ error_type: 'socket hang up' })).toBe(
      'socket hang up',
    );
  });

  it('returns undefined when there is nothing meaningful to show', () => {
    expect(getBankSyncErrorReason(undefined)).toBeUndefined();
    expect(getBankSyncErrorReason(null)).toBeUndefined();
    expect(getBankSyncErrorReason([])).toBeUndefined();
    expect(getBankSyncErrorReason({})).toBeUndefined();
    expect(getBankSyncErrorReason({ error_type: '   ' })).toBeUndefined();
    expect(getBankSyncErrorReason('boom')).toBeUndefined();
  });

  it('ignores the placeholder internal-error string', () => {
    expect(
      getBankSyncErrorReason({
        error_code: 'INTERNAL_ERROR',
        error_type: 'internal-error',
      }),
    ).toBeUndefined();
  });

  it('ignores non-string values on the payload', () => {
    expect(
      getBankSyncErrorReason({
        error_type: 42,
        error_details: { summary: { nested: true }, detail: ['a'] },
      }),
    ).toBeUndefined();
  });
});
