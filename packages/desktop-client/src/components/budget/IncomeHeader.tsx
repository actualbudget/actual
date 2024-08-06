import React from 'react';

import { Button } from '../common/Button2';
import { View } from '../common/View';

import { RenderMonths } from './RenderMonths';

type IncomeHeaderProps = {
  MonthComponent?: () => JSX.Element;
  onShowNewGroup: () => void;
};

export function IncomeHeader({
  MonthComponent,
  onShowNewGroup,
}: IncomeHeaderProps) {
  return (
    <View style={{ flexDirection: 'row', flex: 1 }}>
      <View
        style={{
          width: 200,
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
        }}
      >
        <Button onPress={onShowNewGroup} style={{ fontSize: 12, margin: 10 }}>
          Add Group
        </Button>
      </View>
      <RenderMonths
        component={MonthComponent}
        style={{ border: 0, justifyContent: 'flex-end' }}
      />
    </View>
  );
}
