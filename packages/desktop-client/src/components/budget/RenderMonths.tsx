import React, {
  type FunctionComponent,
  useContext,
  type CSSProperties,
} from 'react';

import * as monthUtils from 'loot-core/src/shared/months';

import { theme } from '../../style';
import View from '../common/View';
import NamespaceContext from '../spreadsheet/NamespaceContext';

import { MonthsContext } from './MonthsContext';

type ComponentProps = { monthIndex: number; editing: boolean };

type RenderMonthsProps = {
  component?: FunctionComponent<ComponentProps>;
  editingIndex?: undefined;
  args?: object;
  style?: CSSProperties;
};

function RenderMonths({
  component: Component,
  editingIndex,
  args,
  style,
}: RenderMonthsProps) {
  let { months, type } = useContext(MonthsContext);

  return months.map((month, index) => {
    let editing = editingIndex === index;

    return (
      <NamespaceContext.Provider
        key={index}
        value={monthUtils.sheetForMonth(month)}
      >
        <View
          style={{
            flex: 1,
            borderLeft: '1px solid ' + theme.tableBorder,
            ...style,
          }}
        >
          <Component monthIndex={index} editing={editing} {...args} />
        </View>
      </NamespaceContext.Provider>
    );
  }) as any;
}

export default RenderMonths;
