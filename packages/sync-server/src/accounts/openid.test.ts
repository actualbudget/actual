import { describe, expect, it } from 'vitest';

import { pickIdTokenSignedResponseAlg } from './openid';

describe('pickIdTokenSignedResponseAlg', () => {
  it('returns the explicit override when provided, even if discovery suggests otherwise', () => {
    const issuer = {
      metadata: { id_token_signing_alg_values_supported: ['RS256', 'ES384'] },
    };
    expect(
      pickIdTokenSignedResponseAlg(issuer, {
        id_token_signed_response_alg: 'ES512',
      }),
    ).toBe('ES512');
  });

  it('prefers RS256 when it is among the advertised algorithms (backwards-compat)', () => {
    const issuer = {
      metadata: { id_token_signing_alg_values_supported: ['ES384', 'RS256'] },
    };
    expect(pickIdTokenSignedResponseAlg(issuer, {})).toBe('RS256');
  });

  it('falls back to the first advertised algorithm when RS256 is not offered', () => {
    const issuer = {
      metadata: { id_token_signing_alg_values_supported: ['ES384', 'ES256'] },
    };
    expect(pickIdTokenSignedResponseAlg(issuer, {})).toBe('ES384');
  });

  it('uses a lone ECDSA algorithm (the bug-report case)', () => {
    const issuer = {
      metadata: { id_token_signing_alg_values_supported: ['ES384'] },
    };
    expect(pickIdTokenSignedResponseAlg(issuer, {})).toBe('ES384');
  });

  it('defaults to RS256 when the issuer exposes no signing metadata', () => {
    expect(pickIdTokenSignedResponseAlg({ metadata: {} }, {})).toBe('RS256');
    expect(pickIdTokenSignedResponseAlg(undefined, {})).toBe('RS256');
  });

  it('treats an empty override as "auto-detect"', () => {
    const issuer = {
      metadata: { id_token_signing_alg_values_supported: ['ES384'] },
    };
    expect(
      pickIdTokenSignedResponseAlg(issuer, {
        id_token_signed_response_alg: '',
      }),
    ).toBe('ES384');
  });
});
