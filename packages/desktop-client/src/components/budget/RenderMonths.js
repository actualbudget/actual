import React, { useContext } from 'react';

import * as monthUtils from 'loot-core/src/shared/months';

import { colors } from '../../style';
import View from '../common/View';
import NamespaceContext from '../spreadsheet/NamespaceContext';

import { MonthsContext } from './MonthsContext';

function RenderMonths({ component: Component, editingIndex, args, style }) {
  let { months, type } = useContext(MonthsContext);

  return months.map((month, index) => {
    let editing = editingIndex === index;

    return (
      <NamespaceContext.Provider
        key={index}
        value={monthUtils.sheetForMonth(month, type)}
      >
        <View
          style={{
            flex: 1,
            borderLeft: '1px solid ' + colors.border,
            ...style,
          }}
        >
          <Component monthIndex={index} editing={editing} {...args} />
        </View>
      </NamespaceContext.Provider>
    );
  });
}

export default RenderMonths;
