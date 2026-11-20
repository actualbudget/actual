import { describe, expect, it, vi } from 'vitest';

import {
  translateBuiltInDashboardContent,
  translateBuiltInDashboardName,
} from './defaultDashboardNames';

describe('translateBuiltInDashboardName', () => {
  it('translates names seeded on the built-in dashboard', () => {
    const t = vi.fn(key => `sv:${key}`);

    expect(
      translateBuiltInDashboardName(
        'Total Income (YTD)',
        'total-income-ytd',
        t,
      ),
    ).toBe('sv:Total Income (YTD)');
    expect(t).toHaveBeenCalledWith('Total Income (YTD)');
  });

  it('preserves a custom dashboard name', () => {
    const t = vi.fn();

    expect(translateBuiltInDashboardName('Månadsöversikt', undefined, t)).toBe(
      'Månadsöversikt',
    );
    expect(t).not.toHaveBeenCalled();
  });

  it('preserves a user title that equals a built-in English title', () => {
    const t = vi.fn();

    expect(translateBuiltInDashboardName('This Month', undefined, t)).toBe(
      'This Month',
    );
    expect(t).not.toHaveBeenCalled();
  });

  it('translates the built-in dashboard tips without changing custom content', () => {
    const t = vi.fn(key => `sv:${key}`);
    const defaultContent =
      '## Dashboard Tips\n\nYou can add new widgets or edit existing widgets by using the buttons at the top of the page. Choose a widget type and customize it to fit your needs.\n\n**Moving cards:** Drag any card by its header to reposition it.\n\n**Deleting cards:** Click the three-dot menu on any card and select "Remove".';

    expect(
      translateBuiltInDashboardContent(defaultContent, 'dashboard-tips', t),
    ).toBe(`sv:${defaultContent}`);
    expect(translateBuiltInDashboardContent('## Egna tips', undefined, t)).toBe(
      '## Egna tips',
    );
  });
});
