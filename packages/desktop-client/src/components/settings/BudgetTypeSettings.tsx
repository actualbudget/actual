import React, { useState } from 'react';
import { useDispatch } from 'react-redux';

import { loadPrefs } from 'loot-core/src/client/actions';
import { useSpreadsheet } from 'loot-core/src/client/SpreadsheetProvider';
import * as monthUtils from 'loot-core/src/shared/months';

import { useLocalPref } from '../../hooks/useLocalPref';
import { switchBudgetType } from '../budget/util';
import { ButtonWithLoading } from '../common/Button2';
import { Link } from '../common/Link';
import { Text } from '../common/Text';

import { Setting } from './UI';

export function BudgetTypeSettings() {
  const dispatch = useDispatch();
  const [budgetType = 'rollover'] = useLocalPref('budgetType');
  const [loading, setLoading] = useState(false);

  const currentMonth = monthUtils.currentMonth();
  const [startMonthPref] = useLocalPref('budget.startMonth');
  const startMonth = startMonthPref || currentMonth;
  const spreadsheet = useSpreadsheet();

  function onSwitchType() {
    setLoading(true);

    if (!loading) {
      const newBudgetType = budgetType === 'rollover' ? 'report' : 'rollover';

      switchBudgetType(
        newBudgetType,
        spreadsheet,
        {
          start: startMonth,
          end: startMonth,
        },
        startMonth,
        async () => {
          dispatch(loadPrefs());
          setLoading(false);
        },
      );
    }
  }

  return (
    <Setting
      primaryAction={
        <ButtonWithLoading isLoading={loading} onPress={onSwitchType}>
          Switch to {budgetType === 'report' ? 'envelope' : 'tracking'}{' '}
          budgeting
        </ButtonWithLoading>
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
