import { describe, expect, it } from 'vitest';

import { routeForAppUrl } from './deepLinks';

describe('routeForAppUrl', () => {
  it('maps the add transaction widget link to its route', () => {
    expect(routeForAppUrl('actualbudget://transactions/new')).toBe(
      '/transactions/new',
    );
  });

  it('ignores anything else', () => {
    expect(routeForAppUrl('actualbudget://settings')).toBeNull();
    expect(routeForAppUrl('https://example.com/transactions/new')).toBeNull();
  });
});
