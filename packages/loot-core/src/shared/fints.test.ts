import { getFinTSConnectionId } from './fints';

describe('getFinTSConnectionId', () => {
  it('reads the connection from an account id', () => {
    expect(getFinTSConnectionId('conn-1|1234567')).toBe('conn-1');
    expect(getFinTSConnectionId('conn-1|1234567|01')).toBe('conn-1');
  });

  it('returns null for ids of other providers', () => {
    expect(getFinTSConnectionId('3f2a9c1e-acct')).toBeNull();
    expect(getFinTSConnectionId('')).toBeNull();
  });
});
