import type { FeatureFlag } from '@actual-app/core/types/prefs';

import { useSyncedPref } from './useSyncedPref';

const DEFAULT_FEATURE_FLAG_STATE: Record<FeatureFlag, boolean> = {
  goalTemplatesEnabled: false,
  goalTemplatesUIEnabled: false,
  actionTemplating: false,
  formulaMode: false,
  currency: false,
  ageOfMoneyReport: false,
  balanceForecastReport: false,
  customThemes: false,
  budgetAnalysisReport: false,
  enableBanking: false,
  sankeyReport: false,
  akahuBankSync: false,
  mobileCalculator: false,
  // Enabled by default: drives the transaction table from the TanStack Table
  // column model. The Experimental settings toggle is an opt-out escape hatch.
  transactionTableV2: true,
};

export function useFeatureFlag(name: FeatureFlag): boolean {
  const [value] = useSyncedPref(`flags.${name}`);

  return value === undefined
    ? DEFAULT_FEATURE_FLAG_STATE[name] || false
    : String(value) === 'true';
}
