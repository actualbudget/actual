// @ts-strict-ignore
import React from 'react';
import type { ComponentType, CSSProperties, ReactNode } from 'react';
import { Trans } from 'react-i18next';

import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { CellValue, CellValueText } from '#components/spreadsheet/CellValue';
import type { Binding, SheetFields } from '#spreadsheet';

type BudgetTotalProps = {
  title: ReactNode;
  current: Binding<'tracking-budget', SheetFields<'tracking-budget'>> | number;
  target: Binding<'tracking-budget', SheetFields<'tracking-budget'>> | number;
  ProgressComponent: ComponentType<{
    current:
      | Binding<'tracking-budget', SheetFields<'tracking-budget'>>
      | number;
    target: Binding<'tracking-budget', SheetFields<'tracking-budget'>> | number;
  }>;
  style?: CSSProperties;
};
export function BudgetTotal({
  title,
  current,
  target,
  ProgressComponent,
  style,
}: BudgetTotalProps) {
  return (
    <View
      style={{
        lineHeight: 1.5,
        flexDirection: 'row',
        alignItems: 'center',
        fontSize: 14,
        ...style,
      }}
    >
      <ProgressComponent current={current} target={target} />

      <View style={{ marginLeft: 10, ...styles.tnum }}>
        <View>
          <Text style={{ color: theme.pageTextLight }}>{title}</Text>
        </View>

        <Text>
          <Trans
            i18nKey="<allocatedAmount /> <italic>of <totalAmount /></italic>"
            components={{
              allocatedAmount:
                typeof current === 'number' ? (
                  <CellValueText
                    name="filtered"
                    value={current}
                    type="financial"
                  />
                ) : (
                  <CellValue binding={current} type="financial" />
                ),
              italic: (
                <Text
                  style={{ color: theme.pageTextLight, fontStyle: 'italic' }}
                />
              ),
              totalAmount:
                typeof target === 'number' ? (
                  <CellValueText
                    name="filtered"
                    value={target}
                    type="financial"
                  />
                ) : (
                  <CellValue binding={target} type="financial" />
                ),
            }}
          />
        </Text>
      </View>
    </View>
  );
}
