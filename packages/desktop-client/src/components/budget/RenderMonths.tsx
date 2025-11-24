import React, { type ReactNode, useContext, type CSSProperties } from 'react';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import * as monthUtils from 'loot-core/shared/months';

import { MonthsContext } from './MonthsContext';

import { SheetNameProvider } from '@desktop-client/hooks/useSheetName';

type RenderMonthsProps = {
  children: ReactNode | (({ month }: { month: string }) => ReactNode);
  style?: CSSProperties;
};

export function RenderMonths({ children, style }: RenderMonthsProps) {
  const { months } = useContext(MonthsContext);

  return months.map((month, index) => (
    <SheetNameProvider key={index} name={monthUtils.sheetForMonth(month)}>
      <View
        style={{
          flex: 1,
          borderLeft: '1px solid ' + theme.tableBorder,
          ...style,
        }}
      >
        {typeof children === 'function' ? children({ month }) : children}
      </View>
    </SheetNameProvider>
  ));
}
