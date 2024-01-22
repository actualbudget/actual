import React from 'react';

import { type CustomReportEntity } from 'loot-core/src/types/models';

import { Menu } from '../common/Menu';
import { MenuTooltip } from '../common/MenuTooltip';

export function SaveReportMenu({
  report,
  onClose,
  onMenuSelect,
  savedStatus,
}: {
  report: CustomReportEntity;
  onClose: () => void;
  onMenuSelect: (item: string) => void;
  savedStatus: string;
}) {
  return (
    <MenuTooltip width={150} onClose={onClose}>
      <Menu
        onMenuSelect={item => {
          onMenuSelect(item);
        }}
        items={
          report.id === undefined
            ? [
                {
                  name: 'save-report',
                  text: 'Save new report',
                },
                {
                  name: 'reset-report',
                  text: 'Reset to default',
                },
              ]
            : savedStatus === 'saved'
              ? [
                  { name: 'rename-report', text: 'Rename' },
                  { name: 'delete-report', text: 'Delete' },
                  Menu.line,
                  {
                    name: 'save-report',
                    text: 'Save new report',
                  },
                  {
                    name: 'reset-report',
                    text: 'Reset to default',
                  },
                ]
              : [
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
                  {
                    name: 'save-report',
                    text: 'Save new report',
                  },
                  {
                    name: 'reset-report',
                    text: 'Reset to default',
                  },
                ]
        }
      />
    </MenuTooltip>
  );
}
