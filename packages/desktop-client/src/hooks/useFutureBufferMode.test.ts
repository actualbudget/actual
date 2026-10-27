import { isManagedMonth } from './useFutureBufferMode';

describe('isManagedMonth', () => {
  it('manages unfrozen months from the start month on', () => {
    expect(isManagedMonth('2026-10', '2026-10', 0)).toBe(true);
    expect(isManagedMonth('2026-10', '2027-03', null)).toBe(true);
    expect(isManagedMonth('2026-10', '2026-09', 0)).toBe(false);
    expect(isManagedMonth('2026-10', '2026-10', 1)).toBe(false);
    expect(isManagedMonth('', '2026-10', 0)).toBe(false);
  });
});
