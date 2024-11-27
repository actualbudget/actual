import React from 'react';
import { useTranslation } from 'react-i18next';

import { type TransactionFilterEntity } from 'loot-core/types/models';

import { Menu } from '../common/Menu';

export function FilterMenu({
  filter,
  dirtyFilter,
  onFilterMenuSelect,
}: {
  filter?: TransactionFilterEntity;
  dirtyFilter?: TransactionFilterEntity;
  onFilterMenuSelect: (item: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <Menu
      onMenuSelect={item => {
        onFilterMenuSelect(item);
      }}
      items={
        !filter?.id
          ? [
              { name: 'save-filter', text: t('Save new filter') },
              { name: 'clear-filter', text: t('Clear all filter conditions') },
            ]
          : filter?.id !== null && !dirtyFilter
            ? [
                { name: 'rename-filter', text: t('Rename') },
                { name: 'delete-filter', text: t('Delete') },
                Menu.line,
                {
                  name: 'save-filter',
                  text: t('Save new filter'),
                  disabled: true,
                },
                {
                  name: 'clear-filter',
                  text: t('Clear all filter conditions'),
                },
              ]
            : [
                { name: 'rename-filter', text: t('Rename') },
                { name: 'update-filter', text: t('Update filter conditions') },
                { name: 'reload-filter', text: t('Revert changes') },
                { name: 'delete-filter', text: t('Delete') },
                Menu.line,
                { name: 'save-filter', text: t('Save new filter') },
                {
                  name: 'clear-filter',
                  text: t('Clear all filter conditions'),
                },
              ]
      }
    />
  );
}
