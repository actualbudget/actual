import { useTranslation, Trans } from 'react-i18next';

import { InitialFocus } from '@actual-app/components/initial-focus';
import { Select } from '@actual-app/components/select';
import { Stack } from '@actual-app/components/stack';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';

import type {
  CategoryGroupEntity,
  ScheduleEntity,
} from 'loot-core/types/models';

import { type Action, setType } from './actions';
import { displayTemplateTypes, type ReducerState } from './constants';
import { HistoricalAutomation } from './editor/HistoricalAutomation';
import { PercentageAutomation } from './editor/PercentageAutomation';
import { ScheduleAutomation } from './editor/ScheduleAutomation';
import { SimpleAutomation } from './editor/SimpleAutomation';
import { WeekAutomation } from './editor/WeekAutomation';

import { FormField, FormLabel } from '@desktop-client/components/forms';

type BudgetAutomationEditorProps = {
  inline: boolean;
  state: ReducerState;
  dispatch: (action: Action) => void;
  schedules: readonly ScheduleEntity[];
  categories: CategoryGroupEntity[];
};

const displayTypeToDescription = {
  simple: <Trans>Add a fixed amount to this category each month.</Trans>,
  week: (
    <Trans>
      Add a fixed amount to this category for each week in the month. For
      example, $100 per week would be $400 per month in a 4-week month.
    </Trans>
  ),
  schedule: (
    <Trans>
      Add enough to this category to cover the selected schedule. If the
      schedule occurs multiple times in a month, an amount will be added for
      each occurrence. You can choose to save up for the next occurrence over
      time (e.g. save $100 each month for a $300 quarterly bill) or cover each
      occurrence when it occurs (e.g. only add the $300 when the bill is due).
    </Trans>
  ),
  percentage: (
    <Trans>
      Add a fixed percentage of your income to this category each month. You can
      choose to take the percentage from the current month or the previous
      month.
    </Trans>
  ),
  historical: (
    <Trans>
      Add an amount to this category each month based on the values from
      previous months. For example, you can copy the amount from a year ago to
      budget for an annual expense, or budget the average of the last 3 months
      to account for seasonal changes.
    </Trans>
  ),
};

export function BudgetAutomationEditor({
  inline,
  state,
  dispatch,
  schedules,
  categories,
}: BudgetAutomationEditorProps) {
  const { t } = useTranslation();

  let automationEditor;
  switch (state.displayType) {
    case 'simple':
      automationEditor = (
        <SimpleAutomation template={state.template} dispatch={dispatch} />
      );
      break;
    case 'week':
      automationEditor = (
        <WeekAutomation template={state.template} dispatch={dispatch} />
      );
      break;
    case 'schedule':
      automationEditor = (
        <ScheduleAutomation
          schedules={schedules}
          template={state.template}
          dispatch={dispatch}
        />
      );
      break;
    case 'percentage':
      automationEditor = (
        <PercentageAutomation
          dispatch={dispatch}
          template={state.template}
          categories={categories}
        />
      );
      break;
    case 'historical':
      automationEditor = (
        <HistoricalAutomation template={state.template} dispatch={dispatch} />
      );
      break;
    default:
      automationEditor = (
        <Text>
          <Trans>Unrecognized automation type.</Trans>
        </Text>
      );
  }

  return (
    <Stack
      direction="column"
      spacing={2}
      style={{
        flex: 1,
        ...styles.editorPill,
        backgroundColor: theme.pillBackgroundLight,
        ...(inline ? { borderRadius: 0 } : {}),
        padding: 30,
        minHeight: 'fit-content',
      }}
    >
      <Stack direction="row" align="flex-start" spacing={4}>
        <FormField style={{ flexShrink: 0 }}>
          <FormLabel title={t('Type')} htmlFor="type-field" />
          <InitialFocus>
            <Select
              id="type-field"
              options={displayTemplateTypes}
              defaultLabel={t('Select an option')}
              value={state.displayType}
              onChange={type => type && dispatch(setType(type))}
              style={{ width: 172 }}
            />
          </InitialFocus>
        </FormField>
        <FormField style={{ flex: 1 }}>
          <FormLabel title={t('Description')} />
          <Text>
            {displayTypeToDescription[state.displayType] ?? (
              <Trans>No description available</Trans>
            )}
          </Text>
        </FormField>
      </Stack>
      {automationEditor}
    </Stack>
  );
}
