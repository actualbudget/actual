import React, { useContext } from 'react';
import type { CSSProperties, ReactNode } from 'react';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';

import { SheetNameProvider } from '#hooks/useSheetName';

import { MonthsContext } from './MonthsContext';

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
