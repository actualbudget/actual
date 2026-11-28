import { describe, expect, it, vi } from 'vitest';

import {
  getCommandItemValue,
  getExportErrorNotification,
  getExportWarningNotifications,
  getTourCommandLabel,
  runSyncAndDownload,
  shouldSuppressCommandBarShortcut,
} from './CommandBar';

describe('CommandBar foundation behavior', () => {
  it('suppresses the global shortcut while a modal is active', () => {
    expect(shouldSuppressCommandBarShortcut(1)).toBe(true);
    expect(shouldSuppressCommandBarShortcut(0)).toBe(false);
  });

  it('qualifies cmdk values by section and item', () => {
    expect(getCommandItemValue('navigation', 'reports')).toBe(
      'navigation:reports',
    );
    expect(getCommandItemValue('actions', 'reports')).not.toBe(
      getCommandItemValue('navigation', 'reports'),
    );
  });

  it('delegates account sync to the sync-and-download mutation', () => {
    const mutate = vi.fn();
    runSyncAndDownload({ mutate });
    expect(mutate).toHaveBeenCalledWith({});
  });

  it('uses the translated master tour copy', () => {
    expect(
      getTourCommandLabel((key, options) => `${key}:${options.appName}`),
    ).toBe('Take a tour of {{appName}}:Actual');
  });

  it('uses the stable export-error notification id for save rejection', () => {
    expect(getExportErrorNotification('Export failed')).toEqual({
      id: 'export-error',
      type: 'error',
      message: 'Export failed',
    });
  });

  it('surfaces both upstream export safety warnings with translated copy', () => {
    const notifications = getExportWarningNotifications(
      ['exceeds-import-size-limit', 'may-exceed-available-memory'],
      key => `translated:${key}`,
    );
    expect(notifications).toEqual([
      {
        id: 'export-exceeds-import-size-limit',
        type: 'warning',
        sticky: true,
        message:
          'translated:This export is larger than Actual can safely re-import. You may not be able to restore this backup.',
      },
      {
        id: 'export-may-exceed-available-memory',
        type: 'warning',
        sticky: true,
        message:
          'translated:This export is larger than the memory available on this device. Restoring it here may fail.',
      },
    ]);
    expect(getExportWarningNotifications([], key => key)).toEqual([]);
    expect(getExportWarningNotifications(['unknown'], key => key)).toEqual([]);
  });

  it('keeps configurable sidebar order and hidden paths compatible', async () => {
    const { getDefaultSidebarMenuItems, getSidebarMenuItemPath } =
      await import('#components/sidebar/sidebarMenu');
    const items = getDefaultSidebarMenuItems();
    expect(items.map(item => item.id)).toEqual([
      'budget',
      'reports',
      'schedules',
      'payees',
      'tags',
      'rules',
      'bank-sync',
    ]);
    expect(getSidebarMenuItemPath('schedules', false)).toBe(
      '/settings/schedules',
    );
    expect(getSidebarMenuItemPath('bank-sync', false)).toBe(
      '/settings/bank-sync',
    );
    expect(getSidebarMenuItemPath('budget', true)).toBe('/budget');
  });
});
