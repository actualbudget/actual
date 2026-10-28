import { describe, expect, it } from 'vitest';

import { routeForWidgetUrl } from './homeScreenWidgetsPlugin';

describe('routeForWidgetUrl', () => {
  it('maps the widget links to in-app routes', () => {
    expect(routeForWidgetUrl('actualbudget://budget')).toBe('/budget');
    expect(routeForWidgetUrl('actualbudget://budget/')).toBe('/budget');
    expect(routeForWidgetUrl('actualbudget://accounts')).toBe('/accounts');
    expect(routeForWidgetUrl('actualbudget://transactions/new')).toBe(
      '/transactions/new',
    );
    expect(
      routeForWidgetUrl(
        'actualbudget://accounts/4b5d6c1e-9f2a-4c3b-8d7e-1a2b3c4d5e6f',
      ),
    ).toBe('/accounts/4b5d6c1e-9f2a-4c3b-8d7e-1a2b3c4d5e6f');
  });

  it('ignores links that are not widget links', () => {
    expect(routeForWidgetUrl('actualbudget://')).toBeNull();
    expect(routeForWidgetUrl('actualbudget://settings')).toBeNull();
    expect(routeForWidgetUrl('actualbudget://accounts/id/extra')).toBeNull();
    expect(routeForWidgetUrl('https://example.com/budget')).toBeNull();
    expect(routeForWidgetUrl('not a url')).toBeNull();
  });
});
