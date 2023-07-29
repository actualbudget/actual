import React, { useState, type ChangeEvent } from 'react';
import { useSelector } from 'react-redux';

import * as monthUtils from 'loot-core/src/shared/months';

//import * as d from 'date-fns';

import { useActions } from '../../hooks/useActions';
import { colors, theme } from '../../style';
import { Text, Input, Select } from '../common';
import { Row } from '../table';

const lengthTypes = ['for', 'until the end of'] as const;
type MenuLength = (typeof lengthTypes)[number];

const menuIntervals = ['days', 'weeks', 'months'] as const;
type MenuInterval = (typeof menuIntervals)[number];

export type SchedulePreviewOpts = {
  length: MenuLength;
  value: number;
  interval: MenuInterval;
};

const defaultOpts: SchedulePreviewOpts = {
  length: 'for',
  value: 7,
  interval: 'days',
};

function schedOptsToNextDate(opts: SchedulePreviewOpts) {
  let today = monthUtils.currentDay();

  let nextDate = null;
  switch (opts.length) {
    case 'for':
      switch (opts.interval) {
        case 'days':
          nextDate = monthUtils.addDays(today, opts.value);
          break;
        case 'weeks':
          nextDate = monthUtils.addDays(today, opts.value * 7);
          break;
        case 'months':
          // See find-schedules.ts for examples
          nextDate = monthUtils.addDays(today, defaultOpts.value);
          console.log(`Schedule options not implemented: ${opts}`);
          break;
        default:
          throw new Error(`Unrecognized schedule options: ${opts}`);
      }
      break;
    case 'until the end of':
      switch (opts.interval) {
        case 'days':
          nextDate = monthUtils.addDays(today, opts.value);
          break;
        case 'weeks':
          // See find-schedules.ts for examples
          nextDate = monthUtils.addDays(today, defaultOpts.value);
          console.log(`Schedule options not implemented: ${opts}`);
          break;
        case 'months':
          // See find-schedules.ts for examples
          nextDate = monthUtils.addDays(today, defaultOpts.value);
          console.log(`Schedule options not implemented: ${opts}`);
          break;
        default:
          throw new Error(`Unrecognized schedule options: ${opts}`);
      }
      break;
    default:
      throw new Error(`Unrecognized schedule options: ${opts}`);
  }
  return nextDate;
}

export function TransactionPreviewPicker(transaction) {
  console.log(transaction);
  const [hover, setHover] = useState(false);

  let { savePrefs } = useActions();
  const dateFormat = useSelector(state => {
    return state.prefs.local.dateFormat || 'MM/dd/yyyy';
  });

  let accountId = transaction.accountId;

  const schedulePreviewPref: SchedulePreviewOpts = useSelector(state => {
    return state.prefs.local[`schedulePreview-${accountId}`] || defaultOpts;
  });
  let nextDate = schedOptsToNextDate(schedulePreviewPref);

  function onChange(
    changeType: string,
    changeValue: MenuLength | number | MenuInterval,
  ) {
    let newPreviewOpts: SchedulePreviewOpts = { ...schedulePreviewPref };

    // Validate inputs
    switch (changeType) {
      case 'schedMenuType':
        newPreviewOpts.length = changeValue;
        break;
      case 'value':
        // Standard positive integer error checking
        // Make sure is a number and >= 0 otherwise set to 1
        changeValue = changeValue >= 0 ? Math.round(changeValue) : 1;

        // Set value on pref
        newPreviewOpts.value = changeValue;
        break;
      case 'schedMenuInterval':
        newPreviewOpts.interval = changeValue;
        break;
      default:
        throw new Error('Unknown menu change type');
    }

    // Save to preferences to trigger component updates
    savePrefs({ [`schedulePreview-${accountId}`]: newPreviewOpts });
  }

  function previewRow() {
    return (
      <Row
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          alignItems: 'center',
          textAlign: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            color: colors.n5,
            fontStyle: 'italic',
          }}
        >
          Showing scheduled transactions {schedulePreviewPref.length}{' '}
          {schedulePreviewPref.value} {schedulePreviewPref.interval} (
          {monthUtils.format(nextDate, dateFormat)})
        </Text>
      </Row>
    );
  }

  function settingRow() {
    return (
      <Row
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          alignItems: 'center',
          textAlign: 'center',
          justifyContent: 'center',
        }}
        //height={2 * ROW_HEIGHT} // Doesn't work???
      >
        <Text>Show scheduled transactions</Text>
        <Select
          line={0}
          value={schedulePreviewPref.length}
          options={lengthTypes.map(x => [x, x])}
          onChange={value => onChange('schedMenuType', value)}
          style={{
            padding: 5,
            backgroundColor: theme.pillBackground,
            color: theme.pillText,
          }}
        />
        <Input
          defaultValue={schedulePreviewPref.value}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onChange('value', e.target.value)
          }
          style={{
            width: '5em',
            marginLeft: 5,
            marginRight: 5,
          }}
        />
        <Select
          line={0}
          value={schedulePreviewPref.interval}
          options={menuIntervals.map(x => [x, x])}
          onChange={value => onChange('schedMenuInterval', value)}
          style={{
            padding: 5,
            backgroundColor: theme.pillBackground,
            color: theme.pillText,
          }}
        />
      </Row>
    );
  }

  return hover ? settingRow() : previewRow();
}
