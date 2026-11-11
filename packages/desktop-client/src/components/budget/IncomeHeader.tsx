import React from 'react';
import { Trans } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgAdd } from '@actual-app/components/icons/v1';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { useGlobalPref } from '#hooks/useGlobalPref';

import { RenderMonths } from './RenderMonths';

import { useBudgetComponents } from '.';

type IncomeHeaderProps = {
  onShowNewGroup: () => void;
};

/**
 * Separates the expense groups from the income section: offers a button to
 * add another expense group and repeats the column labels for income.
 */
export function IncomeHeader({ onShowNewGroup }: IncomeHeaderProps) {
  const [categoryExpandedStatePref] = useGlobalPref('categoryExpandedState');
  const categoryExpandedState = categoryExpandedStatePref ?? 0;
  const { IncomeHeaderComponent: MonthComponent } = useBudgetComponents();
  return (
    <View
      style={{
        flexDirection: 'row',
        flex: 1,
        backgroundColor: theme.tableRowHeaderBackground,
        borderTop: `1px solid ${theme.tableBorder}`,
      }}
    >
      <View
        style={{
          width: 200 + 100 * categoryExpandedState,
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
        }}
      >
        <Button
          variant="bare"
          onPress={onShowNewGroup}
          style={{
            fontSize: 12,
            fontWeight: 500,
            margin: '10px 8px',
            color: theme.pageTextLight,
            gap: 4,
          }}
        >
          <SvgAdd width={9} height={9} />
          <Trans>Add group</Trans>
        </Button>
      </View>
      <RenderMonths style={{ border: 0, justifyContent: 'flex-end' }}>
        <MonthComponent />
      </RenderMonths>
    </View>
  );
}
