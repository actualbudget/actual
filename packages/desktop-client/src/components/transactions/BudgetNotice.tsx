import { Trans, useTranslation } from 'react-i18next';

import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';

import { BudgetCurrencyFormat } from '#hooks/currencyFormatContext';
import type { EditEffectsState } from '#hooks/useEditEffects';
import { useFormat } from '#hooks/useFormat';
import { useLocale } from '#hooks/useLocale';

/**
 * Names each budgeted month a dialog save changes, with each category's
 * base change. Informational: Save stays the confirmation.
 */
export function BudgetNotice({ effects }: { effects: EditEffectsState }) {
  return (
    <BudgetCurrencyFormat>
      <BudgetNoticeInner effects={effects} />
    </BudgetCurrencyFormat>
  );
}

function BudgetNoticeInner({ effects }: { effects: EditEffectsState }) {
  const { t } = useTranslation();
  const format = useFormat();
  const locale = useLocale();
  if (effects.status === 'error') {
    return (
      <Text style={{ color: theme.warningText }}>
        <Trans>Budget effects could not be checked.</Trans>
      </Text>
    );
  }
  if (effects.status !== 'ready' || effects.months.length === 0) return null;
  return (
    <View data-testid="budget-notice" style={{ gap: 4 }}>
      {effects.months.map(({ month, effects: changes }) => (
        <Text key={month} style={{ color: theme.warningText }}>
          {t('This changes the budget for {{month}}: {{changes}}.', {
            month: monthUtils.format(month, 'MMMM yyyy', locale),
            changes: changes
              .map(change => {
                const amount = format(change.amount, 'financial');
                return change.kind === 'uncategorized'
                  ? t('uncategorized {{amount}}', { amount })
                  : change.kind === 'income'
                    ? t('{{category}} income {{amount}}', {
                        category: change.name,
                        amount,
                      })
                    : t('{{category}} spending {{amount}}', {
                        category: change.name,
                        amount,
                      });
              })
              .join(', '),
          })}
        </Text>
      ))}
    </View>
  );
}
