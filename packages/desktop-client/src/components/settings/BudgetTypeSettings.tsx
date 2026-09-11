import React, { useState } from 'react';
import { Trans } from 'react-i18next';

import { ButtonWithLoading } from '@actual-app/components/button';
import { Text } from '@actual-app/components/text';
import { send } from '@actual-app/core/platform/client/connection';

import { Link } from '#components/common/Link';
import { useSyncedPref } from '#hooks/useSyncedPref';

import { Setting } from './UI';

export function BudgetTypeSettings() {
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
      <Setting
        primaryAction={
          <ButtonWithLoading onPress={onSwitchType} isLoading={isLoading}>
            {budgetType === 'tracking' ? (
              <Trans>Switch to envelope budgeting</Trans>
            ) : (
              <Trans>Switch to tracking budgeting</Trans>
            )}
          </ButtonWithLoading>
        }
      >
        <Text>
          <Trans>
            <strong>Envelope budgeting</strong> (recommended) digitally mimics
            physical envelope budgeting system by allocating funds into virtual
            envelopes for different expenses. It helps track spending and ensure
            you don't overspend in any category.
          </Trans>{' '}
          <Link
            variant="external"
            to="https://actualbudget.org/docs/getting-started/envelope-budgeting"
            linkColor="purple"
          >
            <Trans>Learn more</Trans>
          </Link>
        </Text>
        <Text>
          <Trans>
            With <strong>tracking budgeting</strong>, category balances reset
            each month, and funds are managed using a "Saved" metric instead of
            "To Be Budgeted." Income is forecasted to plan future spending,
            rather than relying on current available funds.
          </Trans>{' '}
          <Link
            variant="external"
            to="https://actualbudget.org/docs/getting-started/tracking-budget"
            linkColor="purple"
          >
            <Trans>Learn more</Trans>
          </Link>
        </Text>
      </Setting>

      {budgetType === 'envelope' && (
        <Setting
          primaryAction={
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
        >
          <Text>
            <Trans>
              <strong>Monthly To Budget</strong> (default) uses Actual's
              standard month-by-month calculation. Assigning money in a later
              month does not change the To Budget amount shown in earlier
              months.
            </Trans>
          </Text>
          <Text>
            <Trans>
              <strong>Include future assignments</strong> subtracts money
              assigned in later months from To Budget in the current and future
              months. This provides one shared available amount across those
              months and helps prevent assigning the same money more than once.
              Historical months, category balances, and monthly rollover
              calculations are unchanged.
            </Trans>
          </Text>
        </Setting>
      )}
    </>
  );
}
