import React, { useState } from 'react';

import * as monthUtils from 'loot-core/src/shared/months';

import { theme } from '../../style';

import { Button } from '../common/Button';
import { Select } from '../common/Select';
import { Text } from '../common/Text';
import {ToggleMenu} from '../common/ToggleMenu';
import { View } from '../common/View';
import { Tooltip } from '../tooltips';

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
  startDate,
  endDate,
  onChangeDates,
  dateRange,
  setDateRange,
  dateRangeLine,
  allMonths,
  graphType,
  setGraphType,
  typeDisabled,
  setTypeDisabled,
  groupBy,
  setGroupBy,
  balanceType,
  setBalanceType,
  mode,
  setMode,
  isDateStatic,
  setIsDateStatic,
  showEmpty,
  setShowEmpty,
  showOffBudgetHidden,
  setShowOffBudgetHidden,
  showUncategorized,
  setShowUncategorized,
  categories,
  selectedCategories,
  setSelectedCategories,
  onChangeViews,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
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
      if (graphType === 'TableGraph') {
        setTypeDisabled([]);
      } else {
        setTypeDisabled(['Net']);
        if (['Net'].includes(balanceType)) {
          setBalanceType('Payment');
        }
      }
      if (graphType === 'BarGraph') {
        setGraphType('StackedBarGraph');
      }
      if (['AreaGraph', 'DonutGraph'].includes(graphType)) {
        setGraphType('TableGraph');
        onChangeViews('viewLegend', false);
      }
      if (['Month', 'Year'].includes(groupBy)) {
        setGroupBy('Category');
      }
    } else {
      if (graphType === 'StackedBarGraph') {
        setGraphType('BarGraph');
      } else {
        setTypeDisabled([]);
      }
    }
  };

  const onChangeSplit = cond => {
    setGroupBy(cond);
    if (mode === 'total') {
      if (graphType !== 'TableGraph') {
        setTypeDisabled(!['Month', 'Year'].includes(groupBy) ? [] : ['Net']);
      }
    }
    if (['Net'].includes(balanceType) && graphType !== 'TableGraph') {
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
            selected={mode === 'total'}
            onSelect={() => onChangeMode('total')}
          >
            Total
          </ModeButton>
          <ModeButton
            selected={mode === 'time'}
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
            value={groupBy}
            onChange={e => onChangeSplit(e)}
            options={ReportOptions.groupBy.map(option => [
              option.description,
              option.description,
            ])}
            disabledKeys={
              mode === 'time'
                ? ['Month', 'Year']
                : graphType === 'AreaGraph'
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
            value={balanceType}
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
          <Button
            onClick={() => {
              setMenuOpen(true);
            }}
            style={{ 
              color: 'currentColor', 
              padding: '5px 10px',
            }}
          >
            Options
            {menuOpen && (
              <Tooltip
                position="bottom-left"
                style={{ padding: 0 }}
                onClose={() => {
                  setMenuOpen(false);
                }}
              >
                <ToggleMenu
                  onMenuSelect={type => {
                    if (type === 'show-hidden-categories') {
                      setShowOffBudgetHidden(!showOffBudgetHidden);
                    } else if (type === 'show-empty-rows') {
                      setShowEmpty(!showEmpty);
                    } else if (type === 'show-uncategorized') {
                      setShowUncategorized(!showUncategorized);
                    }
                  }}
                  items={[
                    {
                      name: 'show-empty-rows',
                      text: 'Show Empty Rows',
                      tooltip: "Show rows that are zero or blank",
                      isOn: showEmpty,
                      toggle: true,
                    },
                    {
                      name: 'show-hidden-categories',
                      text: 'Show Off Budget',
                      tooltip: "Show off budget accounts and hidden categories",
                      isOn: showOffBudgetHidden,
                      toggle: true,
                    },
                    {
                      name: 'show-uncategorized',
                      text: 'Show Uncategorized',
                      tooltip: "Show uncategorized transactions",
                      isOn: showUncategorized,
                      toggle: true,
                    },
                  ]}
                />
              </Tooltip>
            )}
          </Button>
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
            selected={!isDateStatic}
            onSelect={() => {
              setIsDateStatic(false);
              onSelectRange(dateRange);
            }}
          >
            Live
          </ModeButton>
          <ModeButton
            selected={isDateStatic}
            onSelect={() => {
              setIsDateStatic(true);
              onChangeDates(startDate, endDate);
            }}
          >
            Static
          </ModeButton>
        </View>
        {!isDateStatic ? (
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
              value={dateRange}
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
                  onChangeDates(...validateStart(allMonths, newValue, endDate))
                }
                value={startDate}
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
                  onChangeDates(...validateEnd(allMonths, startDate, newValue))
                }
                value={endDate}
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
      {['Category', 'Group'].includes(groupBy) && (
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
