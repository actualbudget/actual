import { describe, expect, it } from 'vitest';

import { calculateForwardAmortization } from './index';

describe('calculateForwardAmortization', () => {
  it('spreads a single lump sum payment evenly across N months', () => {
    const result = calculateForwardAmortization({ '2026-01': 900 }, 6);

    expect(result['2026-01']).toBe(150);
    expect(result['2026-02']).toBe(150);
    expect(result['2026-03']).toBe(150);
    expect(result['2026-04']).toBe(150);
    expect(result['2026-05']).toBe(150);
    expect(result['2026-06']).toBe(150);
    expect(result['2026-07']).toBeUndefined();
  });

  it('queues an early renewal payment made in the final month to start next month without double-counting', () => {
    // 6-month period: Jan to June.
    // Renewal is charged in June (e.g. June 28).
    const result = calculateForwardAmortization(
      { '2026-01': 900, '2026-06': 900 },
      6,
    );

    // June should NOT double-count to 300; it stays at 150
    expect(result['2026-05']).toBe(150);
    expect(result['2026-06']).toBe(150);
    expect(result['2026-07']).toBe(150);
    expect(result['2026-08']).toBe(150);
    expect(result['2026-11']).toBe(150);
    expect(result['2026-12']).toBe(150);
    expect(result['2027-01']).toBeUndefined();
  });

  it('handles price changes on renewal seamlessly', () => {
    // Jan: $900 ($150/mo), June renewal: $1,050 ($175/mo)
    const result = calculateForwardAmortization(
      { '2026-01': 900, '2026-06': 1050 },
      6,
    );

    expect(result['2026-05']).toBe(150);
    expect(result['2026-06']).toBe(150);
    expect(result['2026-07']).toBe(175);
    expect(result['2026-08']).toBe(175);
    expect(result['2026-12']).toBe(175);
  });

  it('handles on-time renewal payments made in the renewal month', () => {
    const result = calculateForwardAmortization(
      { '2026-01': 900, '2026-07': 900 },
      6,
    );

    expect(result['2026-06']).toBe(150);
    expect(result['2026-07']).toBe(150);
    expect(result['2026-12']).toBe(150);
  });

  it('handles gaps between payment cycles (e.g. tuition summer break)', () => {
    // 3-month tuition: Fall paid in Aug, Spring paid in Jan (Dec is a gap)
    const result = calculateForwardAmortization(
      { '2025-08': 3000, '2026-01': 3000 },
      3,
    );

    expect(result['2025-08']).toBe(1000);
    expect(result['2025-09']).toBe(1000);
    expect(result['2025-10']).toBe(1000);
    expect(result['2025-11']).toBeUndefined();
    expect(result['2025-12']).toBeUndefined();
    expect(result['2026-01']).toBe(1000);
    expect(result['2026-02']).toBe(1000);
    expect(result['2026-03']).toBe(1000);
    expect(result['2026-04']).toBeUndefined();
  });
});
