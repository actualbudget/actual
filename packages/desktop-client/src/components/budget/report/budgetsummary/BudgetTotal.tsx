// @ts-strict-ignore
import React, {
  type CSSProperties,
  type ComponentType,
  type ReactNode,
} from 'react';

import { theme, styles } from '../../../../style';
import { Text } from '../../../common/Text';
import { View } from '../../../common/View';
import { type SheetFields, type Binding } from '../../../spreadsheet';
import { CellValue } from '../../../spreadsheet/CellValue';

type BudgetTotalProps<
  CurrentField extends SheetFields<'report-budget'>,
  TargetField extends SheetFields<'report-budget'>,
> = {
  title: ReactNode;
  current: Binding<'report-budget', CurrentField>;
  target: Binding<'report-budget', TargetField>;
  ProgressComponent: ComponentType<{ current; target }>;
  style?: CSSProperties;
};
export function BudgetTotal<
  CurrentField extends SheetFields<'report-budget'>,
  TargetField extends SheetFields<'report-budget'>,
>({
  title,
  current,
  target,
  ProgressComponent,
  style,
}: BudgetTotalProps<CurrentField, TargetField>) {
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

      <View style={{ marginLeft: 10 }}>
        <View>
          <Text style={{ color: theme.pageTextLight }}>{title}</Text>
        </View>

        <Text>
          <CellValue binding={current} type="financial" />
          <Text style={{ color: theme.pageTextSubdued, fontStyle: 'italic' }}>
            {' of '}
            <CellValue
              binding={target}
              type="financial"
              style={styles.notFixed}
            />
          </Text>
        </Text>
      </View>
    </View>
  );
}
