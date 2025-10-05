import { useMemo } from 'react';

import { type PayPeriodConfig } from 'loot-core/shared/pay-periods';

import { useSyncedPref } from './useSyncedPref';

export function usePayPeriodConfig(): PayPeriodConfig {
  const [showPayPeriods] = useSyncedPref('showPayPeriods');
  const [payPeriodFrequency] = useSyncedPref('payPeriodFrequency');
  const [payPeriodStartDate] = useSyncedPref('payPeriodStartDate');

  return useMemo(
    () => ({
      enabled: showPayPeriods === 'true',
      payFrequency:
        (payPeriodFrequency as PayPeriodConfig['payFrequency']) || 'monthly',
      startDate: payPeriodStartDate || new Date().toISOString().slice(0, 10),
    }),
    [showPayPeriods, payPeriodFrequency, payPeriodStartDate],
  );
}
