import React, { useEffect, useReducer, useRef, useState } from 'react';

import { sendCatch } from 'loot-core/src/platform/client/fetch';
import * as monthUtils from 'loot-core/src/shared/months';
import { getRecurringDescription } from 'loot-core/src/shared/schedules';

import { useDateFormat } from '../../hooks/useDateFormat';
import { SvgAdd, SvgSubtract } from '../../icons/v0';
import { theme } from '../../style';
import { Button } from '../common/Button2';
import { Input } from '../common/Input';
import { Menu } from '../common/Menu';
import { Popover } from '../common/Popover';
import { Select } from '../common/Select';
import { Stack } from '../common/Stack';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { Checkbox } from '../forms';

import { DateSelect } from './DateSelect';

// ex: There is no 6th Friday of the Month
const MAX_DAY_OF_WEEK_INTERVAL = 5;

const FREQUENCY_OPTIONS = [
  { id: 'daily', name: 'Days' },
  { id: 'weekly', name: 'Weeks' },
  { id: 'monthly', name: 'Months' },
  { id: 'yearly', name: 'Years' },
];

const DAY_OF_MONTH_OPTIONS = [...Array(31).keys()].map(day => day + 1);

const DAY_OF_WEEK_OPTIONS = [
  { id: 'SU', name: 'Sunday' },
  { id: 'MO', name: 'Monday' },
  { id: 'TU', name: 'Tuesday' },
  { id: 'WE', name: 'Wednesday' },
  { id: 'TH', name: 'Thursday' },
  { id: 'FR', name: 'Friday' },
  { id: 'SA', name: 'Saturday' },
];

function parsePatternValue(value) {
  if (value === 'last') {
    return -1;
  }
  return Number(value);
}

function parseConfig(config) {
  return {
    start: monthUtils.currentDay(),
    interval: 1,
    frequency: 'monthly',
    patterns: [createMonthlyRecurrence(monthUtils.currentDay())],
    skipWeekend: false,
    weekendSolveMode: 'before',
    endMode: 'never',
    endOccurrences: '1',
    endDate: monthUtils.currentDay(),
    ...config,
  };
}

function unparseConfig(parsed) {
  return {
    ...parsed,
    interval: validInterval(parsed.interval),
    endOccurrences: validInterval(parsed.endOccurrences),
  };
}

function createMonthlyRecurrence(startDate) {
  return {
    value: parseInt(monthUtils.format(startDate, 'd')),
    type: 'day',
  };
}

function boundedRecurrence({ field, value, recurrence }) {
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

function reducer(state, action) {
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

function SchedulePreview({ previewDates }) {
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
      <View>
        <Text style={{ fontWeight: 600 }}>Upcoming dates</Text>
        <Stack direction="row" spacing={4} style={{ marginTop: 10 }}>
          {previewDates.map((d, idx) => (
            <View key={idx}>
              <Text>{monthUtils.format(d, dateFormat)}</Text>
              <Text>{monthUtils.format(d, 'EEEE')}</Text>
            </View>
          ))}
        </Stack>
      </View>
    );
  }

  return (
    <Stack
      direction="column"
      spacing={1}
      style={{ marginTop: 15, color: theme.tableText }}
    >
      {content}
    </Stack>
  );
}

function validInterval(interval) {
  const intInterval = parseInt(interval);
  return Number.isInteger(intInterval) && intInterval > 0 ? intInterval : 1;
}

function MonthlyPatterns({ config, dispatch }) {
  const updateRecurrence = (recurrence, field, value) =>
    dispatch({ type: 'update-recurrence', recurrence, field, value });

  return (
    <Stack spacing={2} style={{ marginTop: 10 }}>
      {config.patterns.map((recurrence, idx) => (
        <View
          key={idx}
          style={{
            display: 'flex',
            flexDirection: 'row',
          }}
        >
          <Select
            options={[
              [-1, 'Last'],
              Menu.line,
              ...DAY_OF_MONTH_OPTIONS.map(opt => [opt, opt]),
            ]}
            value={recurrence.value}
            onChange={value =>
              updateRecurrence(recurrence, 'value', parsePatternValue(value))
            }
            disabledKeys={['-']}
            buttonStyle={{ flex: 1, marginRight: 10 }}
          />
          <Select
            options={[
              ['day', 'Day'],
              Menu.line,
              ...DAY_OF_WEEK_OPTIONS.map(opt => [opt.id, opt.name]),
            ]}
            value={recurrence.type}
            onChange={value => updateRecurrence(recurrence, 'type', value)}
            disabledKeys={['-']}
            buttonStyle={{ flex: 1, marginRight: 10 }}
          />
          <Button
            variant="bare"
            aria-label="Remove recurrence"
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
            aria-label="Add recurrence"
            style={{ padding: 7, marginLeft: 5 }}
            onPress={() => dispatch({ type: 'add-recurrence' })}
          >
            <SvgAdd style={{ width: 10, height: 10 }} />
          </Button>
        </View>
      ))}
    </Stack>
  );
}

function RecurringScheduleTooltip({ config: currentConfig, onClose, onSave }) {
  const [previewDates, setPreviewDates] = useState(null);

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

  const updateField = (field, value) =>
    dispatch({ type: 'change-field', field, value });

  useEffect(() => {
    async function run() {
      const { data, error } = await sendCatch('schedule/get-upcoming-dates', {
        config: unparseConfig(config),
        count: 4,
      });
      setPreviewDates(error ? 'Invalid rule' : data);
    }
    run();
  }, [config]);

  if (previewDates == null) {
    return null;
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <label htmlFor="start">From</label>
        <DateSelect
          id="start"
          inputProps={{ placeholder: 'Start Date' }}
          value={config.start}
          onSelect={value => updateField('start', value)}
          containerProps={{ style: { width: 100 } }}
          dateFormat={dateFormat}
        />
        <Select
          id="repeat_end_dropdown"
          options={[
            ['never', 'indefinitely'],
            ['after_n_occurrences', 'for'],
            ['on_date', 'until'],
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
              onChange={e => updateField('endOccurrences', e.target.value)}
              defaultValue={config.endOccurrences || 1}
            />
            <Text>occurrence{config.endOccurrences === '1' ? '' : 's'}</Text>
          </>
        )}
        {config.endMode === 'on_date' && (
          <DateSelect
            id="end_date"
            inputProps={{ placeholder: 'End Date' }}
            value={config.endDate}
            onSelect={value => updateField('endDate', value)}
            containerProps={{ style: { width: 100 } }}
            dateFormat={dateFormat}
          />
        )}
      </div>
      <Stack
        direction="row"
        align="center"
        justify="flex-start"
        style={{ marginTop: 10 }}
        spacing={1}
      >
        <Text style={{ whiteSpace: 'nowrap' }}>Repeat every</Text>
        <Input
          id="interval"
          style={{ width: 40 }}
          type="number"
          min={1}
          onChange={e => updateField('interval', e.target.value)}
          defaultValue={config.interval || 1}
        />
        <Select
          options={FREQUENCY_OPTIONS.map(opt => [opt.id, opt.name])}
          value={config.frequency}
          onChange={value => updateField('frequency', value)}
          buttonStyle={{ marginRight: 5 }}
        />
        {config.frequency === 'monthly' &&
        (config.patterns == null || config.patterns.length === 0) ? (
          <Button
            style={{
              backgroundColor: theme.tableBackground,
              ':hover': { backgroundColor: theme.tableBackground },
            }}
            onPress={() => dispatch({ type: 'add-recurrence' })}
          >
            Add specific days
          </Button>
        ) : null}
      </Stack>
      {config.frequency === 'monthly' &&
        config.patterns &&
        config.patterns.length > 0 && (
          <MonthlyPatterns config={config} dispatch={dispatch} />
        )}
      <Stack direction="column" style={{ marginTop: 5 }}>
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
              ['before', 'before'],
              ['after', 'after'],
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
            weekend
          </label>
        </View>
      </Stack>
      <SchedulePreview previewDates={previewDates} />
      <div
        style={{ display: 'flex', marginTop: 15, justifyContent: 'flex-end' }}
      >
        <Button onPress={onClose}>Cancel</Button>
        <Button
          variant="primary"
          onPress={() => onSave(unparseConfig(config))}
          style={{ marginLeft: 10 }}
        >
          Apply
        </Button>
      </div>
    </>
  );
}

export function RecurringSchedulePicker({ value, buttonStyle, onChange }) {
  const triggerRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';

  function onSave(config) {
    onChange(config);
    setIsOpen(false);
  }

  return (
    <View>
      <Button
        ref={triggerRef}
        style={{ textAlign: 'left', ...buttonStyle }}
        onPress={() => setIsOpen(true)}
      >
        {value
          ? getRecurringDescription(value, dateFormat)
          : 'No recurring date'}
      </Button>

      <Popover
        triggerRef={triggerRef}
        style={{ padding: 10, width: 380 }}
        placement="bottom start"
        isOpen={isOpen}
        onOpenChange={() => setIsOpen(false)}
      >
        <RecurringScheduleTooltip
          config={value}
          onClose={() => setIsOpen(false)}
          onSave={onSave}
        />
      </Popover>
    </View>
  );
}
