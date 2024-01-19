// @ts-strict-ignore
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
  onMenuSelect: (item) => void;
  savedStatus: string;
}) {
  return (
    <MenuTooltip width={150} onClose={onClose}>
      <Menu
        onMenuSelect={item => {
          onMenuSelect(item);
        }}
        items={
          report.id === null
            ? [
                {
                  name: 'save-report',
                  text: 'Save new report',
                  disabled: true,
                },
                {
                  name: 'reset-report',
                  text: 'Reset to default',
                  disabled: true,
                },
              ]
            : savedStatus === 'saved'
            ? [
                { name: 'rename-report', text: 'Rename', disabled: true },
                { name: 'delete-report', text: 'Delete', disabled: true },
                Menu.line,
                {
                  name: 'save-report',
                  text: 'Save new report',
                  disabled: true,
                },
                {
                  name: 'reset-report',
                  text: 'Reset to default',
                  disabled: true,
                },
              ]
            : [
                { name: 'rename-report', text: 'Rename', disabled: true },
                {
                  name: 'update-report',
                  text: 'Update report',
                  disabled: true,
                },
                {
                  name: 'reload-report',
                  text: 'Revert changes',
                  disabled: true,
                },
                { name: 'delete-report', text: 'Delete', disabled: true },
                Menu.line,
                {
                  name: 'save-report',
                  text: 'Save new report',
                  disabled: true,
                },
                {
                  name: 'reset-report',
                  text: 'Reset to default',
                  disabled: true,
                },
              ]
        }
      />
    </MenuTooltip>
  );
}
