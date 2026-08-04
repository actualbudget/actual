import React from 'react';
import type { ReactNode } from 'react';

import { View } from '@actual-app/components/view';

import { ReportCard } from '#components/reports/ReportCard';

type MissingReportCardProps = {
  widgetId: string;
  isEditing?: boolean;
  children: ReactNode;
};

export function MissingReportCard({
  widgetId,
  isEditing,
  children,
}: MissingReportCardProps) {
  return (
    <ReportCard widgetId={widgetId} isEditing={isEditing}>
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
