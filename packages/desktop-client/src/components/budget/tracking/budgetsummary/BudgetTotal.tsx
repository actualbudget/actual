// @ts-strict-ignore
import React, {
  type CSSProperties,
  type ComponentType,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';

import { theme, styles } from '../../../../style';
import { Text } from '../../../common/Text';
import { View } from '../../../common/View';
import { type SheetFields, type Binding } from '../../../spreadsheet';
import { CellValue, CellValueText } from '../../../spreadsheet/CellValue';

type BudgetTotalProps<
  CurrentField extends SheetFields<'tracking-budget'>,
  TargetField extends SheetFields<'tracking-budget'>,
> = {
  title: ReactNode;
  current: Binding<'tracking-budget', CurrentField>;
  target: Binding<'tracking-budget', TargetField>;
  ProgressComponent: ComponentType<{ current; target }>;
  style?: CSSProperties;
};
export function BudgetTotal<
  CurrentField extends SheetFields<'tracking-budget'>,
  TargetField extends SheetFields<'tracking-budget'>,
>({
  title,
  current,
  target,
  ProgressComponent,
  style,
}: BudgetTotalProps<CurrentField, TargetField>) {
  const { t } = useTranslation();
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
            {' '}
            {t('of')}{' '}
            <CellValue binding={target} type="financial">
              {props => <CellValueText {...props} style={styles.notFixed} />}
            </CellValue>
          </Text>
        </Text>
      </View>
    </View>
  );
}
