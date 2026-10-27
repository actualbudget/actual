import { isManagedMonth } from './useFutureBufferMode';

describe('isManagedMonth', () => {
  it('manages the months from the start month on', () => {
    expect(isManagedMonth('2026-10', '2026-10', 0)).toBe(true);
    expect(isManagedMonth('2026-10', '2027-03', null)).toBe(true);
  });

  it('leaves the months before the start month alone', () => {
    expect(isManagedMonth('2026-10', '2026-09', 0)).toBe(false);
  });

  it('is off in manual mode', () => {
    expect(isManagedMonth('', '2026-10', 0)).toBe(false);
    expect(isManagedMonth(null, '2026-10', 0)).toBe(false);
  });

  it('stops managing a frozen month', () => {
    expect(isManagedMonth('2026-10', '2026-10', 1)).toBe(false);
  });
});
