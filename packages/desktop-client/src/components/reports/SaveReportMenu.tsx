// @ts-strict-ignore
import React from 'react';

import { Menu } from '../common/Menu';
import { MenuTooltip } from '../common/MenuTooltip';

export function SaveReportMenu({ reportId, onClose, onMenuSelect }) {
  return (
    <MenuTooltip width={150} onClose={onClose}>
      <Menu
        onMenuSelect={item => {
          onMenuSelect(item);
        }}
        items={
          reportId.length === 0
            ? [
                { name: 'save-report', text: 'Save new report' },
                { name: 'reset-report', text: 'Reset to default' },
              ]
            : reportId.id !== null && reportId.status === 'saved'
            ? [
                { name: 'rename-report', text: 'Rename' },
                { name: 'delete-report', text: 'Delete' },
                Menu.line,
                {
                  name: 'save-report',
                  text: 'Save new report',
                  disabled: true,
                },
                { name: 'reset-report', text: 'Reset to default' },
              ]
            : [
                { name: 'rename-report', text: 'Rename' },
                { name: 'update-report', text: 'Update report' },
                { name: 'reload-report', text: 'Revert changes' },
                { name: 'delete-report', text: 'Delete' },
                Menu.line,
                { name: 'save-report', text: 'Save new report' },
                { name: 'reset-report', text: 'Reset to default' },
              ]
        }
      />
    </MenuTooltip>
  );
}
