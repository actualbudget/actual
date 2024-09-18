import React from 'react';

import { useSyncedPref } from '../../hooks/useSyncedPref';
import { Button } from '../common/Button2';
import { Link } from '../common/Link';
import { Text } from '../common/Text';

import { Setting } from './UI';

export function BudgetTypeSettings() {
  const [budgetType = 'rollover', setBudgetType] = useSyncedPref('budgetType');

  function onSwitchType() {
    const newBudgetType = budgetType === 'rollover' ? 'report' : 'rollover';
    setBudgetType(newBudgetType);
  }

  return (
    <Setting
      primaryAction={
        <Button onPress={onSwitchType}>
          Switch to {budgetType === 'report' ? 'envelope' : 'tracking'}{' '}
          budgeting
        </Button>
      }
    >
      <Text>
        <strong>Envelope budgeting</strong> (recommended) digitally mimics
        physical envelope budgeting system by allocating funds into virtual
        envelopes for different expenses. It helps track spending and ensure you
        don‘t overspend in any category.{' '}
        <Link
          variant="external"
          to="https://actualbudget.org/docs/getting-started/envelope-budgeting"
          linkColor="purple"
        >
          Learn more…
        </Link>
      </Text>
      <Text>
        With <strong>tracking budgeting</strong>, category balances reset each
        month, and funds are managed using a “Saved” metric instead of “To Be
        Budgeted.” Income is forecasted to plan future spending, rather than
        relying on current available funds.{' '}
        <Link
          variant="external"
          to="https://actualbudget.org/docs/experimental/report-budget"
          linkColor="purple"
        >
          Learn more…
        </Link>
      </Text>
    </Setting>
  );
}
