import React, { useEffect, useReducer, useState } from 'react';
import { useSelector } from 'react-redux';

import { sendCatch } from 'loot-core/src/platform/client/fetch';
import * as monthUtils from 'loot-core/src/shared/months';
import { getRecurringDescription } from 'loot-core/src/shared/schedules';
import { useTooltip } from 'loot-design/src/components/tooltips';
import { colors } from 'loot-design/src/style';
import AddIcon from 'loot-design/src/svg/v0/Add';
import SubtractIcon from 'loot-design/src/svg/v0/Subtract';

import { Button, Select, Input, Tooltip, View, Text, Stack } from './common';
import DateSelect from './DateSelect';

// ex: There is no 6th Friday of the Month
const MAX_DAY_OF_WEEK_INTERVAL = 5;

const FREQUENCY_OPTIONS = [
  { id: 'weekly', name: 'Weeks' },
  { id: 'monthly', name: 'Months' },
  { id: 'yearly', name: 'Years' }
];

const DAY_OF_MONTH_OPTIONS = [...Array(31).keys()].map(day => day + 1);

const DAY_OF_WEEK_OPTIONS = [
  { id: 'SU', name: 'Sunday' },
  { id: 'MO', name: 'Monday' },
  { id: 'TU', name: 'Tuesday' },
  { id: 'WE', name: 'Wednesday' },
  { id: 'TH', name: 'Thursday' },
  { id: 'FR', name: 'Friday' },
  { id: 'SA', name: 'Saturday' }
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
      patterns: [createMonthlyRecurrence(monthUtils.currentDay())]
    }
  );
}

function unparseConfig(parsed) {
  return {
    ...parsed,
    interval: validInterval(parsed.interval)
  };
}

function createMonthlyRecurrence(startDate) {
  return {
    value: parseInt(monthUtils.format(startDate, 'd')),
    type: 'day'
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
            state.config.frequency !== 'monthly' ? [] : state.config.patterns
        }
      };
    case 'update-recurrence':
      return {
        ...state,
        config: {
          ...state.config,
          patterns: state.config.patterns.map(p =>
            p === action.recurrence
              ? { ...action.recurrence, ...boundedRecurrence(action) }
              : p
          )
        }
      };
    case 'add-recurrence':
      return {
        ...state,
        config: {
          ...state.config,
          patterns: [
            ...(state.config.patterns || []),
            createMonthlyRecurrence(state.config.start)
          ]
        }
      };
    case 'remove-recurrence':
      return {
        ...state,
        config: {
          ...state.config,
          patterns: state.config.patterns.filter(p => p !== action.recurrence)
        }
      };
    default:
      return state;
  }
}

function SchedulePreview({ previewDates }) {
  if (!previewDates) {
    return null;
  }

  let dateFormat = useSelector(
    state => state.prefs.local.dateFormat || 'MM/dd/yyyy'
  );
  dateFormat = dateFormat.replace('MM', 'M').replace('dd', 'd');

  let content = null;
  if (typeof previewDates === 'string') {
    content = <Text>{previewDates}</Text>;
  } else {
    content = (
      <View>
        <Text style={{ fontWeight: 600 }}>Upcoming dates</Text>
        <Stack direction="row" spacing={4} style={{ marginTop: 10 }}>
          {previewDates.map(d => (
            <View>
              <Text>{monthUtils.format(d, dateFormat)}</Text>
              <Text>{monthUtils.format(d, 'EEEE')}</Text>
            </View>
          ))}
        </Stack>
      </View>
    );
  }

  return (
    <>
      <Stack
        direction="column"
        spacing={1}
        style={{ marginTop: 15, color: colors.n4 }}
      >
        {content}
      </Stack>
    </>
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
            flexDirection: 'row'
          }}
        >
          <Select
            style={{ marginRight: 10 }}
            value={recurrence.value}
            onChange={e =>
              updateRecurrence(
                recurrence,
                'value',
                parsePatternValue(e.target.value)
              )
            }
          >
            <option value={-1}>Last</option>
            <option disabled>---</option>
            {DAY_OF_MONTH_OPTIONS.map(opt => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </Select>
          <Select
            style={{ marginRight: 10 }}
            value={recurrence.type}
            onChange={e => updateRecurrence(recurrence, 'type', e.target.value)}
          >
            <option value="day">Day</option>
            <option disabled>---</option>
            {DAY_OF_WEEK_OPTIONS.map(opt => (
              <option key={opt.id} value={opt.id}>
                {opt.name}
              </option>
            ))}
          </Select>
          <Button
            bare
            style={{ padding: 7 }}
            onClick={() =>
              dispatch({
                type: 'remove-recurrence',
                recurrence: recurrence
              })
            }
          >
            <SubtractIcon style={{ width: 8, height: 8 }} />
          </Button>
          <Button
            bare
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
    config: parseConfig(currentConfig)
  });

  let dateFormat = useSelector(
    state => state.prefs.local.dateFormat || 'MM/dd/yyyy'
  );

  useEffect(() => {
    dispatch({
      type: 'replace-config',
      config: parseConfig(currentConfig)
    });
  }, [currentConfig]);

  let { config } = state;

  let updateField = (field, value) =>
    dispatch({ type: 'change-field', field, value });

  useEffect(() => {
    async function run() {
      let { data, error } = await sendCatch('schedule/get-upcoming-dates', {
        config: unparseConfig(config),
        count: 4
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
        ></Input>
        <Select
          onChange={e => updateField('frequency', e.target.value)}
          value={config.frequency}
          style={{ flex: 0 }}
        >
          {FREQUENCY_OPTIONS.map(opt => (
            <option key={opt.id} value={opt.id}>
              {opt.name}
            </option>
          ))}
        </Select>
        {config.frequency === 'monthly' &&
        (config.patterns == null || config.patterns.length === 0) ? (
          <Button onClick={() => dispatch({ type: 'add-recurrence' })}>
            Add specific days
          </Button>
        ) : null}
      </Stack>
      {config.frequency === 'monthly' &&
        config.patterns &&
        config.patterns.length > 0 && (
          <MonthlyPatterns config={config} dispatch={dispatch} />
        )}
      <SchedulePreview previewDates={previewDates} />
      <div
        style={{ display: 'flex', marginTop: 15, justifyContent: 'flex-end' }}
      >
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={() => onSave(unparseConfig(config))}
          primary
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
  onChange
}) {
  let { isOpen, close, getOpenEvents } = useTooltip();

  function onSave(config) {
    onChange(config);
    close();
  }

  return (
    <View>
      <Button {...getOpenEvents()} style={[{ textAlign: 'left' }, buttonStyle]}>
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
