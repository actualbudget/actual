import React from 'react';

import Button from '../common/Button';
import View from '../common/View';

import RenderMonths from './RenderMonths';

function IncomeHeader({ MonthComponent, onShowNewGroup }) {
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
      />
    </View>
  );
}

export default IncomeHeader;
