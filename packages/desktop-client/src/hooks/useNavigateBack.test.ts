import { hasPreviousHistoryEntry } from './useNavigateBack';

describe('hasPreviousHistoryEntry', () => {
  it('is false when there is no history state', () => {
    expect(hasPreviousHistoryEntry(null)).toBe(false);
    expect(hasPreviousHistoryEntry(undefined)).toBe(false);
  });

  it('is false when the state has no index', () => {
    expect(hasPreviousHistoryEntry({})).toBe(false);
    expect(hasPreviousHistoryEntry({ usr: { foo: 1 } })).toBe(false);
  });

  it('is false for the first entry', () => {
    expect(hasPreviousHistoryEntry({ idx: 0 })).toBe(false);
  });

  it('is false for a malformed index', () => {
    expect(hasPreviousHistoryEntry({ idx: '1' })).toBe(false);
    expect(hasPreviousHistoryEntry({ idx: -1 })).toBe(false);
    expect(hasPreviousHistoryEntry({ idx: Number.NaN })).toBe(false);
    expect(hasPreviousHistoryEntry('idx')).toBe(false);
  });

  it('is true for a later entry', () => {
    expect(hasPreviousHistoryEntry({ idx: 1 })).toBe(true);
    expect(hasPreviousHistoryEntry({ idx: 7, usr: null })).toBe(true);
  });
});
