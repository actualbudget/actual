import type { ComponentPropsWithoutRef, ReactNode } from 'react';

import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';

import { BalanceWithCarryover } from '#components/budget/BalanceWithCarryover';
import { CellValueText } from '#components/spreadsheet/CellValue';

import { MobileSheetCarryoverIndicator } from './MobileSheetCarryoverIndicator';

type MobileSheetBalanceHeaderProps = {
  label: ReactNode;
} & Pick<
  ComponentPropsWithoutRef<typeof BalanceWithCarryover>,
  'carryover' | 'balance' | 'goal' | 'budgeted' | 'longGoal'
>;

export function MobileSheetBalanceHeader({
  label,
  ...bindings
}: MobileSheetBalanceHeaderProps) {
  return (
    <View
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        padding: `${spacing.xs}px ${spacing.md}px ${spacing.md}px`,
      }}
    >
      <Text
        style={{
          ...styles.smallText,
          color: theme.pageTextLight,
          marginBottom: spacing.xxs,
        }}
      >
        {label}
      </Text>
      <BalanceWithCarryover
        isDisabled
        shouldInlineGoalStatus
        CarryoverIndicator={MobileSheetCarryoverIndicator}
        {...bindings}
      >
        {props => (
          <CellValueText
            {...props}
            style={{ textAlign: 'center', ...styles.veryLargeText }}
          />
        )}
      </BalanceWithCarryover>
    </View>
  );
}
