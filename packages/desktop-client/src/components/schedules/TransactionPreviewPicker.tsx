import React, { useState, type ChangeEvent } from 'react';
import { useSelector } from 'react-redux';

import * as monthUtils from 'loot-core/src/shared/months';

//import * as d from 'date-fns';

import { useActions } from '../../hooks/useActions';
import { colors, theme } from '../../style';
import { Text, Input, Select } from '../common';
import { Row } from '../table';

const descTypes = ['for', 'until the end of'] as const;
type MenuDesc = (typeof descTypes)[number];

const menuIntervals = ['days', 'weeks', 'months'] as const;
type MenuInterval = (typeof menuIntervals)[number];

type SchedulePreviewOpts = {
  desc: MenuDesc;
  value: number;
  interval: MenuInterval;
};

const defaultOpts: SchedulePreviewOpts = {
  desc: 'for',
  value: 7,
  interval: 'days',
};

function getErrorMessage(opts) {
  return `Schedule options not implemented: desc:“${opts.desc}”, value:“${opts.value}”, interval:“${opts.interval}”`;
}

function schedOptsToNextDate(opts: SchedulePreviewOpts = defaultOpts) {
  let today = monthUtils.currentDay();

  let nextDate: string;
  switch (opts.desc) {
    case 'for':
      switch (opts.interval) {
        case 'days':
          nextDate = monthUtils.addDays(today, opts.value);
          break;
        case 'weeks':
          nextDate = monthUtils.addWeeks(today, opts.value);
          break;
        case 'months':
          nextDate = monthUtils.addMonths(today, opts.value);
          break;
        default:
          console.log(getErrorMessage(opts));
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
          console.log(getErrorMessage(opts));
          break;
        case 'months':
          // See find-schedules.ts for examples
          nextDate = monthUtils.addDays(today, defaultOpts.value);
          console.log(getErrorMessage(opts));
          break;
        default:
          console.log(getErrorMessage(opts));
      }
      break;
    default:
      console.log(getErrorMessage(opts));
      return schedOptsToNextDate(); // to get default
  }
  return nextDate;
}

export function TransactionPreviewPicker(transaction) {
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
    changeValue: MenuDesc | number | MenuInterval,
  ) {
    let newPreviewOpts: SchedulePreviewOpts = { ...schedulePreviewPref };

    // Validate inputs
    switch (changeType) {
      case 'schedMenuDesc':
        newPreviewOpts.desc = changeValue;
        break;
      case 'value':
        // Standard positive integer error checking
        // Make sure is a number and >= 0 otherwise set to 1
        newPreviewOpts.value = changeValue >= 0 ? Math.round(changeValue) : 1;
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
          Showing scheduled transactions {schedulePreviewPref.desc}{' '}
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
          value={schedulePreviewPref.desc}
          options={descTypes.map(x => [x, x])}
          onChange={value => onChange('schedMenuDesc', value)}
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
