import React from 'react';
import { useTranslation } from 'react-i18next';

import { Menu } from '@actual-app/components/menu';
import type { MenuItem } from '@actual-app/components/menu';

export type SavedStatus = 'saved' | 'new' | 'modified';

export function SaveReportMenu({
  onMenuSelect,
  savedStatus,
  listReports,
}: {
  onMenuSelect: (item: string) => void;
  savedStatus: SavedStatus;
  listReports: number;
}) {
  const { t } = useTranslation();
  const savedMenu: MenuItem[] =
    savedStatus === 'saved'
      ? [
          { name: 'rename-report', text: t('Rename') },
          { name: 'delete-report', text: t('Delete') },
          Menu.line,
        ]
      : [];

  const modifiedMenu: MenuItem[] =
    savedStatus === 'modified'
      ? [
          { name: 'rename-report', text: t('Rename') },
          {
            name: 'update-report',
            text: t('Update report'),
          },
          {
            name: 'reload-report',
            text: t('Revert changes'),
          },
          { name: 'delete-report', text: t('Delete') },
          Menu.line,
        ]
      : [];

  const unsavedMenu: MenuItem[] = [
    {
      name: 'save-report',
      text: t('Save new report'),
    },
    {
      name: 'reset-report',
      text: t('Reset to default'),
    },
    Menu.line,
    {
      name: 'choose-report',
      text: t('Choose Report'),
      disabled: listReports > 0 ? false : true,
    },
  ];

  return (
    <Menu
      onMenuSelect={item => {
        onMenuSelect(item);
      }}
      items={[...savedMenu, ...modifiedMenu, ...unsavedMenu]}
    />
  );
}
