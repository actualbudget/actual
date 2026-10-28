import { describe, expect, it } from 'vitest';

import { routeForWidgetUrl } from './homeScreenWidgetsPlugin';

describe('routeForWidgetUrl', () => {
  it('maps the add transaction widget link to its route', () => {
    expect(routeForWidgetUrl('actualbudget://transactions/new')).toBe(
      '/transactions/new',
    );
    expect(routeForWidgetUrl('actualbudget://transactions/new/')).toBe(
      '/transactions/new',
    );
  });

  it('ignores links that are not widget links', () => {
    expect(routeForWidgetUrl('actualbudget://')).toBeNull();
    expect(routeForWidgetUrl('actualbudget://settings')).toBeNull();
    expect(
      routeForWidgetUrl('actualbudget://transactions/new/extra'),
    ).toBeNull();
    expect(
      routeForWidgetUrl('https://example.com/transactions/new'),
    ).toBeNull();
    expect(routeForWidgetUrl('not a url')).toBeNull();
  });
});
