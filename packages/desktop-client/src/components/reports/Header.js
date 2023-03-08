import React from 'react';

import * as monthUtils from 'loot-core/src/shared/months';
import { View, Select, Button } from 'loot-design/src/components/common';
import { ChartItem } from 'loot-design/src/components/sidebar';
import { colors, styles } from 'loot-design/src/style';

import { FilterButton, AppliedFilters } from '../accounts/Filters';

const selectionBoxHeader = {
  SquareShapeView: {
    height: 5,
    backgroundColor: colors.n3,
  },
};

const selectionBoxSmall = {
  SquareShapeView: {
    height: 2,
    backgroundColor: colors.n3,
  },
};

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

function Header({
  title,
  start,
  end,
  filters,
  show1Month,
  allMonths,
  onChangeDates,
  onApplyFilter,
  onDeleteFilter,
  disableFilter,
  showAllTime,
}) {
  return (
    <View
      style={{
        padding: 15,
        paddingTop: 0,
        flexShrink: 0,
      }}
    >
      <View style={styles.veryLargeText}>{title}</View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginTop: 15,
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
          onClick={() => onChangeDates(...getLatestRange(11))}
        >
          1 Year
        </Button>
        <Button
          bare
          style={{
            marginLeft: 15,
            display: !showAllTime ? 'inherit' : 'none',
          }}
          onClick={() => onChangeDates(...getFullRange(allMonths))}
        >
          All Time
        </Button>
      </View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          paddingTop: 15,
        }}
      >
        <View style={{ marginRight: 10, marginTop: 2, marginBottom: 5 }}>
          <FilterButton onApply={onApplyFilter} disableFilter={disableFilter} />
        </View>

        {filters && filters.length > 0 && (
          <AppliedFilters filters={filters} onDelete={onDeleteFilter} />
        )}
      </View>
    </View>
  );
}

export function TotalsTrends({ title, isElement, Chart, id, OnClick }) {
  return (
    <View
      style={{
        color: colors.n3,
        marginLeft: 20,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          height: 16,
          marginBottom: 2,
        }}
      >
        <ChartItem
          isElement={isElement}
          id={id}
          handleClick={OnClick}
          Icon={Chart}
          title={title}
        />
      </View>
      <View
        style={[
          selectionBoxSmall.SquareShapeView,
          { display: isElement ? 'inherit' : 'none' },
        ]}
      />
    </View>
  );
}

export function HeaderReport({
  title,
  id,
  handleMouseHover,
  handleMouseLeaveHeader,
  onHeaderClick,
  isElement,
  isDefault,
}) {
  return (
    <View
      style={{
        marginLeft: 20,
        flexShrink: 0,
        color: isDefault ? colors.n3 : colors.n7,
      }}
    >
      <View
        onMouseOver={handleMouseHover}
        onMouseOut={handleMouseLeaveHeader}
        onClick={onHeaderClick}
        id={id}
        style={[
          styles.largeText,
          {
            alignItems: 'center',
            marginBottom: 2,
          },
        ]}
      >
        {title}
      </View>
      <View
        style={[
          selectionBoxHeader.SquareShapeView,
          { display: isElement ? 'inherit' : 'none' },
        ]}
      />
    </View>
  );
}

export default Header;
