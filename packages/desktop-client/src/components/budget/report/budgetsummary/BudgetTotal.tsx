// @ts-strict-ignore
import React, {
  type CSSProperties,
  type ComponentProps,
  type ComponentType,
  type ReactNode,
} from 'react';

import { theme, styles } from '../../../../style';
import { Text } from '../../../common/Text';
import { View } from '../../../common/View';
import { CellValue } from '../../../spreadsheet/CellValue';

type BudgetTotalProps = {
  title: ReactNode;
  current: ComponentProps<typeof CellValue>['binding'];
  target: ComponentProps<typeof CellValue>['binding'];
  ProgressComponent: ComponentType<{ current; target }>;
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
