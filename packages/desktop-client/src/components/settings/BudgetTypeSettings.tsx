import React, { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { ButtonWithLoading } from '@actual-app/components/button';
import { Text } from '@actual-app/components/text';
import { spacing } from '@actual-app/components/tokens';
import { send } from '@actual-app/core/platform/client/connection';

import { Link } from '#components/common/Link';
import { useSyncedPref } from '#hooks/useSyncedPref';

import { SettingsRow } from './SettingsRow';

export function BudgetTypeSettings() {
  const { t } = useTranslation();
  const [budgetType = 'envelope', setBudgetType] = useSyncedPref('budgetType');
  const [toBudgetMode = 'monthly', setToBudgetMode] =
    useSyncedPref('toBudgetMode');
  const [isLoading, setIsLoading] = useState(false);

  async function onSwitchType() {
    setIsLoading(true);
    try {
      const newBudgetType = budgetType === 'envelope' ? 'tracking' : 'envelope';
      setBudgetType(newBudgetType);

      // Reset the budget cache to ensure the server-side budget system is recalculated
      await send('reset-budget-cache');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <SettingsRow
        title={t('Budget type')}
        description={
          <>
            <Text style={{ display: 'block' }}>
              <Trans>
                <span>Envelope budgeting</span> (recommended) digitally mimics
                physical envelope budgeting system by allocating funds into
                virtual envelopes for different expenses. It helps track
                spending and ensure you don't overspend in any category.
              </Trans>{' '}
              <Link
                variant="external"
                to="https://actualbudget.org/docs/getting-started/envelope-budgeting"
                linkColor="purple"
              >
                <Trans>Learn more</Trans>
              </Link>
            </Text>
            <Text style={{ display: 'block', marginTop: spacing.xs }}>
              <Trans>
                With <span>tracking budgeting</span>, category balances reset
                each month, and funds are managed using a "Saved" metric instead
                of "To Be Budgeted." Income is forecasted to plan future
                spending, rather than relying on current available funds.
              </Trans>{' '}
              <Link
                variant="external"
                to="https://actualbudget.org/docs/getting-started/tracking-budget"
                linkColor="purple"
              >
                <Trans>Learn more</Trans>
              </Link>
            </Text>
          </>
        }
        control={
          <ButtonWithLoading onPress={onSwitchType} isLoading={isLoading}>
            {budgetType === 'tracking' ? (
              <Trans>Switch to envelope budgeting</Trans>
            ) : (
              <Trans>Switch to tracking budgeting</Trans>
            )}
          </ButtonWithLoading>
        }
      />

      {budgetType === 'envelope' && (
        <SettingsRow
          title={t('To Budget calculation')}
          description={
            <>
              <Text style={{ display: 'block' }}>
                <Trans>
                  <span>Monthly To Budget</span> (default) uses Actual's
                  standard month-by-month calculation. Assigning money in a
                  later month does not change the To Budget amount shown in
                  earlier months.
                </Trans>
              </Text>
              <Text style={{ display: 'block', marginTop: spacing.xs }}>
                <Trans>
                  <span>Include future assignments</span> subtracts money
                  assigned in later months from To Budget in the current and
                  future months. This provides one shared available amount
                  across those months and helps prevent assigning the same money
                  more than once. Historical months, category balances, and
                  monthly rollover calculations are unchanged.
                </Trans>
              </Text>
            </>
          }
          control={
            <ButtonWithLoading
              onPress={() =>
                setToBudgetMode(
                  toBudgetMode === 'include-future'
                    ? 'monthly'
                    : 'include-future',
                )
              }
            >
              {toBudgetMode === 'include-future' ? (
                <Trans>Use default monthly calculation</Trans>
              ) : (
                <Trans>Include future assignments</Trans>
              )}
            </ButtonWithLoading>
          }
        />
      )}
    </>
  );
}
