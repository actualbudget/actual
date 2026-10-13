import {
  getDefaultSidebarMenuItems,
  getSidebarMenuItemPath,
  isInMobileSettingsNav,
  moveSidebarMenuItem,
  parseSidebarMenuItems,
  parseSidebarStartPage,
} from './sidebarMenu';

describe('parseSidebarMenuItems', () => {
  it('returns the defaults when nothing is saved', () => {
    expect(parseSidebarMenuItems(undefined)).toEqual([
      { id: 'budget', hidden: false },
      { id: 'reports', hidden: false },
      { id: 'schedules', hidden: false },
      { id: 'payees', hidden: true },
      { id: 'tags', hidden: true },
      { id: 'rules', hidden: true },
      { id: 'bank-sync', hidden: true },
    ]);
  });

  it('returns the defaults for a malformed value', () => {
    expect(parseSidebarMenuItems('{not json')).toEqual(
      getDefaultSidebarMenuItems(),
    );
  });

  it('keeps the saved order and visibility', () => {
    const saved = [
      { id: 'payees', hidden: false },
      { id: 'budget', hidden: false },
      { id: 'reports', hidden: false },
      { id: 'schedules', hidden: true },
      { id: 'tags', hidden: true },
      { id: 'rules', hidden: false },
      { id: 'bank-sync', hidden: true },
    ];

    expect(parseSidebarMenuItems(JSON.stringify(saved))).toEqual(saved);
  });

  it('drops unknown and duplicate entries', () => {
    const items = parseSidebarMenuItems(
      JSON.stringify([
        { id: 'reports', hidden: false },
        { id: 'unknown', hidden: false },
        { id: 'reports', hidden: true },
        null,
      ]),
    );

    expect(items.filter(item => item.id === 'reports')).toEqual([
      { id: 'reports', hidden: false },
    ]);
    expect(items).toHaveLength(7);
  });

  it('inserts missing pages at their default position', () => {
    const items = parseSidebarMenuItems(
      JSON.stringify([
        { id: 'schedules', hidden: false },
        { id: 'budget', hidden: false },
      ]),
    );

    expect(items.map(item => item.id)).toEqual([
      'reports',
      'schedules',
      'budget',
      'payees',
      'tags',
      'rules',
      'bank-sync',
    ]);
    expect(items.find(item => item.id === 'reports')?.hidden).toBe(false);
    expect(items.find(item => item.id === 'payees')?.hidden).toBe(true);
  });

  it('always keeps budget and reports in the sidebar', () => {
    const items = parseSidebarMenuItems(
      JSON.stringify(
        getDefaultSidebarMenuItems().map(item => ({ ...item, hidden: true })),
      ),
    );

    expect(items.filter(item => !item.hidden)).toEqual([
      { id: 'budget', hidden: false },
      { id: 'reports', hidden: false },
    ]);
  });
});

describe('parseSidebarStartPage', () => {
  const items = parseSidebarMenuItems(
    JSON.stringify([
      { id: 'reports', hidden: false },
      { id: 'budget', hidden: false },
      { id: 'schedules', hidden: true },
    ]),
  );

  it('returns the saved page whether or not it is in the sidebar', () => {
    expect(parseSidebarStartPage('budget', items)).toBe('budget');
    expect(parseSidebarStartPage('schedules', items)).toBe('schedules');
  });

  it('falls back to the first page', () => {
    expect(parseSidebarStartPage(undefined, items)).toBe('reports');
    expect(parseSidebarStartPage('unknown', items)).toBe('reports');
  });
});

describe('moveSidebarMenuItem', () => {
  const items = getDefaultSidebarMenuItems().slice(0, 3);

  it('moves a page before the target', () => {
    expect(
      moveSidebarMenuItem(items, 'schedules', 'budget', 'before').map(
        item => item.id,
      ),
    ).toEqual(['schedules', 'budget', 'reports']);
  });

  it('moves a page after the target', () => {
    expect(
      moveSidebarMenuItem(items, 'budget', 'schedules', 'after').map(
        item => item.id,
      ),
    ).toEqual(['reports', 'schedules', 'budget']);
  });

  it('leaves the order alone for an unknown target', () => {
    expect(moveSidebarMenuItem(items, 'budget', 'unknown', 'after')).toBe(
      items,
    );
  });
});

describe('isInMobileSettingsNav', () => {
  it('leaves schedules and tags out of the mobile settings menu', () => {
    expect(isInMobileSettingsNav('schedules')).toBe(false);
    expect(isInMobileSettingsNav('tags')).toBe(false);
    expect(isInMobileSettingsNav('payees')).toBe(true);
    expect(isInMobileSettingsNav('bank-sync')).toBe(true);
  });
});

describe('getSidebarMenuItemPath', () => {
  it('uses a top-level path for pages in the sidebar', () => {
    expect(getSidebarMenuItemPath('payees', true)).toBe('/payees');
    expect(getSidebarMenuItemPath('budget', true)).toBe('/budget');
  });

  it('keeps settings sections under /settings when they are not in the sidebar', () => {
    expect(getSidebarMenuItemPath('payees', false)).toBe('/settings/payees');
    expect(getSidebarMenuItemPath('schedules', false)).toBe(
      '/settings/schedules',
    );
  });
});
