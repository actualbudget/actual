// @ts-strict-ignore
import React, {
  useContext,
  type CSSProperties,
  type ComponentType,
} from 'react';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import * as monthUtils from 'loot-core/shared/months';

import { NamespaceContext } from '../spreadsheet/NamespaceContext';

import { MonthsContext } from './MonthsContext';

type RenderMonthsProps = {
  component?: ComponentType<{ month: string; editing: boolean }>;
  editingMonth?: string;
  args?: object;
  style?: CSSProperties;
};

export function RenderMonths({
  component: Component,
  editingMonth,
  args,
  style,
}: RenderMonthsProps) {
  const { months } = useContext(MonthsContext);

  return months.map((month, index) => {
    const editing = editingMonth === month;

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
          <Component month={month} editing={editing} {...args} />
        </View>
      </NamespaceContext.Provider>
    );
  }) as unknown as JSX.Element;
}
