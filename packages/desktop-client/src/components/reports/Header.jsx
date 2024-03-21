import { useLocation } from 'react-router-dom';

import * as monthUtils from 'loot-core/src/shared/months';

import { SvgArrowLeft } from '../../icons/v1';
import { styles } from '../../style';
import { Button } from '../common/Button';
import { ButtonLink } from '../common/ButtonLink';
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
  title,
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
  onCondOpChange,
  headerPrefixItems,
  children,
}) {
  const location = useLocation();
  const path = location.pathname;

  return (
    <View
      style={{
        padding: 10,
        paddingTop: 0,
        flexShrink: 0,
      }}
    >
      <ButtonLink
        type="bare"
        to="/reports"
        style={{ marginBottom: '15', alignSelf: 'flex-start' }}
      >
        <SvgArrowLeft width={10} height={10} style={{ marginRight: 5 }} /> Back
      </ButtonLink>
      <View style={styles.veryLargeText}>{title}</View>

      {path !== '/reports/custom' && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
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
            />
          </View>

          {filters && <FilterButton onApply={onApply} type="accounts" />}

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
            filters={filters}
            onUpdate={onUpdateFilter}
            onDelete={onDeleteFilter}
            conditionsOp={conditionsOp}
            onCondOpChange={onCondOpChange}
          />
        </View>
      )}
    </View>
  );
}
