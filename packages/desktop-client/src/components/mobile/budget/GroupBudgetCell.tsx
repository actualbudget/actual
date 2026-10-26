import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import type { CategoryGroupEntity } from '@actual-app/core/types/models';
import { AutoTextSize } from 'auto-text-size';

import { makeAmountGrey } from '#components/budget/util';
import { PrivacyFilter } from '#components/PrivacyFilter';
import { CellValue } from '#components/spreadsheet/CellValue';
import { useFormat } from '#hooks/useFormat';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { useUndo } from '#hooks/useUndo';
import { pushModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';
import type { Binding } from '#spreadsheet';

import { PILL_STYLE } from './BudgetTable';

type GroupBudgetCellProps = {
  binding: Binding<'envelope-budget' | 'tracking-budget', 'group-budget'>;
  group: CategoryGroupEntity;
  month: string;
  columnWidth: string;
  onBudgetAction: (month: string, action: string, args: unknown) => void;
};

export function GroupBudgetCell({
  binding,
  group,
  month,
  columnWidth,
  onBudgetAction,
}: GroupBudgetCellProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const format = useFormat();
  const { showUndoNotification } = useUndo();
  const [budgetType = 'envelope'] = useSyncedPref('budgetType');

  const onOpenGroupBudgetMenu = () => {
    const sharedOptions = {
      groupId: group.id,
      month,
      onCopyLastMonthAverage: () => {
        onBudgetAction(month, 'copy-group-last', { group: group.id });
        showUndoNotification({
          message: t(
            "{{groupName}} budgets have been set to last month's budgeted amounts.",
            { groupName: group.name },
          ),
        });
      },
      onSetMonthsAverage: (numberOfMonths: number) => {
        if (
          numberOfMonths !== 3 &&
          numberOfMonths !== 6 &&
          numberOfMonths !== 12
        ) {
          return;
        }
        onBudgetAction(month, `set-group-${numberOfMonths}-avg`, {
          group: group.id,
        });
        showUndoNotification({
          message: t(
            '{{groupName}} budgets have been set to {{numberOfMonths}}-month average.',
            { groupName: group.name, numberOfMonths },
          ),
        });
      },
      onApplyBudgetTemplate: () => {
        onBudgetAction(month, 'apply-multiple-templates', {
          categories: (group.categories ?? [])
            .filter(c => !c.hidden)
            .map(c => c.id),
        });
        showUndoNotification({
          message: t('{{groupName}} budget templates have been applied.', {
            groupName: group.name,
          }),
        });
      },
    };

    if (budgetType === 'envelope') {
      dispatch(
        pushModal({
          modal: {
            name: 'envelope-group-budget-menu',
            options: sharedOptions,
          },
        }),
      );
    } else {
      dispatch(
        pushModal({
          modal: {
            name: 'tracking-group-budget-menu',
            options: {
              ...sharedOptions,
              onCopyUntilYearEnd: () => {
                onBudgetAction(month, 'copy-group-until-year-end', {
                  group: group.id,
                });
                showUndoNotification({
                  message: t('{{groupName}} budgets copied until year end.', {
                    groupName: group.name,
                  }),
                });
              },
            },
          },
        }),
      );
    }
  };

  return (
    <CellValue<'envelope-budget' | 'tracking-budget', 'group-budget'>
      binding={binding}
      type="financial"
    >
      {({ type, value }) => (
        <Button
          variant="bare"
          style={{
            ...PILL_STYLE,
            maxWidth: columnWidth,
            ...makeAmountGrey(value),
          }}
          onPress={onOpenGroupBudgetMenu}
          aria-label={t('Open budget menu for {{groupName}} group', {
            groupName: group.name,
          })}
        >
          <PrivacyFilter>
            <AutoTextSize
              key={value}
              as={Text}
              minFontSizePx={6}
              maxFontSizePx={12}
              mode="oneline"
              style={{
                ...styles.tnum,
                maxWidth: columnWidth,
                textAlign: 'right',
                fontSize: 12,
                fontWeight: '500',
              }}
            >
              {format(value, type)}
            </AutoTextSize>
          </PrivacyFilter>
        </Button>
      )}
    </CellValue>
  );
}
