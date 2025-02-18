import { type Dispatch, type SetStateAction } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Stack } from '@actual-app/components/stack';
import { type CSSProperties } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { integerToCurrency } from 'loot-core/shared/util';

import { SvgDelete } from '../../../icons/v0';
import { SvgPencil1 } from '../../../icons/v2';

import { type ReducerState } from './constants';

type BudgetAutomationReadOnlyProps = {
  state: ReducerState;
  categoryNameMap: Record<string, string>;
  setIsEditing: Dispatch<SetStateAction<boolean>>;
  onDelete?: () => void;
  style?: CSSProperties;
  inline?: boolean;
};

export function BudgetAutomationReadOnly({
  state,
  categoryNameMap,
  setIsEditing,
  onDelete,
  style,
  inline,
}: BudgetAutomationReadOnlyProps) {
  const { t } = useTranslation();

  return (
    <Stack direction="row" align="center" spacing={2} style={style}>
      {inline && (
        <View
          style={{
            borderLeft: `1px solid ${theme.tableBorder}`,
            height: 'calc(100% - 4px)',
          }}
        />
      )}
      <Text style={{ color: theme.tableText, fontSize: 13 }}>
        {state.displayType === 'simple' && (
          <Trans>
            Budget {{ monthly: integerToCurrency(state.template.monthly ?? 0) }}{' '}
            each month
          </Trans>
        )}
        {state.displayType === 'week' && (
          <Trans>
            Budget {{ amount: integerToCurrency(state.template.amount) }} each
            week
          </Trans>
        )}
        {state.displayType === 'schedule' &&
          (state.template.name ? (
            state.template.full ? (
              <Trans>
                Cover the occurrences of the schedule &lsquo;
                {{ name: state.template.name }}
                &rsquo; this month
              </Trans>
            ) : (
              <Trans>
                Save up for the schedule &lsquo;
                {{ name: state.template.name }}
                &rsquo;
              </Trans>
            )
          ) : (
            <Trans>Budget for a schedule</Trans>
          ))}
        {state.displayType === 'percentage' &&
          (state.template.category === 'total' ? (
            state.template.previous ? (
              <Trans>
                Budget {{ percent: state.template.percent }}% of total income
                last month
              </Trans>
            ) : (
              <Trans>
                Budget {{ percent: state.template.percent }}% of total income
                this month
              </Trans>
            )
          ) : state.template.category === 'to-budget' ? (
            state.template.previous ? (
              <Trans>
                Budget {{ percent: state.template.percent }}% of available funds
                to budget last month
              </Trans>
            ) : (
              <Trans>
                Budget {{ percent: state.template.percent }}% of available funds
                to budget this month
              </Trans>
            )
          ) : state.template.previous ? (
            <Trans>
              Budget {{ percent: state.template.percent }}% of &lsquo;
              {{
                category: categoryNameMap[state.template.category] ?? 'Unknown',
              }}
              &rsquo; last month
            </Trans>
          ) : (
            <Trans>
              Budget {{ percent: state.template.percent }}% of &lsquo;
              {{
                category: categoryNameMap[state.template.category] ?? 'Unknown',
              }}
              &rsquo; this month
            </Trans>
          ))}
        {state.displayType === 'historical' &&
          (state.template.type === 'copy' ? (
            <Trans>
              Budget the same amount as {{ amount: state.template.lookBack }}{' '}
              months ago
            </Trans>
          ) : (
            <Trans>
              Budget the average of the last{' '}
              {{ amount: state.template.numMonths }} months
            </Trans>
          ))}
      </Text>
      <View style={{ flex: 1 }} />
      <Button
        variant="bare"
        onPress={() => setIsEditing(prev => !prev)}
        style={{ padding: 5 }}
        aria-label={t('Edit template')}
      >
        <SvgPencil1 style={{ width: 8, height: 8, color: 'inherit' }} />
      </Button>
      <Button
        variant="bare"
        onPress={onDelete}
        style={{ padding: 5 }}
        aria-label={t('Delete template')}
      >
        <SvgDelete style={{ width: 8, height: 8, color: 'inherit' }} />
      </Button>
    </Stack>
  );
}
