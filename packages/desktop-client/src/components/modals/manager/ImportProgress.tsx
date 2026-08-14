import { useEffect, useState } from 'react';
import { ProgressBar } from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { listen } from '@actual-app/core/platform/client/connection';
import type {
  ImportStep,
  ServerEvents,
} from '@actual-app/core/types/server-events';
import { css } from '@emotion/css';

/**
 * Shows which stage a budget import is on and how far along it is. Renders
 * nothing until the import reports its first step.
 */
export function ImportProgress() {
  const { t } = useTranslation();
  const [progress, setProgress] = useState<
    ServerEvents['import-progress'] | null
  >(null);

  useEffect(() => listen('import-progress', setProgress), []);

  if (!progress) {
    return null;
  }

  const { step, current, total, overallCurrent, overallTotal, batch } =
    progress;
  const percentage = overallTotal ? (overallCurrent / overallTotal) * 100 : 0;
  const stepProgress = total > 0 ? ` (${current}/${total})` : '';

  return (
    <View
      style={{
        alignItems: 'center',
        alignSelf: 'stretch',
        gap: 10,
        marginTop: 20,
      }}
    >
      <Text style={styles.tnum}>
        {getStepText(t, step, stepProgress, batch)}
      </Text>
      <ProgressBar
        value={percentage}
        aria-label={t('Import progress')}
        style={{ width: '100%' }}
      >
        <View
          className={css({
            height: 6,
            borderRadius: 3,
            backgroundColor: theme.pillBackground,
            overflow: 'hidden',
          })}
        >
          <View
            className={css({
              height: '100%',
              width: `${percentage}%`,
              backgroundColor: theme.pageTextPositive,
              transition: 'width 150ms ease-out',
            })}
          />
        </View>
      </ProgressBar>
    </View>
  );
}

function getStepText(
  t: ReturnType<typeof useTranslation>['t'],
  step: ImportStep,
  progress: string,
  batch?: { amount: number; account: string },
): string {
  switch (step) {
    case 'accounts':
      return t('Importing accounts{{progress}}...', { progress });
    case 'categories':
      return t('Importing categories{{progress}}...', { progress });
    case 'payees':
      return t('Importing payees{{progress}}...', { progress });
    case 'payee-locations':
      return t('Importing payee locations{{progress}}...', { progress });
    case 'tags':
      return t('Importing tags{{progress}}...', { progress });
    case 'transactions':
      // Transactions go in one batch per account, so the tick reports an
      // account that has already landed rather than one in flight.
      return batch
        ? t('Imported {{count}} transactions for {{account}}{{progress}}...', {
            count: batch.amount,
            account: batch.account,
            progress,
          })
        : t('Importing transactions{{progress}}...', { progress });
    case 'scheduled-transactions':
      return t('Importing scheduled transactions{{progress}}...', { progress });
    case 'budgets':
      // The count is months, not individual budgeted amounts.
      return t('Importing monthly budgets{{progress}}...', { progress });
    // The union is exhaustive above; `default` is here for the lint rule.
    case 'finishing':
    default:
      return t('Setting up...');
  }
}
