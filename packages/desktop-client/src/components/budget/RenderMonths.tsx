// @ts-strict-ignore
import React, {
  useContext,
  type CSSProperties,
  type ComponentType,
  type JSX,
} from 'react';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import * as monthUtils from 'loot-core/shared/months';

import { MonthsContext } from './MonthsContext';

import { SheetNameProvider } from '@desktop-client/hooks/useSheetName';

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
      <SheetNameProvider key={index} name={monthUtils.sheetForMonth(month)}>
        <View
          style={{
            flex: 1,
            borderLeft: '1px solid ' + theme.tableBorder,
            ...style,
          }}
        >
          <Component month={month} editing={editing} {...args} />
        </View>
      </SheetNameProvider>
    );
  }) as unknown as JSX.Element;
}
