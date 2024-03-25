import React, { type ComponentPropsWithoutRef } from 'react';

import { Menu } from '../common/Menu';
import { MenuTooltip } from '../common/MenuTooltip';

export function SaveReportMenu({
  onClose,
  onMenuSelect,
  savedStatus,
  listReports,
}: {
  onClose: () => void;
  onMenuSelect: (item: string) => void;
  savedStatus: string;
  listReports: number;
}) {
  const savedMenu: ComponentPropsWithoutRef<typeof Menu> =
    savedStatus === 'saved'
      ? {
          items: [
            { name: 'rename-report', text: 'Rename' },
            { name: 'delete-report', text: 'Delete' },
            Menu.line,
          ],
        }
      : {
          items: [],
        };

  const modifiedMenu: ComponentPropsWithoutRef<typeof Menu> =
    savedStatus === 'modified'
      ? {
          items: [
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
          ],
        }
      : {
          items: [],
        };

  const unsavedMenu: ComponentPropsWithoutRef<typeof Menu> = {
    items: [
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
    ],
  };

  return (
    <MenuTooltip width={150} onClose={onClose}>
      <Menu
        onMenuSelect={item => {
          onMenuSelect(item);
        }}
        items={[
          ...savedMenu.items,
          ...modifiedMenu.items,
          ...unsavedMenu.items,
        ]}
      />
    </MenuTooltip>
  );
}
