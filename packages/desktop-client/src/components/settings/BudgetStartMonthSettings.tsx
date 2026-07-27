import React, { useState } from 'react';
import { Trans } from 'react-i18next';

import { ButtonWithLoading } from '@actual-app/components/button';
import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';

import { MonthInput } from '#components/util/MonthInput';
import { useSyncedPref } from '#hooks/useSyncedPref';

import { Setting } from './UI';

export function BudgetStartMonthSettings() {
  const [budgetType = 'envelope'] = useSyncedPref('budgetType');
  const [budgetStartMonth, setBudgetStartMonth] =
    useSyncedPref('budgetStartMonth');
  const [selectedMonth, setSelectedMonth] = useState(budgetStartMonth || '');
  const [isLoading, setIsLoading] = useState(false);

  if (budgetType !== 'envelope') {
    return null;
  }

  async function onSave() {
    setIsLoading(true);
    try {
      setBudgetStartMonth(selectedMonth);
      await send('rebuild-budget-spreadsheet');
    } finally {
      setIsLoading(false);
    }
  }

  async function onClear() {
    setIsLoading(true);
    try {
      setSelectedMonth('');
      setBudgetStartMonth('');
      await send('rebuild-budget-spreadsheet');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Setting
      primaryAction={
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
          <MonthInput
            id="settings-budget-start-month"
            value={selectedMonth}
            onChange={setSelectedMonth}
          />
          <ButtonWithLoading
            onPress={onSave}
            isLoading={isLoading}
            isDisabled={!selectedMonth}
          >
            <Trans>Save</Trans>
          </ButtonWithLoading>
          {budgetStartMonth && (
            <ButtonWithLoading
              onPress={onClear}
              isLoading={isLoading}
              isDisabled={isLoading}
            >
              <Trans>Clear</Trans>
            </ButtonWithLoading>
          )}
        </View>
      }
    >
      <Text>
        <Trans>
          Start envelope budgeting from a month while keeping your complete
          transaction history. Earlier transactions remain available for reports
          and reconciliation, but their income, overspending, and category
          carryover do not affect this month or later months.
        </Trans>
      </Text>
    </Setting>
  );
}
