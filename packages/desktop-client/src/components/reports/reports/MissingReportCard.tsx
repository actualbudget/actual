import React, { type ReactNode } from 'react';

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
  return (
    <ReportCard
      isEditing={isEditing}
      menuItems={[
        {
          name: 'remove',
          text: 'Remove',
        },
      ]}
      onMenuSelect={item => {
        switch (item) {
          case 'remove':
            onRemove();
            break;
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
