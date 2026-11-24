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
    <SettingsRow
      title={t('Budget type')}
      description={
        <>
          <Text style={{ display: 'block' }}>
            <Trans>
              <span>Envelope budgeting</span> (recommended) digitally mimics
              physical envelope budgeting system by allocating funds into
              virtual envelopes for different expenses. It helps track spending
              and ensure you don't overspend in any category.
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
              With <span>tracking budgeting</span>, category balances reset each
              month, and funds are managed using a "Saved" metric instead of "To
              Be Budgeted." Income is forecasted to plan future spending, rather
              than relying on current available funds.
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
  );
}
