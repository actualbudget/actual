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
  customReportItems,
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
      if (customReportItems.graphType === 'TableGraph') {
        setTypeDisabled([]);
      } else {
        setTypeDisabled(['Net']);
        if (['Net'].includes(customReportItems.balanceType)) {
          setBalanceType('Payment');
        }
      }
      if (customReportItems.graphType === 'BarGraph') {
        setGraphType('StackedBarGraph');
      }
      if (['AreaGraph', 'DonutGraph'].includes(customReportItems.graphType)) {
        setGraphType('TableGraph');
        onChangeViews('viewLegend', false);
      }
      if (['Month', 'Year'].includes(customReportItems.groupBy)) {
        setGroupBy('Category');
      }
    } else {
      if (customReportItems.graphType === 'StackedBarGraph') {
        setGraphType('BarGraph');
      } else {
        setTypeDisabled([]);
      }
    }
  };

  const onChangeSplit = cond => {
    setGroupBy(cond);
    if (customReportItems.mode === 'total') {
      if (customReportItems.graphType !== 'TableGraph') {
        setTypeDisabled(
          !['Month', 'Year'].includes(customReportItems.groupBy) ? [] : ['Net'],
        );
      }
    }
    if (
      ['Net'].includes(customReportItems.balanceType) &&
      customReportItems.graphType !== 'TableGraph'
    ) {
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
            selected={customReportItems.mode === 'total'}
            onSelect={() => onChangeMode('total')}
          >
            Total
          </ModeButton>
          <ModeButton
            selected={customReportItems.mode === 'time'}
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
            value={customReportItems.groupBy}
            onChange={e => onChangeSplit(e)}
            options={ReportOptions.groupBy.map(option => [
              option.description,
              option.description,
            ])}
            disabledKeys={
              customReportItems.mode === 'time'
                ? ['Month', 'Year']
                : customReportItems.graphType === 'AreaGraph'
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
            value={customReportItems.balanceType}
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
            checked={customReportItems.showEmpty}
            value={customReportItems.showEmpty}
            onChange={() => setShowEmpty(!customReportItems.showEmpty)}
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
            checked={customReportItems.showOffBudgetHidden}
            value={customReportItems.showOffBudgetHidden}
            onChange={() =>
              setShowOffBudgetHidden(!customReportItems.showOffBudgetHidden)
            }
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
            checked={customReportItems.showUncategorized}
            value={customReportItems.showUncategorized}
            onChange={() =>
              setShowUncategorized(!customReportItems.showUncategorized)
            }
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
            selected={!customReportItems.isDateStatic}
            onSelect={() => {
              setIsDateStatic(false);
              onSelectRange(customReportItems.dateRange);
            }}
          >
            Live
          </ModeButton>
          <ModeButton
            selected={customReportItems.isDateStatic}
            onSelect={() => {
              setIsDateStatic(true);
              onChangeDates(
                customReportItems.startDate,
                customReportItems.endDate,
              );
            }}
          >
            Static
          </ModeButton>
        </View>
        {!customReportItems.isDateStatic ? (
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
              value={customReportItems.dateRange}
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
                  onChangeDates(
                    ...validateStart(
                      allMonths,
                      newValue,
                      customReportItems.endDate,
                    ),
                  )
                }
                value={customReportItems.startDate}
                defaultLabel={monthUtils.format(
                  customReportItems.startDate,
                  'MMMM, yyyy',
                )}
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
                  onChangeDates(
                    ...validateEnd(
                      allMonths,
                      customReportItems.startDate,
                      newValue,
                    ),
                  )
                }
                value={customReportItems.endDate}
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
      {['Category', 'Group'].includes(customReportItems.groupBy) && (
        <View
          style={{
            marginTop: 10,
            minHeight: 200,
          }}
        >
          <CategorySelector
            categoryGroups={categories.grouped}
            categories={categories.list}
            selectedCategories={customReportItems.selectedCategories}
            setSelectedCategories={setSelectedCategories}
          />
        </View>
      )}
    </View>
  );
}
