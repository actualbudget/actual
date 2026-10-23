import { describe, expect, it } from 'vitest';

import {
  commandBarRecentPath,
  getCommandBarRecentRef,
} from './commandBarRecent';
import type { CommandBarRecentNavigationId } from './commandBarRecent';

const catalog = {
  navigationItems: [
    { id: 'budget', path: '/budget' },
    { id: 'reports-nav', path: '/reports' },
    { id: 'payees', path: '/settings/payees' },
    { id: 'bank-sync', path: '/settings/bank-sync' },
  ],
  accounts: [],
  dashboardPages: [],
  customReports: [],
} satisfies {
  navigationItems: readonly {
    id: CommandBarRecentNavigationId;
    path: string;
  }[];
  accounts: never[];
  dashboardPages: never[];
  customReports: never[];
};

describe('Command Bar recent navigation', () => {
  it('resolves configured navigation in the current user order', () => {
    expect(getCommandBarRecentRef('/settings/payees', catalog)).toEqual({
      type: 'navigation',
      id: 'payees',
    });
    expect(getCommandBarRecentRef('/settings/bank-sync', catalog)).toEqual({
      type: 'navigation',
      id: 'bank-sync',
    });
    expect(getCommandBarRecentRef('/payees', catalog)).toBeNull();
  });

  it('uses the live configured path for hidden navigation items', () => {
    expect(
      commandBarRecentPath(
        { type: 'navigation', id: 'payees' },
        catalog.navigationItems,
      ),
    ).toBe('/settings/payees');
  });
});
