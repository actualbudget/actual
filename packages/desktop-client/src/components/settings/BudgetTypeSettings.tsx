import React, { useState } from 'react';
import { Trans } from 'react-i18next';

import { ButtonWithLoading } from '@actual-app/components/button';
import { Text } from '@actual-app/components/text';

import { send } from 'loot-core/platform/client/fetch';

import { Setting } from './UI';

import { Link } from '@desktop-client/components/common/Link';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';

export function BudgetTypeSettings() {
  const [budgetType = 'envelope', setBudgetType] = useSyncedPref('budgetType');
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
          you don‘t overspend in any category.
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
          With <strong>tracking budgeting</strong>, category balances reset each
          month, and funds are managed using a “Saved” metric instead of “To Be
          Budgeted.” Income is forecasted to plan future spending, rather than
          relying on current available funds.
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
  );
}
