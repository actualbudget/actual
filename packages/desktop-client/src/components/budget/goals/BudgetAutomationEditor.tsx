import { useTranslation, Trans } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { InitialFocus } from '@actual-app/components/initial-focus';
import { Stack } from '@actual-app/components/stack';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';

import type {
  CategoryEntity,
  CategoryGroupEntity,
  ScheduleEntity,
} from 'loot-core/types/models';

import { SvgDelete } from '../../../icons/v0';
import { CategoryAutocomplete } from '../../autocomplete/CategoryAutocomplete';
import { Link } from '../../common/Link';
import { Select } from '../../common/Select';
import { FormField, FormLabel } from '../../forms';
import { AmountInput } from '../../util/AmountInput';
import { GenericInput } from '../../util/GenericInput';
import { PercentInput } from '../../util/PercentInput';

import { type Action, setType, updateTemplate } from './actions';
import { displayTemplateTypes, type ReducerState } from './constants';

type BudgetAutomationEditorProps = {
  inline: boolean;
  state: ReducerState;
  dispatch: (action: Action) => void;
  schedules: readonly ScheduleEntity[];
  categories: CategoryGroupEntity[];
  onClose: () => void;
};

export function BudgetAutomationEditor({
  inline,
  state,
  dispatch,
  schedules,
  categories,
  onClose,
}: BudgetAutomationEditorProps) {
  const { t } = useTranslation();

  return (
    <Stack
      direction="row"
      align="center"
      justify="center"
      spacing={10}
      style={{
        ...styles.editorPill,
        ...(inline ? { borderRadius: 0 } : {}),
        padding: 30,
        minHeight: 'fit-content',
      }}
    >
      <Stack direction="column" spacing={2} style={{ flex: 1 }}>
        <Stack direction="row" align="flex-start" spacing={4}>
          <FormField style={{ flexShrink: 0 }}>
            <FormLabel title={t('Type')} htmlFor="type-field" />
            <InitialFocus>
              <Select
                id="type-field"
                options={displayTemplateTypes}
                defaultLabel="Select an option"
                value={state.displayType}
                onChange={type => type && dispatch(setType(type))}
                style={{ width: 172 }}
              />
            </InitialFocus>
          </FormField>
          <FormField style={{ flex: 1 }}>
            <FormLabel title={t('Description')} />
            <Text>
              {state.displayType === 'simple' && (
                <Trans>Add a fixed amount to this category each month.</Trans>
              )}
              {state.displayType === 'week' && (
                <Trans>
                  Add a fixed amount to this category for each week in the
                  month. For example, $100 per week would be $400 per month in a
                  4-week month.
                </Trans>
              )}
              {state.displayType === 'schedule' && (
                <Trans>
                  Add enough to this category to cover the selected schedule. If
                  the schedule occurs multiple times in a month, an amount will
                  be added for each occurrence. You can choose to save up for
                  the next occurrence over time (e.g. save $100 each month for a
                  $300 quarterly bill) or cover each occurrence when it occurs
                  (e.g. only add the $300 when the bill is due).
                </Trans>
              )}
              {state.displayType === 'percentage' && (
                <Trans>
                  Add a fixed percentage of your income to this category each
                  month. You can choose to take the percentage from the current
                  month or the previous month.
                </Trans>
              )}
              {state.displayType === 'historical' && (
                <Trans>
                  Add an amount to this category each month based on the values
                  from previous months. For example, you can copy the amount
                  from a year ago to budget for an annual expense, or budget the
                  average of the last 3 months to account for seasonal changes.
                </Trans>
              )}
            </Text>
          </FormField>
        </Stack>
        {state.template.type === 'simple' && (
          <FormField>
            <FormLabel title={t('Amount')} htmlFor="amount-field" />
            <AmountInput
              key="amount-input"
              value={state.template.monthly ?? 0}
              zeroSign="+"
              onUpdate={(value: number) =>
                dispatch(updateTemplate({ type: 'simple', monthly: value }))
              }
            />
          </FormField>
        )}
        {state.template.type === 'week' && (
          <FormField style={{ flex: 1 }}>
            <FormLabel title={t('Amount')} htmlFor="amount-field" />
            <AmountInput
              key="amount-input"
              value={state.template.amount ?? 0}
              zeroSign="+"
              onUpdate={(value: number) =>
                dispatch(updateTemplate({ type: 'week', amount: value }))
              }
            />
          </FormField>
        )}
        {state.template.type === 'schedule' &&
          (schedules.length ? (
            <Stack
              direction="row"
              align="center"
              spacing={10}
              style={{ marginTop: 10 }}
            >
              <FormField style={{ flex: 1 }}>
                <FormLabel title={t('Schedule')} htmlFor="schedule-field" />
                <Select
                  id="schedule-field"
                  key="schedule-picker"
                  defaultLabel="Select a schedule"
                  value={state.template.name}
                  onChange={schedule =>
                    dispatch(
                      updateTemplate({
                        type: 'schedule',
                        name: schedule,
                      }),
                    )
                  }
                  options={schedules.flatMap(schedule =>
                    schedule.name ? [[schedule.name, schedule.name]] : [],
                  )}
                />
              </FormField>
              <FormField style={{ flex: 1 }}>
                <FormLabel
                  title={t('Savings mode')}
                  htmlFor="schedule-full-field"
                />
                <Select
                  id="schedule-full-field"
                  key="schedule-full"
                  options={[
                    ['false', t('Save up for the next occurrence')],
                    ['true', t('Cover each occurrence when it occurs')],
                  ]}
                  value={String(!!state.template.full)}
                  onChange={full =>
                    dispatch(
                      updateTemplate({
                        type: 'schedule',
                        full: full === 'true',
                      }),
                    )
                  }
                />
              </FormField>
            </Stack>
          ) : (
            <Text style={{ marginTop: 10 }}>
              <Trans>
                No schedules found, create one in the{' '}
                <Link variant="internal" to="/schedules">
                  schedules
                </Link>{' '}
                page.
              </Trans>
            </Text>
          ))}
        {state.template.type === 'percentage' && (
          <>
            <Stack
              direction="row"
              align="center"
              spacing={10}
              style={{ marginTop: 10 }}
            >
              <FormField style={{ flex: 1 }}>
                <FormLabel title={t('Category')} htmlFor="category-field" />
                <CategoryAutocomplete
                  inputProps={{ id: 'category-field' }}
                  onSelect={(category: CategoryEntity['id']) =>
                    dispatch(updateTemplate({ type: 'percentage', category }))
                  }
                  value={state.template.category}
                  categoryGroups={
                    state.template.previous
                      ? categories.map(group => ({
                          ...group,
                          categories: group.categories?.filter(
                            category => category.id !== 'to-budget',
                          ),
                        }))
                      : categories
                  }
                />
              </FormField>
              <FormField style={{ flex: 1 }}>
                <FormLabel title={t('Percentage')} htmlFor="percent-field" />
                <PercentInput
                  id="percent-field"
                  key="percent-input"
                  value={state.template.percent}
                  onUpdatePercent={(percent: number) =>
                    dispatch(
                      updateTemplate({
                        type: 'percentage',
                        percent,
                      }),
                    )
                  }
                />
              </FormField>
            </Stack>
            <Stack
              direction="row"
              align="center"
              spacing={10}
              style={{ marginTop: 10 }}
            >
              <FormField style={{ flex: 1 }}>
                <FormLabel
                  title={t('Percentage of')}
                  htmlFor="previous-field"
                />
                <Select
                  id="previous-field"
                  key="previous-month"
                  options={[
                    [false, t('This month')],
                    [true, t('Last month')],
                  ]}
                  value={state.template.previous}
                  onChange={previous => {
                    if (state.template.type !== 'percentage') {
                      return;
                    }
                    return dispatch(
                      updateTemplate({
                        type: 'percentage',
                        previous,
                        ...(previous && state.template.category === 'to-budget'
                          ? { category: '' }
                          : {}),
                      }),
                    );
                  }}
                />
              </FormField>
              <View style={{ flex: 1 }} />
            </Stack>
          </>
        )}
        {state.displayType === 'historical' && (
          <Stack
            direction="row"
            align="center"
            spacing={10}
            style={{ marginTop: 10 }}
          >
            <FormField style={{ flex: 1 }}>
              <FormLabel title={t('Mode')} htmlFor="mode-field" />
              <Select
                id="mode-field"
                key="mode-picker"
                options={[
                  ['copy', t('Copy a previous month')],
                  ['average', t('Average of previous months')],
                ]}
                value={state.template.type}
                onChange={type => dispatch(updateTemplate({ type }))}
              />
            </FormField>
            <FormField style={{ flex: 1 }}>
              <FormLabel
                title={t('Number of months back')}
                htmlFor="look-back-field"
              />
              {/* @ts-expect-error should be auto-patched once GenericInput is converted to TS */}
              <GenericInput
                key="look-back-input"
                type="number"
                value={
                  state.template.type === 'average'
                    ? state.template.numMonths
                    : state.template.lookBack
                }
                onChange={(value: number) =>
                  dispatch(updateTemplate({ numMonths: value }))
                }
              />
            </FormField>
          </Stack>
        )}
      </Stack>
      <Button
        variant="bare"
        onPress={onClose}
        style={{ padding: 7 }}
        aria-label={t('Close automation editor')}
      >
        <SvgDelete style={{ width: 10, height: 10, color: 'inherit' }} />
      </Button>
    </Stack>
  );
}
