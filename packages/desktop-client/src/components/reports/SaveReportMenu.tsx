import React from 'react';

import { Menu, type MenuProps } from '../common/Menu';
import { MenuTooltip } from '../common/MenuTooltip';

export function SaveReportMenu({
  onClose,
  onMenuSelect,
  savedStatus,
}: {
  onClose: () => void;
  onMenuSelect: (item: string) => void;
  savedStatus: string;
}) {
  const savedMenu: MenuProps =
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

  const modifiedMenu: MenuProps =
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

  const unsavedMenu: MenuProps = {
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
