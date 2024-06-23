import React from 'react';

import { type CustomReportEntity } from 'loot-core/types/models/reports';

import { Menu } from '../../common/Menu';

type ListCardsMenuProps = {
  onMenuSelect: (item: string, report: CustomReportEntity) => void;
  report: CustomReportEntity;
};

export function ListCardsMenu({ onMenuSelect, report }: ListCardsMenuProps) {
  return (
    <Menu
      onMenuSelect={item => {
        onMenuSelect(item, report);
      }}
      items={[
        {
          name: 'rename',
          text: 'Rename report',
        },
        {
          name: 'delete',
          text: 'Delete report',
        },
      ]}
    />
  );
}
