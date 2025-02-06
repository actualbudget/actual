import { useReducer } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { type Template } from 'loot-core/server/budget/types/templates';
import {
  type CategoryEntity,
  type CategoryGroupEntity,
  type ScheduleEntity,
} from 'loot-core/types/models';

import { SvgDelete } from '../../../icons/v0';
import { SvgPencil1 } from '../../../icons/v2';
import { type CSSProperties, styles } from '../../../style';
import { CategoryAutocomplete } from '../../autocomplete/CategoryAutocomplete';
import { Button } from '../../common/Button2';
import { InitialFocus } from '../../common/InitialFocus';
import { Select } from '../../common/Select';
import { Stack } from '../../common/Stack';
import { Text } from '../../common/Text';
import { View } from '../../common/View';
import { FormField, FormLabel } from '../../forms';
import { GenericInput } from '../../util/GenericInput';

import { setLimit, setType, updateTemplate } from './actions';
import { type DisplayTemplateType, displayTemplateTypes } from './constants';
import { templateReducer } from './reducer';

type EditTemplateProps = {
  categories: CategoryGroupEntity[];
  schedules: readonly ScheduleEntity[];
  template?: Template;
  onEdit: () => void;
  onDelete: () => void;
  style?: CSSProperties;
};

const DEFAULT_TEMPLATE: Template = {
  directive: '',
  type: 'simple',
  monthly: 0,
};

const getAmount = (template: Template) => {
  switch (template.type) {
    case 'week':
    case 'by':
    case 'spend':
    case 'goal':
      return template.amount;
    case 'simple':
      return template.monthly;
    default:
      return 0;
  }
};

export const EditTemplate = ({
  onDelete,
  onEdit,
  categories,
  schedules,
  style,
  template,
}: EditTemplateProps) => {
  const { t } = useTranslation();

  const [state, dispatch] = useReducer(templateReducer, {
    template: template ?? DEFAULT_TEMPLATE,
    displayType: null,
  });

  return (
    <Stack
      direction="row"
      align="center"
      justify="center"
      spacing={10}
      style={{
        ...style,
        ...styles.editorPill,
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
              {state.displayType === 'average' && (
                <Trans>
                  Add a variable amount to this category each month, based on
                  the average of the last N months. For example, you can budget
                  the average of the last 3 months to account for seasonal
                  changes.
                </Trans>
              )}
              {state.displayType === 'copy' && (
                <Trans>
                  Add a fixed amount to this category each month, based on the
                  value from a previous month. For example, you can copy the
                  amount from a year ago to budget for an annual expense.
                </Trans>
              )}
            </Text>
          </FormField>
        </Stack>
        {state.template.type === 'simple' && (
          <FormField>
            <FormLabel title={t('Amount')} htmlFor="amount-field" />
            <GenericInput
              key="percent-input"
              type="number"
              // @ts-expect-error invalid
              numberFormatType="currency"
              value={state.template.monthly}
              onChange={(value: number) =>
                dispatch(updateTemplate({ type: 'simple', monthly: value }))
              }
            />
          </FormField>
        )}
        {state.template.type === 'week' && (
          <FormField style={{ flex: 1 }}>
            <FormLabel title={t('Amount')} htmlFor="amount-field" />
            <GenericInput
              key="percent-input"
              type="number"
              // @ts-expect-error invalid
              numberFormatType="currency"
              value={state.template.amount}
              onChange={(value: number) =>
                dispatch(updateTemplate({ type: 'week', amount: value }))
              }
            />
          </FormField>
        )}
        {state.template.type === 'schedule' && (
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
                    updateTemplate({ type: 'schedule', full: full === 'true' }),
                  )
                }
              />
            </FormField>
          </Stack>
        )}
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
                <GenericInput
                  id="percent-field"
                  key="percent-input"
                  type="number"
                  // @ts-expect-error invalid
                  numberFormatType="percentage"
                  value={state.template.percent}
                  onChange={(value: number) =>
                    dispatch(
                      updateTemplate({ type: 'percentage', percent: value }),
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
                    console.log(state.template);
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
        {state.template.type === 'average' && (
          <FormField style={{ flex: 1 }}>
            <FormLabel
              title={t('Number of months back')}
              htmlFor="look-back-field"
            />
            <GenericInput
              key="look-back-input"
              type="number"
              value={state.template.numMonths}
              onChange={(value: number) =>
                dispatch(updateTemplate({ type: 'average', numMonths: value }))
              }
            />
          </FormField>
        )}
        {state.template.type === 'copy' && (
          <FormField style={{ flex: 1 }}>
            <FormLabel
              title={t('Number of months back')}
              htmlFor="look-back-field"
            />
            <GenericInput
              key="look-back-input"
              type="number"
              value={state.template.lookBack}
              onChange={(value: number) =>
                dispatch(updateTemplate({ type: 'copy', lookBack: value }))
              }
            />
          </FormField>
        )}
      </Stack>
      {template && (
        <Stack direction="row" align="center" spacing={1}>
          <Button
            variant="bare"
            onPress={onEdit}
            style={{ padding: 7 }}
            aria-label={t('Edit entry')}
          >
            <SvgPencil1 style={{ width: 10, height: 10, color: 'inherit' }} />
          </Button>
          <Button
            variant="bare"
            onPress={onDelete}
            style={{ padding: 7 }}
            aria-label={t('Delete entry')}
          >
            <SvgDelete style={{ width: 10, height: 10, color: 'inherit' }} />
          </Button>
        </Stack>
      )}
    </Stack>
  );
};
