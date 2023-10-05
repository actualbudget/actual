import React, { type ReactNode } from 'react';

import Button from '../common/Button';
import View from '../common/View';

import RenderMonths from './RenderMonths';

type IncomeHeaderProps = {
  MonthComponent?: ReactNode;
  onShowNewGroup: () => void;
};

function IncomeHeader({ MonthComponent, onShowNewGroup }: IncomeHeaderProps) {
  return (
    <View style={{ flexDirection: 'row', flex: 1 }}>
      <View
        style={{
          width: 200,
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
        }}
      >
        <Button onClick={onShowNewGroup} style={{ fontSize: 12, margin: 10 }}>
          Add Group
        </Button>
      </View>
      <RenderMonths
        component={MonthComponent}
        style={{ border: 0, justifyContent: 'flex-end' }}
        editingIndex={undefined}
        args={undefined}
      />
    </View>
  );
}

export default IncomeHeader;
