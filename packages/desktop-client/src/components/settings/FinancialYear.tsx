// @ts-strict-ignore
import React from 'react';
import { Trans } from 'react-i18next';

import { Text } from '@actual-app/components/text';

import { Setting } from './UI';

import { DateSelect } from '@desktop-client/components/select/DateSelect';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';

export function FinancialYearSettings() {
  const [financialYearStart, setFinancialYearStartPref] =
    useSyncedPref('financialYearStart');

  return (
    <Setting
      primaryAction={
        <DateSelect
          value={financialYearStart ?? `${new Date().getFullYear()}-01-01`}
          onSelect={date => setFinancialYearStartPref(date)}
          dateFormat="dd MMMM"
        />
      }
    >
      <Text>
        <Trans>
          <strong>Financial year start</strong> is the first day of the
          financial year.
        </Trans>
      </Text>
    </Setting>
  );
}
