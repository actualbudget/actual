import React from 'react';

import { View } from '../../common/View';
import { ReportCard } from '../ReportCard';

type MissingReportCardProps = {
  onRemove: () => void;
};

// TODO: the content and design of this component could be improved
export function MissingReportCard({ onRemove }: MissingReportCardProps) {
  return (
    <ReportCard
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
        }}
      >
        This custom report has been deleted.
      </View>
    </ReportCard>
  );
}
