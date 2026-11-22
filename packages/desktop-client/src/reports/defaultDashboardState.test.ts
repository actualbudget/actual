import type { TFunction } from 'i18next';
import { describe, expect, it } from 'vitest';

import { getDefaultDashboardState } from './defaultDashboardState';

describe('getDefaultDashboardState', () => {
  it('translates every static default label', () => {
    const t = ((key: string) => `translated:${key}`) as TFunction;
    const widgets = getDefaultDashboardState(t);

    expect(widgets[0].meta).toMatchObject({
      name: 'translated:Total Income (YTD)',
    });
    expect(widgets[6].meta).toMatchObject({ name: 'translated:This Month' });
    expect(widgets[11].meta).toMatchObject({
      content: expect.stringContaining('translated:## Dashboard Tips'),
    });
  });
});
