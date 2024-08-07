import { useLocation } from 'react-router-dom';

import * as monthUtils from 'loot-core/src/shared/months';

import { useResponsive } from '../../ResponsiveProvider';
import { Button } from '../common/Button';
import { Select } from '../common/Select';
import { View } from '../common/View';
import { AppliedFilters } from '../filters/AppliedFilters';
import { FilterButton } from '../filters/FiltersMenu';

import {
  getFullRange,
  getLatestRange,
  validateEnd,
  validateStart,
} from './reportRanges';

export function Header({
  start,
  end,
  show1Month,
  allMonths,
  onChangeDates,
  filters,
  conditionsOp,
  onApply,
  onUpdateFilter,
  onDeleteFilter,
  onConditionsOpChange,
  headerPrefixItems,
  children,
}) {
  const location = useLocation();
  const path = location.pathname;
  const { isNarrowWidth } = useResponsive();

  return (
    <View
      style={{
        padding: 20,
        paddingTop: 0,
        flexShrink: 0,
      }}
    >
      {!['/reports/custom', '/reports/spending'].includes(path) && (
        <View
          style={{
            flexDirection: isNarrowWidth ? 'column' : 'row',
            alignItems: isNarrowWidth ? 'flex-start' : 'center',
            marginTop: 15,
            gap: 15,
          }}
        >
          {headerPrefixItems}

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <Select
              onChange={newValue =>
                onChangeDates(
                  ...validateStart(
                    allMonths[allMonths.length - 1].name,
                    newValue,
                    end,
                  ),
                )
              }
              value={start}
              defaultLabel={monthUtils.format(start, 'MMMM, yyyy')}
              options={allMonths.map(({ name, pretty }) => [name, pretty])}
            />
            <View>to</View>
            <Select
              onChange={newValue =>
                onChangeDates(
                  ...validateEnd(
                    allMonths[allMonths.length - 1].name,
                    start,
                    newValue,
                  ),
                )
              }
              value={end}
              options={allMonths.map(({ name, pretty }) => [name, pretty])}
              buttonStyle={{ marginRight: 10 }}
            />
            {filters && (
              <FilterButton
                compact={isNarrowWidth}
                onApply={onApply}
                type="accounts"
              />
            )}
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 15,
              flexWrap: 'wrap',
            }}
          >
            {show1Month && (
              <Button
                type="bare"
                onClick={() => onChangeDates(...getLatestRange(1))}
              >
                1 month
              </Button>
            )}
            <Button
              type="bare"
              onClick={() => onChangeDates(...getLatestRange(2))}
            >
              3 months
            </Button>
            <Button
              type="bare"
              onClick={() => onChangeDates(...getLatestRange(5))}
            >
              6 months
            </Button>
            <Button
              type="bare"
              onClick={() => onChangeDates(...getLatestRange(11))}
            >
              1 Year
            </Button>
            <Button
              type="bare"
              onClick={() =>
                onChangeDates(
                  ...getFullRange(allMonths[allMonths.length - 1].name),
                )
              }
            >
              All Time
            </Button>
          </View>
          {children || <View style={{ flex: 1 }} />}
        </View>
      )}
      {filters && filters.length > 0 && (
        <View
          style={{ marginTop: 5 }}
          spacing={2}
          direction="row"
          justify="flex-start"
          align="flex-start"
        >
          <AppliedFilters
            conditions={filters}
            onUpdate={onUpdateFilter}
            onDelete={onDeleteFilter}
            conditionsOp={conditionsOp}
            onConditionsOpChange={onConditionsOpChange}
          />
        </View>
      )}
    </View>
  );
}
