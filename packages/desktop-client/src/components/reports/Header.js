import React from 'react';

import * as monthUtils from 'loot-core/src/shared/months';
import {
  View,
  Select,
  Button,
  ButtonLink
} from 'loot-design/src/components/common';
import { styles } from 'loot-design/src/style';
import ArrowLeft from 'loot-design/src/svg/v1/ArrowLeft';

function validateStart(allMonths, start, end) {
  const earliest = allMonths[allMonths.length - 1].name;
  if (end < start) {
    end = monthUtils.addMonths(start, 6);
  }
  return boundedRange(earliest, start, end);
}

function validateEnd(allMonths, start, end) {
  const earliest = allMonths[allMonths.length - 1].name;
  if (start > end) {
    start = monthUtils.subMonths(end, 6);
  }
  return boundedRange(earliest, start, end);
}

function boundedRange(earliest, start, end) {
  const latest = monthUtils.currentMonth();
  if (end > latest) {
    end = latest;
  }
  if (start < earliest) {
    start = earliest;
  }
  return [start, end];
}

function getLatestRange(offset) {
  const end = monthUtils.currentMonth();
  const start = monthUtils.subMonths(end, offset);
  return [start, end];
}

function getFullRange(allMonths) {
  const start = allMonths[allMonths.length - 1].name;
  const end = monthUtils.currentMonth();
  return [start, end];
}

function Header({ title, start, end, show1Month, allMonths, onChangeDates }) {
  return (
    <View
      style={{
        padding: 20,
        paddingTop: 0,
        flexShrink: 0
      }}
    >
      <ButtonLink
        to="/reports"
        bare
        style={{ marginBottom: '15', alignSelf: 'flex-start' }}
      >
        <ArrowLeft width={10} height={10} style={{ marginRight: 5 }} /> Back
      </ButtonLink>
      <View style={styles.veryLargeText}>{title}</View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginTop: 15
        }}
      >
        <div>
          <Select
            style={{ flex: 0, backgroundColor: 'white' }}
            onChange={e =>
              onChangeDates(...validateStart(allMonths, e.target.value, end))
            }
            value={start}
          >
            {allMonths.map(month => (
              <option key={month.name} value={month.name}>
                {month.pretty}
              </option>
            ))}
          </Select>{' '}
          to{' '}
          <Select
            style={{ flex: 0, backgroundColor: 'white' }}
            onChange={e =>
              onChangeDates(...validateEnd(allMonths, start, e.target.value))
            }
            value={end}
          >
            {allMonths.map(month => (
              <option key={month.name} value={month.name}>
                {month.pretty}
              </option>
            ))}
          </Select>
        </div>
        {show1Month && (
          <Button
            bare
            style={{ marginLeft: 15 }}
            onClick={() => onChangeDates(...getLatestRange(1))}
          >
            1 month
          </Button>
        )}
        <Button
          bare
          style={{ marginLeft: 15 }}
          onClick={() => onChangeDates(...getLatestRange(2))}
        >
          3 months
        </Button>
        <Button
          bare
          style={{ marginLeft: 15 }}
          onClick={() => onChangeDates(...getLatestRange(5))}
        >
          6 months
        </Button>
        <Button
          bare
          style={{ marginLeft: 15 }}
          onClick={() => onChangeDates(...getLatestRange(12))}
        >
          1 Year
        </Button>
        <Button
          bare
          style={{ marginLeft: 15 }}
          onClick={() => onChangeDates(...getFullRange(allMonths))}
        >
          All Time
        </Button>
      </View>
    </View>
  );
}

export default Header;
