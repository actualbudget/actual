import React from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { View } from '@actual-app/components/view';

import { ReportCard } from '@desktop-client/components/reports/ReportCard';

type MissingReportCardProps = {
  isEditing?: boolean;
  onRemove: () => void;
  children: ReactNode;
};

export function MissingReportCard({
  isEditing,
  onRemove,
  children,
}: MissingReportCardProps) {
  const { t } = useTranslation();

  return (
    <ReportCard
      isEditing={isEditing}
      menuItems={[
        {
          name: 'remove',
          text: t('Remove'),
        },
      ]}
      onMenuSelect={item => {
        switch (item) {
          case 'remove':
            onRemove();
            break;
          default:
            throw new Error(`Unrecognized menu option: ${item}`);
        }
      }}
    >
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 10,
        }}
      >
        {children}
      </View>
    </ReportCard>
  );
}
