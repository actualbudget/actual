import React from 'react';

import View from '../common/View';

import RenderMonths from './RenderMonths';

type IncomeHeaderProps = {
  MonthComponent?: () => JSX.Element;
  onShowNewGroup: () => void;
};

function IncomeHeader({ MonthComponent }: IncomeHeaderProps) {
  return (
    <View style={{ flexDirection: 'row', flex: 1 }}>
      <RenderMonths
        component={MonthComponent}
        style={{ border: 0, justifyContent: 'flex-end' }}
      />
    </View>
  );
}

export default IncomeHeader;
