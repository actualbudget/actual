import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { CSSProperties, Dispatch } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { SvgAdd, SvgSubtract } from '@actual-app/components/icons/v0';
import { InitialFocus } from '@actual-app/components/initial-focus';
import { Input } from '@actual-app/components/input';
import { Menu } from '@actual-app/components/menu';
import { Popover } from '@actual-app/components/popover';
import { Select } from '@actual-app/components/select';
import { SpaceBetween } from '@actual-app/components/space-between';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { sendCatch } from 'loot-core/platform/client/connection';
import * as monthUtils from 'loot-core/shared/months';
import { getRecurringDescription } from 'loot-core/shared/schedules';
import type { RecurConfig, RecurPattern } from 'loot-core/types/models';
import type { TransObjectLiteral, WithRequired } from 'loot-core/types/util';

import { DateSelect } from './DateSelect';

import { Modal } from '@desktop-client/components/common/Modal';
import { Checkbox } from '@desktop-client/components/forms';
import { useDateFormat } from '@desktop-client/hooks/useDateFormat';
import { useLocale } from '@desktop-client/hooks/useLocale';

// ex: There is no 6th Friday of the Month
const MAX_DAY_OF_WEEK_INTERVAL = 5;

function useFrequencyOptions() {
  const { t } = useTranslation();

  const FREQUENCY_OPTIONS = [
    { id: 'daily', name: t('Days') },
    { id: 'weekly', name: t('Weeks') },
    { id: 'monthly', name: t('Months') },
    { id: 'yearly', name: t('Years') },
  ] as const;

  return { FREQUENCY_OPTIONS };
}

const DAY_OF_MONTH_OPTIONS = [...Array(31).keys()].map(day => day + 1);

function useDayOfWeekOptions() {
  const { t } = useTranslation();

  const DAY_OF_WEEK_OPTIONS = [
    { id: 'SU', name: t('Sunday') },
    { id: 'MO', name: t('Monday') },
    { id: 'TU', name: t('Tuesday') },
    { id: 'WE', name: t('Wednesday') },
    { id: 'TH', name: t('Thursday') },
    { id: 'FR', name: t('Friday') },
    { id: 'SA', name: t('Saturday') },
  ] as const;

  return { DAY_OF_WEEK_OPTIONS };
}

function parsePatternValue(value: string | number) {
  if (value === 'last') {
    return -1;
  }
  return Number(value);
}

function parseConfig(config: Partial<RecurConfig>): StateConfig {
  return {
    start: monthUtils.currentDay(),
    interval: 1,
    frequency: 'monthly',
    patterns: [createMonthlyRecurrence(monthUtils.currentDay())],
    skipWeekend: false,
    weekendSolveMode: 'before',
    endMode: 'never',
    endOccurrences: 1,
    endDate: monthUtils.currentDay(),
    ...config,
  };
}

function unparseConfig(parsed: StateConfig): RecurConfig {
  return {
    ...parsed,
    interval: validInterval(parsed.interval),
    endOccurrences: validInterval(parsed.endOccurrences),
  };
}

function createMonthlyRecurrence(startDate: string) {
  return {
    value: parseInt(monthUtils.format(startDate, 'd')),
    type: 'day' as const,
  };
}

function boundedRecurrence({
  field,
  value,
  recurrence,
}: {
  recurrence: RecurPattern;
} & (
  | { field: 'type'; value: RecurPattern['type'] }
  | { field: 'value'; value: RecurPattern['value'] }
)) {
  if (
    (field === 'value' &&
      recurrence.type !== 'day' &&
      value > MAX_DAY_OF_WEEK_INTERVAL) ||
    (field === 'type' &&
      value !== 'day' &&
      recurrence.value > MAX_DAY_OF_WEEK_INTERVAL)
  ) {
    return { [field]: value, value: MAX_DAY_OF_WEEK_INTERVAL };
  }
  return { [field]: value };
}

type StateConfig = Omit<
  WithRequired<RecurConfig, 'patterns' | 'endDate' | 'weekendSolveMode'>,
  'interval' | 'endOccurrences'
> & {
  interval: number | string;
  endOccurrences: number | string;
};

type ReducerState = {
  config: StateConfig;
};

type UpdateRecurrenceAction =
  | {
      type: 'update-recurrence';
      recurrence: RecurPattern;
      field: 'type';
      value: RecurPattern['type'];
    }
  | {
      type: 'update-recurrence';
      recurrence: RecurPattern;
      field: 'value';
      value: RecurPattern['value'];
    };

type ChangeFieldAction<T extends keyof StateConfig> = {
  type: 'change-field';
  field: T;
  value: StateConfig[T];
};

type ReducerAction =
  | { type: 'replace-config'; config: StateConfig }
  | ChangeFieldAction<keyof StateConfig>
  | UpdateRecurrenceAction
  | { type: 'add-recurrence' }
  | { type: 'remove-recurrence'; recurrence: RecurPattern }
  | { type: 'set-skip-weekend'; skipWeekend: boolean }
  | { type: 'set-weekend-solve'; value: StateConfig['weekendSolveMode'] };

function reducer(state: ReducerState, action: ReducerAction): ReducerState {
  switch (action.type) {
    case 'replace-config':
      return { ...state, config: action.config };
    case 'change-field':
      return {
        ...state,
        config: {
          ...state.config,
          [action.field]: action.value,
          patterns:
            state.config.frequency !== 'monthly' ? [] : state.config.patterns,
        },
      };
    case 'update-recurrence':
      return {
        ...state,
        config: {
          ...state.config,
          patterns: state.config.patterns.map(p =>
            p === action.recurrence
              ? { ...action.recurrence, ...boundedRecurrence(action) }
              : p,
          ),
        },
      };
    case 'add-recurrence':
      return {
        ...state,
        config: {
          ...state.config,
          patterns: [
            ...(state.config.patterns || []),
            createMonthlyRecurrence(state.config.start),
          ],
        },
      };
    case 'remove-recurrence':
      return {
        ...state,
        config: {
          ...state.config,
          patterns: state.config.patterns.filter(p => p !== action.recurrence),
        },
      };
    case 'set-skip-weekend':
      return {
        ...state,
        config: {
          ...state.config,
          skipWeekend: action.skipWeekend,
        },
      };
    case 'set-weekend-solve':
      return {
        ...state,
        config: {
          ...state.config,
          weekendSolveMode: action.value,
        },
      };
    default:
      return state;
  }
}

function SchedulePreview({
  previewDates,
}: {
  previewDates: string[] | string;
}) {
  const locale = useLocale();
  const dateFormat = (useDateFormat() || 'MM/dd/yyyy')
    .replace('MM', 'M')
    .replace('dd', 'd');

  if (!previewDates) {
    return null;
  }

  let content = null;
  if (typeof previewDates === 'string') {
    content = <Text>{previewDates}</Text>;
  } else {
    content = (
      <View style={{ width: '100%' }}>
        <Text style={{ fontWeight: 600 }}>
          <Trans>Upcoming dates</Trans>
        </Text>
        <SpaceBetween gap={20} style={{ marginTop: 10 }}>
          {previewDates.map((d, idx) => (
            <View key={idx} style={{ flex: 1 }}>
              <Text>{monthUtils.format(d, dateFormat, locale)}</Text>
              <Text>{monthUtils.format(d, 'EEEE', locale)}</Text>
            </View>
          ))}
        </SpaceBetween>
      </View>
    );
  }

  return (
    <SpaceBetween
      direction="vertical"
      gap={5}
      style={{
        marginTop: 15,
        color: theme.tableText,
        alignItems: 'flex-start',
      }}
    >
      {content}
    </SpaceBetween>
  );
}

function validInterval(interval: string | number) {
  const intInterval = Number(interval);
  return Number.isInteger(intInterval) && intInterval > 0 ? intInterval : 1;
}

function MonthlyPatterns({
  config,
  dispatch,
}: {
  config: StateConfig;
  dispatch: Dispatch<ReducerAction>;
}) {
  const { t } = useTranslation();
  const { DAY_OF_WEEK_OPTIONS } = useDayOfWeekOptions();

  return (
    <SpaceBetween direction="vertical" gap={10} style={{ marginTop: 10 }}>
      {config.patterns.map((recurrence, idx) => (
        <View
          key={idx}
          style={{
            display: 'flex',
            flexDirection: 'row',
            width: '100%',
          }}
        >
          <Select
            options={[
              [-1, t('Last')],
              Menu.line,
              ...DAY_OF_MONTH_OPTIONS.map(opt => [opt, String(opt)] as const),
            ]}
            value={recurrence.value}
            onChange={value =>
              dispatch({
                type: 'update-recurrence',
                recurrence,
                field: 'value',
                value: parsePatternValue(value),
              })
            }
            style={{ flex: 1, marginRight: 10 }}
          />
          <Select
            options={[
              ['day', t('Day')],
              Menu.line,
              ...DAY_OF_WEEK_OPTIONS.map(opt => [opt.id, opt.name] as const),
            ]}
            value={recurrence.type}
            onChange={value => {
              dispatch({
                type: 'update-recurrence',
                recurrence,
                field: 'type',
                value,
              });
            }}
            style={{ flex: 1, marginRight: 10 }}
          />
          <Button
            variant="bare"
            aria-label={t('Remove recurrence')}
            style={{ padding: 7 }}
            onPress={() =>
              dispatch({
                type: 'remove-recurrence',
                recurrence,
              })
            }
          >
            <SvgSubtract style={{ width: 8, height: 8 }} />
          </Button>
          <Button
            variant="bare"
            aria-label={t('Add recurrence')}
            style={{ padding: 7, marginLeft: 5 }}
            onPress={() => dispatch({ type: 'add-recurrence' })}
          >
            <SvgAdd style={{ width: 10, height: 10 }} />
          </Button>
        </View>
      ))}
    </SpaceBetween>
  );
}

function RecurringScheduleTooltip({
  config: currentConfig,
  onClose,
  onSave,
}: {
  config: RecurConfig;
  onClose: () => void;
  onSave: (config: RecurConfig) => void;
}) {
  const { t } = useTranslation();
  const [previewDates, setPreviewDates] = useState<string[] | string | null>(
    null,
  );

  const { FREQUENCY_OPTIONS } = useFrequencyOptions();

  const [state, dispatch] = useReducer(reducer, {
    config: parseConfig(currentConfig),
  });

  const skipWeekend = state.config.hasOwnProperty('skipWeekend')
    ? state.config.skipWeekend
    : false;
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';

  useEffect(() => {
    dispatch({
      type: 'replace-config',
      config: parseConfig(currentConfig),
    });
  }, [currentConfig]);

  const { config } = state;

  const updateField = <Field extends keyof RecurConfig>(
    field: Field,
    value: StateConfig[Field],
  ) => dispatch({ type: 'change-field', field, value });

  useEffect(() => {
    async function run() {
      const { data, error } = await sendCatch('schedule/get-upcoming-dates', {
        config: unparseConfig(config),
        count: 4,
      });
      setPreviewDates(error ? t('Invalid rule') : data);
    }
    run();
  }, [config, t]);

  if (previewDates == null) {
    return null;
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <label htmlFor="start">
          <Trans>From</Trans>
        </label>
        <InitialFocus>
          <DateSelect
            id="start"
            inputProps={{ placeholder: t('Start Date') }}
            value={config.start}
            onSelect={value => updateField('start', value)}
            containerProps={{ style: { width: 100 } }}
            dateFormat={dateFormat}
          />
        </InitialFocus>
        <Select
          id="repeat_end_dropdown"
          options={[
            ['never', t('indefinitely')],
            ['after_n_occurrences', t('for')],
            ['on_date', t('until')],
          ]}
          value={config.endMode}
          onChange={value => updateField('endMode', value)}
        />
        {config.endMode === 'after_n_occurrences' && (
          <>
            <Input
              id="end_occurrences"
              style={{ width: 40 }}
              type="number"
              min={1}
              onChangeValue={value => updateField('endOccurrences', value)}
              defaultValue={config.endOccurrences || 1}
            />
            {config.endOccurrences === '1' ? (
              <Trans>occurrence</Trans>
            ) : (
              <Trans>occurrences</Trans>
            )}
          </>
        )}
        {config.endMode === 'on_date' && (
          <DateSelect
            id="end_date"
            inputProps={{ placeholder: t('End Date') }}
            value={config.endDate}
            onSelect={value => updateField('endDate', value)}
            containerProps={{ style: { width: 100 } }}
            dateFormat={dateFormat}
          />
        )}
      </div>
      <SpaceBetween style={{ marginTop: 10 }} gap={5}>
        <Text style={{ whiteSpace: 'nowrap' }}>
          <Trans>Repeat every</Trans>
        </Text>
        <Input
          id="interval"
          style={{
            minWidth: '7ch',
            width: `${String(config.interval || 1).length + 4}ch`,
            maxWidth: '12ch',
          }}
          type="number"
          min={1}
          onChangeValue={value => updateField('interval', value)}
          defaultValue={config.interval || 1}
        />
        <Select
          options={FREQUENCY_OPTIONS.map(opt => [opt.id, opt.name])}
          value={config.frequency}
          onChange={value => updateField('frequency', value)}
        />
        {config.frequency === 'monthly' &&
        (config.patterns == null || config.patterns.length === 0) ? (
          <Button
            style={{
              backgroundColor: theme.tableBackground,
            }}
            onPress={() => dispatch({ type: 'add-recurrence' })}
          >
            <Trans>Add specific days</Trans>
          </Button>
        ) : null}
      </SpaceBetween>
      {config.frequency === 'monthly' &&
        config.patterns &&
        config.patterns.length > 0 && (
          <MonthlyPatterns config={config} dispatch={dispatch} />
        )}
      <SpaceBetween
        direction="vertical"
        style={{ marginTop: 5, alignItems: 'flex-start' }}
      >
        <View
          style={{
            marginTop: 5,
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            userSelect: 'none',
          }}
        >
          <Checkbox
            id="form_skipwe"
            checked={skipWeekend}
            onChange={e => {
              dispatch({
                type: 'set-skip-weekend',
                skipWeekend: e.target.checked,
              });
            }}
          />
          <Trans>
            <label
              htmlFor="form_skipwe"
              style={{
                userSelect: 'none',
                marginRight: 5,
              }}
            >
              Move schedule{' '}
            </label>
            <Select
              id="solve_dropdown"
              options={[
                ['before', t('before')],
                ['after', t('after')],
              ]}
              value={state.config.weekendSolveMode}
              onChange={value => dispatch({ type: 'set-weekend-solve', value })}
              disabled={!skipWeekend}
            />
            <label
              htmlFor="solve_dropdown"
              style={{ userSelect: 'none', marginLeft: 5 }}
            >
              {' '}
              {{ beforeOrAfter: '' } as TransObjectLiteral} weekend
            </label>
          </Trans>
        </View>
      </SpaceBetween>
      <SchedulePreview previewDates={previewDates} />
      <div
        style={{ display: 'flex', marginTop: 15, justifyContent: 'flex-end' }}
      >
        <Button onPress={onClose}>
          <Trans>Cancel</Trans>
        </Button>
        <Button
          variant="primary"
          onPress={() => onSave(unparseConfig(config))}
          style={{ marginLeft: 10 }}
        >
          <Trans>Apply</Trans>
        </Button>
      </div>
    </>
  );
}

type RecurringSchedulePickerProps = {
  value: RecurConfig;
  buttonStyle?: CSSProperties;
  onChange: (config: RecurConfig) => void;
};

export function RecurringSchedulePicker({
  value,
  buttonStyle,
  onChange,
}: RecurringSchedulePickerProps) {
  const { t } = useTranslation();
  const { isNarrowWidth } = useResponsive();
  const triggerRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';
  const locale = useLocale();

  function onSave(config: RecurConfig) {
    onChange(config);
    setIsOpen(false);
  }

  const recurringDescription = useMemo(
    () => getRecurringDescription(value, dateFormat, locale),
    [locale, value, dateFormat],
  );

  const tooltip = (
    <RecurringScheduleTooltip
      config={value}
      onClose={() => setIsOpen(false)}
      onSave={onSave}
    />
  );

  return (
    <View>
      <Button
        ref={triggerRef}
        style={{ textAlign: 'left', ...buttonStyle }}
        onPress={() => setIsOpen(true)}
      >
        {value ? recurringDescription : t('No recurring date')}
      </Button>

      {isNarrowWidth ? (
        <Modal
          name="recurring-schedule-picker"
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
        >
          {tooltip}
        </Modal>
      ) : (
        <Popover
          triggerRef={triggerRef}
          style={{
            padding: 10,
            minWidth: 380,
            width: 'auto',
            maxWidth: '100%',
          }}
          placement="bottom start"
          isOpen={isOpen}
          onOpenChange={() => setIsOpen(false)}
        >
          {tooltip}
        </Popover>
      )}
    </View>
  );
}
