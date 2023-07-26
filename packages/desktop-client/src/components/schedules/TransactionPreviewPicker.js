import React, { useState } from 'react';
import { useSelector } from 'react-redux';

//import * as d from 'date-fns';

import * as monthUtils from 'loot-core/src/shared/months';

import { colors } from '../../style';
import { Text, Button, Input, Select } from '../common';
import { Row } from '../table';

const schedOptsType = ['for', 'at the end of'];

const schedOptsInterval = ['days', 'weeks', 'months'];

const schedCond = [
  { name: 'days', value: 7, text: 'days' },
  { name: 'weeks', value: 1, text: 'weeks' },
  { name: 'endOfWeek', value: 1, text: 'end of week' },
  { name: 'months', value: 1, text: 'months' },
  { name: 'endOfMonth', value: 1, text: 'end of month' },
];

function schedCondToNextDate(cond) {
  let today = monthUtils.currentDay();

  let nextDate = null;
  switch (cond.name) {
    case 'days':
      nextDate = monthUtils.addDays(today, cond.value);
      break;
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

export function TransactionPreviewPicker({
  transaction,
  setSchedule,
  setMenuOpen,
}) {
  const [showSettings, setShowSettings] = useState(false);
  const [hover, setHover] = useState(false);

  let { dateFormat } = useSelector(state => {
    return {
      dateFormat: state.prefs.local.dateFormat || 'MM/dd/yyyy',
    };
  });

  let { schedCondPref } = useSelector(state => {
    return {
      schedCondPref: state.prefs.local.schedCondPref || schedCond[0],
    };
  });

  console.log(schedCondPref);
  let nextDate = schedCondToNextDate(schedCondPref);

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
          value={schedOptsType[0]}
          options={schedOptsType.map(x => [x, x])}
          style={{ padding: 5 }}
        />
        <Input
          defaultValue={schedCondPref.value}
          style={{
            width: '5em',
            marginLeft: 5,
            marginRight: 5,
          }}
        />

        <Select
          value={schedOptsInterval[0]}
          options={schedOptsInterval.map(x => [x, x])}
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
