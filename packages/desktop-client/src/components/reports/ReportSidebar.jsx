import React from 'react';

import * as monthUtils from 'loot-core/src/shared/months';

import { theme } from '../../style';
import { Select } from '../common/Select';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { Checkbox } from '../forms';

import { CategorySelector } from './CategorySelector';
import {
  validateStart,
  validateEnd,
  getLatestRange,
  getFullRange,
  validateRange,
} from './Header';
import { ModeButton } from './ModeButton';
import { ReportOptions } from './ReportOptions';

export function ReportSidebar({
  items,
  categories,
  dateRangeLine,
  allMonths,
  setDateRange,
  typeDisabled,
  setTypeDisabled,
  setGraphType,
  setGroupBy,
  setBalanceType,
  setMode,
  setIsDateStatic,
  setShowEmpty,
  setShowOffBudgetHidden,
  setShowUncategorized,
  setSelectedCategories,
  onChangeDates,
  onChangeViews,
}) {
  const onSelectRange = cond => {
    setDateRange(cond);
    switch (cond) {
      case 'All time':
        onChangeDates(...getFullRange(allMonths));
        break;
      case 'Year to date':
        onChangeDates(
          ...validateRange(
            allMonths,
            monthUtils.getYearStart(monthUtils.currentMonth()),
            monthUtils.currentMonth(),
          ),
        );
        break;
      case 'Last year':
        onChangeDates(
          ...validateRange(
            allMonths,
            monthUtils.getYearStart(
              monthUtils.prevYear(monthUtils.currentMonth()),
            ),
            monthUtils.getYearEnd(
              monthUtils.prevYear(monthUtils.currentDate()),
            ),
          ),
        );
        break;
      default:
        onChangeDates(...getLatestRange(ReportOptions.dateRangeMap.get(cond)));
    }
  };

  const onChangeMode = cond => {
    setMode(cond);
    if (cond === 'time') {
      if (items.graphType === 'TableGraph') {
        setTypeDisabled([]);
      } else {
        setTypeDisabled(['Net']);
        if (['Net'].includes(items.balanceType)) {
          setBalanceType('Payment');
        }
      }
      if (items.graphType === 'BarGraph') {
        setGraphType('StackedBarGraph');
      }
      if (['AreaGraph', 'DonutGraph'].includes(items.graphType)) {
        setGraphType('TableGraph');
        onChangeViews('viewLegend', false);
      }
      if (['Month', 'Year'].includes(items.groupBy)) {
        setGroupBy('Category');
      }
    } else {
      if (items.graphType === 'StackedBarGraph') {
        setGraphType('BarGraph');
      } else {
        setTypeDisabled([]);
      }
    }
  };

  const onChangeSplit = cond => {
    setGroupBy(cond);
    if (items.mode === 'total') {
      if (items.graphType !== 'TableGraph') {
        setTypeDisabled(!['Month', 'Year'].includes(items.groupBy) ? [] : ['Net']);
      }
    }
    if (['Net'].includes(items.balanceType) && items.graphType !== 'TableGraph') {
      setBalanceType('Payment');
    }
  };

  return (
    <View
      style={{
        width: 225,
        paddingTop: 10,
        paddingRight: 10,
        flexShrink: 0,
        overflowY: 'auto',
      }}
    >
      <View style={{ flexShrink: 0 }}>
        <View
          style={{
            flexDirection: 'row',
            marginBottom: 5,
            alignItems: 'center',
          }}
        >
          <Text>
            <strong>Display</strong>
          </Text>
        </View>
        <View
          style={{
            flexDirection: 'row',
            padding: 5,
            alignItems: 'center',
          }}
        >
          <Text style={{ width: 40, textAlign: 'right', marginRight: 5 }}>
            Mode:
          </Text>
          <ModeButton
            selected={items.mode === 'total'}
            onSelect={() => onChangeMode('total')}
          >
            Total
          </ModeButton>
          <ModeButton
            selected={items.mode === 'time'}
            onSelect={() => onChangeMode('time')}
          >
            Time
          </ModeButton>
        </View>
        <View
          style={{
            flexDirection: 'row',
            padding: 5,
            alignItems: 'center',
          }}
        >
          <Text style={{ width: 40, textAlign: 'right', marginRight: 5 }}>
            Split:
          </Text>
          <Select
            value={items.groupBy}
            onChange={e => onChangeSplit(e)}
            options={ReportOptions.groupBy.map(option => [
              option.description,
              option.description,
            ])}
            disabledKeys={
              items.mode === 'time'
                ? ['Month', 'Year']
                : items.graphType === 'AreaGraph'
                ? ['Category', 'Group', 'Payee', 'Account', 'Year']
                : ['Year']
            }
          />
        </View>
        <View
          style={{
            flexDirection: 'row',
            padding: 5,
            alignItems: 'center',
          }}
        >
          <Text style={{ width: 40, textAlign: 'right', marginRight: 5 }}>
            Type:
          </Text>
          <Select
            value={items.balanceType}
            onChange={setBalanceType}
            options={ReportOptions.balanceType.map(option => [
              option.description,
              option.description,
            ])}
            disabledKeys={typeDisabled}
          />
        </View>
        {/* //It would be nice to retain this for future usage
            <View
              style={{
                flexDirection: 'row',
                padding: 5,
                alignItems: 'center',
              }}
            >
              <Text style={{ width: 40, textAlign: 'right', marginRight: 5, paddingLeft: -10 }}>
                Interval:
              </Text>
              <Select
                value={interval}
                onChange={setInterval}
                options={intervalOptions.map(option => [
                  option.value,
                  option.description,
                ])}
                disabledKeys={
                  [1,2,3,4,5]
                }
              />
            </View>
            */}
        <View
          style={{
            flexDirection: 'row',
            padding: 5,
            alignItems: 'center',
          }}
        >
          <Text style={{ width: 40, textAlign: 'right', marginRight: 5 }} />

          <Checkbox
            id="show-empty-columns"
            checked={showEmpty}
            value={showEmpty}
            onChange={() => setShowEmpty(!showEmpty)}
          />
          <label
            htmlFor="show-empty-columns"
            title="Show rows that are zero or blank"
            style={{ fontSize: 12 }}
          >
            Show Empty Rows
          </label>
        </View>
        <View
          style={{
            flexDirection: 'row',
            padding: 5,
            alignItems: 'center',
          }}
        >
          <Text style={{ width: 40, textAlign: 'right', marginRight: 5 }} />

          <Checkbox
            id="show-hidden-columns"
            checked={showOffBudgetHidden}
            value={showOffBudgetHidden}
            onChange={() => setShowOffBudgetHidden(!showOffBudgetHidden)}
          />
          <label
            htmlFor="show-hidden-columns"
            title="Show off budget accounts and hidden categories"
            style={{ fontSize: 12 }}
          >
            Off Budget Items
          </label>
        </View>
        <View
          style={{
            flexDirection: 'row',
            padding: 5,
            alignItems: 'center',
          }}
        >
          <Text style={{ width: 40, textAlign: 'right', marginRight: 5 }} />

          <Checkbox
            id="show-uncategorized"
            checked={showUncategorized}
            value={showUncategorized}
            onChange={() => setShowUncategorized(!showUncategorized)}
          />
          <label
            htmlFor="show-uncategorized"
            title="Show uncategorized transactions"
            style={{ fontSize: 12 }}
          >
            Uncategorized
          </label>
        </View>
        <View
          style={{
            height: 1,
            backgroundColor: theme.pillBorderDark,
            marginTop: 10,
            flexShrink: 0,
          }}
        />
        <View
          style={{
            flexDirection: 'row',
            marginTop: 10,
            marginBottom: 5,
            alignItems: 'center',
          }}
        >
          <Text>
            <strong>Date filters</strong>
          </Text>
          <View style={{ flex: 1 }} />
          <ModeButton
            selected={!items.isDateStatic}
            onSelect={() => {
              setIsDateStatic(false);
              onSelectRange(items.dateRange);
            }}
          >
            Live
          </ModeButton>
          <ModeButton
            selected={items.isDateStatic}
            onSelect={() => {
              setIsDateStatic(true);
              onChangeDates(items.startDate, items.endDate);
            }}
          >
            Static
          </ModeButton>
        </View>
        {!items.isDateStatic ? (
          <View
            style={{
              flexDirection: 'row',
              padding: 5,
              alignItems: 'center',
            }}
          >
            <Text style={{ width: 40, textAlign: 'right', marginRight: 5 }}>
              Range:
            </Text>
            <Select
              value={items.dateRange}
              onChange={e => {
                onSelectRange(e);
              }}
              options={ReportOptions.dateRange.map(option => [
                option.description,
                option.description,
              ])}
              line={dateRangeLine}
            />
          </View>
        ) : (
          <>
            <View
              style={{
                flexDirection: 'row',
                padding: 5,
                alignItems: 'center',
              }}
            >
              <Text style={{ width: 40, textAlign: 'right', marginRight: 5 }}>
                From:
              </Text>
              <Select
                onChange={newValue =>
                  onChangeDates(...validateStart(allMonths, newValue, items.endDate))
                }
                value={items.startDate}
                defaultLabel={monthUtils.format(startDate, 'MMMM, yyyy')}
                options={allMonths.map(({ name, pretty }) => [name, pretty])}
              />
            </View>
            <View
              style={{
                flexDirection: 'row',
                padding: 5,
                alignItems: 'center',
              }}
            >
              <Text style={{ width: 40, textAlign: 'right', marginRight: 5 }}>
                To:
              </Text>
              <Select
                onChange={newValue =>
                  onChangeDates(...validateEnd(allMonths, items.startDate, newValue))
                }
                value={items.endDate}
                options={allMonths.map(({ name, pretty }) => [name, pretty])}
              />
            </View>
          </>
        )}
        <View
          style={{
            height: 1,
            backgroundColor: theme.pillBorderDark,
            marginTop: 10,
            flexShrink: 0,
          }}
        />
      </View>
      {['Category', 'Group'].includes(items.groupBy) && (
        <View
          style={{
            marginTop: 10,
            minHeight: 200,
          }}
        >
          <CategorySelector
            categoryGroups={categories.grouped}
            categories={categories.list}
            selectedCategories={selectedCategories}
            setSelectedCategories={setSelectedCategories}
          />
        </View>
      )}
    </View>
  );
}
