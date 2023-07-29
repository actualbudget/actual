import React, { useState, type ChangeEvent } from 'react';
import { useSelector, useDispatch } from 'react-redux';

//import * as d from 'date-fns';

import { savePrefs } from 'loot-core/src/server/prefs';
import * as monthUtils from 'loot-core/src/shared/months';

import { colors } from '../../style';
import { Text, Button, Input, Select } from '../common';
import { Row } from '../table';

const lengthTypes = ['for', 'at the end of'] as const;
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
          throw new Error(`Schedule options not implemented: ${opts}`);
        default:
          throw new Error(`Unrecognized schedule options: ${opts}`);
      }
      break;
    case 'at the end of':
      switch (opts.interval) {
        case 'days':
          nextDate = monthUtils.addDays(today, opts.value);
          break;
        case 'weeks':
          throw new Error(`Schedule options not implemented: ${opts}`);
          break;
        case 'months':
          throw new Error(`Schedule options not implemented: ${opts}`);
        default:
          throw new Error(`Unrecognized schedule options: ${opts}`);
      }
      break;
    default:
      throw new Error(`Unrecognized schedule options: ${opts}`);
  }
  return nextDate;
}

export function TransactionPreviewPicker(accountId) {
  const [showSettings, setShowSettings] = useState(false);
  const [hover, setHover] = useState(false);

  let dispatch = useDispatch();
  const dateFormat = useSelector(state => {
    return state.prefs.local.dateFormat || 'MM/dd/yyyy';
  });

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
    dispatch(savePrefs({ [`schedulePreview-${accountId}`]: newPreviewOpts }));
  }

  function previewRow() {
    return (
      <Row
        onClick={() => setShowSettings(!showSettings)}
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
          {schedulePreviewPref.value} {schedulePreviewPref.interval}.
          Transactions shown through {monthUtils.format(nextDate, dateFormat)}{' '}
          {monthUtils.format(nextDate, 'EEEE')}
        </Text>{' '}
        {hover && <Button>Edit</Button>}
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
          style={{ padding: 5 }}
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
          style={{ padding: 5 }}
        />
        <Button
          type="primary"
          onClick={e => {
            e.preventDefault();
            setShowSettings(false);
          }}
        >
          Done
        </Button>
      </Row>
    );
  }

  return showSettings ? settingRow() : previewRow();
}
