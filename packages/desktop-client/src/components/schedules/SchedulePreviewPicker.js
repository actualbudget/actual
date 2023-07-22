import React, { useState } from 'react';
import { useSelector } from 'react-redux';

import { FocusScope } from '@react-aria/focus';
//import * as d from 'date-fns';

import * as monthUtils from 'loot-core/src/shared/months';

import { HourGlass } from '../../icons/v1';
import { colors } from '../../style';
import { Text, Stack, Button, View, Input, Tooltip, Select } from '../common';

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

function SchedulePreviewMenu({ setSchedule, setMenuOpen }) {
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

  return (
    <Tooltip
      position="bottom-left"
      width={300}
      style={{ padding: 15 }}
      onClose={() => {
        setMenuOpen(false);
      }}
    >
      <FocusScope>
        <View style={{ marginBottom: 10 }}>Show scheduled transactions</View>
        <form action="#">
          <Stack direction="row">
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
          </Stack>
          <View style={{ color: colors.n4 }}>
            <Text style={{ fontWeight: 600, marginTop: 10 }}>Until: </Text>
            <Stack direction="row" spacing={4} style={{ marginTop: 10 }}>
              <View>
                <Text>{monthUtils.format(nextDate, dateFormat)}</Text>
                <Text>{monthUtils.format(nextDate, 'EEEE')}</Text>
              </View>
            </Stack>
          </View>
          <View>
            <Button
              primary
              style={{ marginTop: 15 }}
              onClick={e => {
                e.preventDefault();
              }}
            >
              Apply
            </Button>
          </View>
        </form>
      </FocusScope>
    </Tooltip>
  );
}

export function SchedulePreviewButton({ setSchedule }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <View>
      <Button
        bare
        onClick={() => {
          setMenuOpen(true);
        }}
      >
        <HourGlass
          style={{
            width: 16,
            height: 16,
            color: 'inherit',
            marginRight: 5,
          }}
        />{' '}
        Transaction Preview
        {menuOpen && (
          <SchedulePreviewMenu
            value={1}
            setSchedule={setSchedule}
            setMenuOpen={setMenuOpen}
          />
        )}
      </Button>
    </View>
  );
}
