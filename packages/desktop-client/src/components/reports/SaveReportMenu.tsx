import React from 'react';

import { Menu, type MenuItem } from '../common/Menu';

export function SaveReportMenu({
  onMenuSelect,
  savedStatus,
  listReports,
}: {
  onMenuSelect: (item: string) => void;
  savedStatus: string;
  listReports: number;
}) {
  const savedMenu: MenuItem[] =
    savedStatus === 'saved'
      ? [
          { name: 'rename-report', text: 'Rename' },
          { name: 'delete-report', text: 'Delete' },
          Menu.line,
        ]
      : [];

  const modifiedMenu: MenuItem[] =
    savedStatus === 'modified'
      ? [
          { name: 'rename-report', text: 'Rename' },
          {
            name: 'update-report',
            text: 'Update report',
          },
          {
            name: 'reload-report',
            text: 'Revert changes',
          },
          { name: 'delete-report', text: 'Delete' },
          Menu.line,
        ]
      : [];

  const unsavedMenu: MenuItem[] = [
    {
      name: 'save-report',
      text: 'Save new report',
    },
    {
      name: 'reset-report',
      text: 'Reset to default',
    },
    Menu.line,
    {
      name: 'choose-report',
      text: 'Choose Report',
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
