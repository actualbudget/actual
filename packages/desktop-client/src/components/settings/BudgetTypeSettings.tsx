import React, { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { ButtonWithLoading } from '@actual-app/components/button';
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
        <Trans>
          <Link
            variant="external"
            to="https://actualbudget.org/docs/getting-started/envelope-budgeting"
            linkColor="purple"
          >
            Envelope budgeting
          </Link>{' '}
          (recommended) assigns the money you already have to categories, so you
          can't overspend without noticing.{' '}
          <Link
            variant="external"
            to="https://actualbudget.org/docs/getting-started/tracking-budget"
            linkColor="purple"
          >
            Tracking budgeting
          </Link>{' '}
          plans spending against forecast income, and category balances reset
          each month.
        </Trans>
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
