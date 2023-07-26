import React, { useState } from 'react';
import { useSelector } from 'react-redux';

//import * as d from 'date-fns';

import * as monthUtils from 'loot-core/src/shared/months';

import { colors } from '../../style';
import { Text, Button, Input, Select } from '../common';
import { Row } from '../table';

const schedMenuTypes = ['for', 'at the end of'] as const;
type SchedMenuType = (typeof schedMenuTypes)[number];

const schedMenuIntervals = ['days', 'weeks', 'months'] as const;
type SchedMenuInterval = (typeof schedMenuIntervals)[number];

type SchedMenu = {
  type: SchedMenuType;
  value: number;
  interval: SchedMenuInterval;
};

const schedCondNames = [
  // 'for' options
  'days',
  'weeks',
  'months',
  // 'at the end of' options
  'endOfWeek',
  'endOfMonth',
] as const;
type SchedCondName = (typeof schedCondNames)[number];

type SchedCond = {
  name: SchedCondName;
  value: number;
};

function schedCondToMenu(cond: SchedCond) {
  let menu: SchedMenu = { type: 'for', value: 7, interval: 'days' };
  switch (cond.name) {
    case 'days':
      menu.type = 'for';
      menu.value = cond.value;
      menu.interval = 'days';
      break;
    case 'weeks':
      menu.type = 'for';
      menu.value = cond.value;
      menu.interval = 'weeks';
      break;
    case 'months':
      menu.type = 'for';
      menu.value = cond.value;
      menu.interval = 'months';
      break;
    case 'endOfWeek':
      menu.type = 'at the end of';
      menu.value = cond.value;
      menu.interval = 'weeks';
      break;
    case 'endOfMonth':
      menu.type = 'at the end of';
      menu.value = cond.value;
      menu.interval = 'months';
      break;
    default:
      throw new Error('Unknown Schedule Condition name: ' + cond.name);
  }

  return menu;
}

function menuToSchedCond(
  menuType: SchedMenuType,
  menuInterval: SchedMenuInterval,
) {
  let schedCondName: SchedCondName;
  switch (menuType) {
    case 'for':
      // Set value on pref
      switch (menuInterval) {
        case 'days':
          schedCondName = 'days';
          break;
        case 'weeks':
          schedCondName = 'weeks';
          break;
        case 'months':
          schedCondName = 'months';
          break;
        default:
          throw new Error('Unknown interval');
      }
      break;
    case 'at the end of':
      switch (menuInterval) {
        case 'days':
          // 'for' and 'at the end of' are same when using 'days'
          schedCondName = 'days';
          break;
        case 'weeks':
          schedCondName = 'endOfWeek';
          break;
        case 'months':
          schedCondName = 'endOfMonth';
          break;
        default:
          throw new Error('Unknown interval');
      }
      break;
    default:
      throw new Error('Unrecognized schedule menu type' + menuType);
  }
  return schedCondName;
}

let defaultSchedCond: SchedCond = { name: 'days', value: 7 };

function schedCondToNextDate(cond: SchedCond) {
  let today = monthUtils.currentDay();

  let nextDate = null;
  switch (cond.name) {
    case 'days':
      nextDate = monthUtils.addDays(today, cond.value);
      break;
    case 'weeks':
      throw new Error(`Schedule condition not implemented: ${cond}`);
    case 'endOfWeek':
      throw new Error(`Schedule condition not implemented: ${cond}`);
    case 'months':
      throw new Error(`Schedule condition not implemented: ${cond}`);
    case 'endOfMonth':
      throw new Error(`Schedule condition not implemented: ${cond}`);
    default:
      throw new Error(`Unrecognized schedule condition: ${cond}`);
  }
  return nextDate;
}

export function TransactionPreviewPicker(transaction: unknown) {
  const [showSettings, setShowSettings] = useState(false);
  const [hover, setHover] = useState(false);

  let { dateFormat } = useSelector(state => {
    return {
      dateFormat: state.prefs.local.dateFormat || 'MM/dd/yyyy',
    };
  });

  let { schedCondPref } = useSelector(state => {
    return {
      schedCondPref:
        state.prefs.local[`schedCondPref-${transaction.id}`] ||
        defaultSchedCond,
    };
  });

  console.log(schedCondPref);
  let nextDate = schedCondToNextDate(schedCondPref);
  let currentMenu = schedCondToMenu(schedCondPref);

  function setSchedCondPref(cond: SchedCond) {}

  function handleChange(changeType: string, changeValue) {
    currentMenu = schedCondToMenu(schedCondPref);
    console.log(changeType, changeValue);
    console.log(currentMenu);
    switch (changeType) {
      case 'value':
        // Standard positive integer error checking
        // Make sure is a number and >= 0 otherwise set to 1
        changeValue = Number.isInteger(changeValue)
          ? changeValue >= 0
            ? changeValue
            : 1
          : 1;

        // Set value on pref
        schedCondPref.value = changeValue;
        break;
      case 'schedMenuType':
        schedCondPref.name = menuToSchedCond(changeValue, currentMenu.interval);
        break;
      case 'schedMenuInterval':
        schedCondPref.name = menuToSchedCond(currentMenu.type, changeValue);
        break;
      default:
        throw new Error('Unknown menu change type');
    }
    setSchedCondPref(schedCondPref);
    currentMenu = schedCondToMenu(schedCondPref);
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
        {showSettings ? (
          settingRow()
        ) : (
          <>
            <Text
              style={{
                color: colors.n5,
                fontStyle: 'italic',
              }}
            >
              7 days of scheduled transactions shown (through{' '}
              {monthUtils.format(nextDate, dateFormat)}{' '}
              {monthUtils.format(nextDate, 'EEEE')})
            </Text>{' '}
            {hover && <Button>Edit</Button>}
          </>
        )}
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
          value={currentMenu.type}
          options={schedMenuTypes.map(x => [x, x])}
          onChange={value => handleChange('schedMenuType', value)}
          style={{ padding: 5 }}
        />
        <Input
          defaultValue={currentMenu.value}
          onChange={value => handleChange('value', value)}
          style={{
            width: '5em',
            marginLeft: 5,
            marginRight: 5,
          }}
        />
        <Select
          line={0}
          value={currentMenu.interval}
          options={schedMenuIntervals.map(x => [x, x])}
          onChange={value => handleChange('schedMenuInterval', value)}
          style={{ padding: 5 }}
        />
        <Button
          primary
          onClick={e => {
            e.preventDefault();
            setShowSettings(false);
          }}
        >
          Apply
        </Button>
      </Row>
    );
  }

  return showSettings ? settingRow() : previewRow();
}
