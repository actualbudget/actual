import React, { useEffect, useReducer, useState } from 'react';
import { useSelector } from 'react-redux';

import { sendCatch } from 'loot-core/src/platform/client/fetch';
import * as monthUtils from 'loot-core/src/shared/months';
import { getRecurringDescription } from 'loot-core/src/shared/schedules';

import AddIcon from '../../icons/v0/Add';
import SubtractIcon from '../../icons/v0/Subtract';
import { theme } from '../../style';
import Button from '../common/Button';
import Input from '../common/Input';
import Select from '../common/Select';
import Stack from '../common/Stack';
import Text from '../common/Text';
import View from '../common/View';
import { Checkbox } from '../forms';
import { useTooltip, Tooltip } from '../tooltips';

import DateSelect from './DateSelect';

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
  return (
    config || {
      start: monthUtils.currentDay(),
      interval: 1,
      frequency: 'monthly',
      patterns: [createMonthlyRecurrence(monthUtils.currentDay())],
      skipWeekend: false,
      weekendSolveMode: 'before',
    }
  );
}

function unparseConfig(parsed) {
  return {
    ...parsed,
    interval: validInterval(parsed.interval),
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
  const dateFormat = useSelector(state =>
    (state.prefs.local.dateFormat || 'MM/dd/yyyy')
      .replace('MM', 'M')
      .replace('dd', 'd'),
  );

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
  let updateRecurrence = (recurrence, field, value) =>
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
              ['-', '---'],
              ...DAY_OF_MONTH_OPTIONS.map(opt => [opt, opt]),
            ]}
            value={recurrence.value}
            onChange={value =>
              updateRecurrence(recurrence, 'value', parsePatternValue(value))
            }
            disabledKeys={['-']}
            wrapperStyle={{ flex: 1, marginRight: 10 }}
            style={{ minHeight: '1px', width: '100%' }}
          />
          <Select
            options={[
              ['day', 'Day'],
              ['-', '---'],
              ...DAY_OF_WEEK_OPTIONS.map(opt => [opt.id, opt.name]),
            ]}
            value={recurrence.type}
            onChange={value => updateRecurrence(recurrence, 'type', value)}
            disabledKeys={['-']}
            wrapperStyle={{ flex: 1, marginRight: 10 }}
            style={{ minHeight: '1px', width: '100%' }}
          />
          <Button
            type="bare"
            style={{ padding: 7 }}
            onClick={() =>
              dispatch({
                type: 'remove-recurrence',
                recurrence: recurrence,
              })
            }
          >
            <SubtractIcon style={{ width: 8, height: 8 }} />
          </Button>
          <Button
            type="bare"
            style={{ padding: 7, marginLeft: 5 }}
            onClick={() => dispatch({ type: 'add-recurrence' })}
          >
            <AddIcon style={{ width: 10, height: 10 }} />
          </Button>
        </View>
      ))}
    </Stack>
  );
}

function RecurringScheduleTooltip({ config: currentConfig, onClose, onSave }) {
  let [previewDates, setPreviewDates] = useState(null);

  let [state, dispatch] = useReducer(reducer, {
    config: parseConfig(currentConfig),
  });

  let skipWeekend = state.config.hasOwnProperty('skipWeekend')
    ? state.config.skipWeekend
    : false;
  let dateFormat = useSelector(
    state => state.prefs.local.dateFormat || 'MM/dd/yyyy',
  );

  useEffect(() => {
    dispatch({
      type: 'replace-config',
      config: parseConfig(currentConfig),
    });
  }, [currentConfig]);

  let { config } = state;

  let updateField = (field, value) =>
    dispatch({ type: 'change-field', field, value });

  useEffect(() => {
    async function run() {
      let { data, error } = await sendCatch('schedule/get-upcoming-dates', {
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
    <Tooltip
      style={{ padding: 10, width: 380 }}
      offset={1}
      position="bottom-left"
      onClose={onClose}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <label htmlFor="start" style={{ marginRight: 5 }}>
          Starts:
        </label>
        <DateSelect
          id="start"
          inputProps={{ placeholder: 'Start Date' }}
          value={config.start}
          onSelect={value => updateField('start', value)}
          containerProps={{ style: { width: 100 } }}
          dateFormat={dateFormat}
        />
      </div>
      <Stack
        direction="row"
        align="center"
        justify="flex-start"
        style={{ marginTop: 10 }}
        spacing={2}
      >
        <Text style={{ whiteSpace: 'nowrap' }}>Repeat every</Text>
        <Input
          id="interval"
          style={{ width: 40 }}
          type="text"
          onBlur={e => updateField('interval', e.target.value)}
          onEnter={e => updateField('interval', e.target.value)}
          defaultValue={config.interval || 1}
        />
        <Select
          bare
          options={FREQUENCY_OPTIONS.map(opt => [opt.id, opt.name])}
          value={config.frequency}
          onChange={value => updateField('frequency', value)}
          style={{ border: '1px solid ' + theme.formInputBorder, height: 27.5 }}
        />
        {config.frequency === 'monthly' &&
        (config.patterns == null || config.patterns.length === 0) ? (
          <Button
            style={{
              backgroundColor: theme.tableBackground,
              ':hover': { backgroundColor: theme.tableBackground },
            }}
            onClick={() => dispatch({ type: 'add-recurrence' })}
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
            style={{ userSelect: 'none', marginRight: 5 }}
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
            onChange={value =>
              dispatch({ type: 'set-weekend-solve', value: value })
            }
            style={{
              minHeight: '1px',
              width: '5rem',
            }}
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
        <Button onClick={onClose}>Cancel</Button>
        <Button
          type="primary"
          onClick={() => onSave(unparseConfig(config))}
          style={{ marginLeft: 10 }}
        >
          Apply
        </Button>
      </div>
    </Tooltip>
  );
}

export default function RecurringSchedulePicker({
  value,
  buttonStyle,
  onChange,
}) {
  let { isOpen, close, getOpenEvents } = useTooltip();

  function onSave(config) {
    onChange(config);
    close();
  }

  return (
    <View>
      <Button
        {...getOpenEvents()}
        style={{ textAlign: 'left', ...buttonStyle }}
      >
        {value ? getRecurringDescription(value) : 'No recurring date'}
      </Button>
      {isOpen && (
        <RecurringScheduleTooltip
          config={value}
          onClose={close}
          onSave={onSave}
        />
      )}
    </View>
  );
}
