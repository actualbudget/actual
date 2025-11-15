import React from 'react';
import { Trans } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { View } from '@actual-app/components/view';

import { RenderMonths } from './RenderMonths';

import { useBudgetComponents } from '.';

import { useGlobalPref } from '@desktop-client/hooks/useGlobalPref';

type IncomeHeaderProps = {
  onShowNewGroup: () => void;
};

export function IncomeHeader({ onShowNewGroup }: IncomeHeaderProps) {
  const [categoryExpandedStatePref] = useGlobalPref('categoryExpandedState');
  const categoryExpandedState = categoryExpandedStatePref ?? 0;
  const { IncomeHeaderComponent: MonthComponent } = useBudgetComponents();
  return (
    <View style={{ flexDirection: 'row', flex: 1 }}>
      <View
        style={{
          width: 200 + 100 * categoryExpandedState,
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
        }}
      >
        <Button onPress={onShowNewGroup} style={{ fontSize: 12, margin: 10 }}>
          <Trans>Add group</Trans>
        </Button>
      </View>
      <RenderMonths style={{ border: 0, justifyContent: 'flex-end' }}>
        <MonthComponent />
      </RenderMonths>
    </View>
  );
}
