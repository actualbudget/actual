import * as monthUtils from 'loot-core/src/shared/months';

import ArrowLeft from '../../icons/v1/ArrowLeft';
import { styles } from '../../style';
import CategoryAutocomplete from '../autocomplete/CategorySelect';
import Button from '../common/Button';
import ButtonLink from '../common/ButtonLink';
import Select from '../common/Select';
import View from '../common/View';
import { FilterButton, AppliedFilters } from '../filters/FiltersMenu';

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
  show1Month,
  allMonths,
  onChangeDates,
  filters,
  conditionsOp,
  onApply,
  onUpdateFilter,
  onDeleteFilter,
  onCondOpChange,
  category,
  categoryGroups,
  onChangeCategory,
  numberOfMonths,
  numberOfMonthsOptions,
  numberOfMonthsLine,
  onChangeNumberOfMonths,
}) {
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
        <ArrowLeft width={10} height={10} style={{ marginRight: 5 }} /> Back
      </ButtonLink>
      <View style={styles.veryLargeText}>{title}</View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginTop: 15,
          gap: 15,
        }}
      >
        {categoryGroups && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <CategoryAutocomplete
              categoryGroups={categoryGroups}
              value={category}
              inputProps={{
                placeholder: 'Select category...',
              }}
              onSelect={newValue => onChangeCategory(newValue)}
            />
          </View>
        )}

        {numberOfMonthsOptions && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <View>Average: </View>
            <Select
              style={{ backgroundColor: 'white' }}
              onChange={onChangeNumberOfMonths}
              value={numberOfMonths}
              options={numberOfMonthsOptions.map(number => [
                number.value,
                number.description,
              ])}
              line={numberOfMonthsLine}
            />
          </View>
        )}

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <Select
            style={{ backgroundColor: 'white' }}
            onChange={newValue =>
              onChangeDates(...validateStart(allMonths, newValue, end))
            }
            value={start}
            defaultLabel={monthUtils.format(start, 'MMMM, yyyy')}
            options={allMonths.map(({ name, pretty }) => [name, pretty])}
          />
          <View>to</View>
          <Select
            style={{ backgroundColor: 'white' }}
            onChange={newValue =>
              onChangeDates(...validateEnd(allMonths, start, newValue))
            }
            value={end}
            options={allMonths.map(({ name, pretty }) => [name, pretty])}
          />
        </View>

        {filters && <FilterButton onApply={onApply} />}

        {show1Month && (
          <Button
            type="bare"
            onClick={() => onChangeDates(...getLatestRange(1))}
          >
            1 month
          </Button>
        )}
        <Button type="bare" onClick={() => onChangeDates(...getLatestRange(2))}>
          3 months
        </Button>
        <Button type="bare" onClick={() => onChangeDates(...getLatestRange(5))}>
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
          onClick={() => onChangeDates(...getFullRange(allMonths))}
        >
          All Time
        </Button>
      </View>
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

export default Header;
