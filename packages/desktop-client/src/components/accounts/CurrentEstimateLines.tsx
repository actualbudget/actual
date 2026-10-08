import { useTranslation } from 'react-i18next';

import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type { AccountEntity } from '@actual-app/core/types/models';

import { PrivacyFilter } from '#components/PrivacyFilter';
import { BudgetCurrencyFormat } from '#hooks/currencyFormatContext';
import { useAccounts } from '#hooks/useAccounts';
import { useCurrentEstimates } from '#hooks/useCurrentEstimates';
import { useFormat } from '#hooks/useFormat';
import { useSyncedPref } from '#hooks/useSyncedPref';
import {
  convertedTotalText,
  estimateText,
  groupEstimateKey,
} from '#util/current-estimates';

type CurrentEstimateLinesProps = {
  account?: AccountEntity;
  /** The register's id: an account, 'onbudget', 'offbudget' or all. */
  accountId?: string;
};

/**
 * A foreign account's current-rate estimate and recorded base, or a group's
 * converted total, beneath the stored balance it never replaces.
 */
export function CurrentEstimateLines(props: CurrentEstimateLinesProps) {
  return (
    <BudgetCurrencyFormat>
      <Lines {...props} />
    </BudgetCurrencyFormat>
  );
}

/**
 * The estimate lines for an account or a group register. Call inside the
 * budget currency format so base amounts format in the budget currency.
 */
export function useCurrentEstimateLines({
  account,
  accountId,
}: CurrentEstimateLinesProps): string[] {
  const { t } = useTranslation();
  const estimates = useCurrentEstimates();
  const { data: accounts = [] } = useAccounts();
  const format = useFormat();
  const [baseCurrency = ''] = useSyncedPref('defaultCurrencyCode');
  const formatBase = (amount: number) => format(amount, 'financial');
  if (!estimates) return [];

  if (account) {
    const entry = account.currency
      ? estimates.accounts.find(a => a.id === account.id)
      : undefined;
    return entry
      ? [
          estimateText(t, entry.estimate, account, {
            formatBase,
            baseCurrency,
          }),
          t('Recorded base: {{amount}}', {
            amount: formatBase(entry.storedBaseAmount),
          }),
        ]
      : [];
  }
  const key = groupEstimateKey(accountId);
  if (!key) return [];
  const hasForeignBalance = estimates.accounts.some(
    entry =>
      entry.nativeBalance !== 0 &&
      inGroup(
        key,
        accounts.find(a => a.id === entry.id),
      ),
  );
  return hasForeignBalance
    ? [convertedTotalText(t, estimates.groups[key], accounts, { formatBase })]
    : [];
}

function Lines(props: CurrentEstimateLinesProps) {
  const lines = useCurrentEstimateLines(props);
  if (lines.length === 0) return null;

  return (
    <View data-testid="current-estimate" style={{ marginTop: 4, gap: 2 }}>
      {lines.map(line => (
        <Text key={line} style={{ color: theme.pageTextSubdued, fontSize: 13 }}>
          <PrivacyFilter>{line}</PrivacyFilter>
        </Text>
      ))}
    </View>
  );
}

function inGroup(
  key: 'all' | 'onBudget' | 'offBudget',
  account: Pick<AccountEntity, 'offbudget'> | undefined,
) {
  if (!account) return false;
  return key === 'all' || (key === 'offBudget') === !!account.offbudget;
}

/**
 * Estimate lines as a visually hidden description, for a focusable control
 * to reference with `aria-describedby`.
 */
export function EstimateDescription({
  id,
  lines,
}: {
  id: string;
  lines: string[];
}) {
  if (lines.length === 0) return null;
  return (
    <Text id={id} style={styles.visuallyHidden}>
      {lines.join('. ')}
    </Text>
  );
}
