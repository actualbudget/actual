import React, { useState } from 'react';

import * as monthUtils from 'loot-core/src/shared/months';

import { theme } from '../../style';
import { Button } from '../common/Button';
import { Menu } from '../common/Menu';
import { Select } from '../common/Select';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { Tooltip } from '../tooltips';

import { CategorySelector } from './CategorySelector';
import {
  validateStart,
  validateEnd,
  getFullRange,
  validateRange,
  getSpecificRange,
} from './Header';
import { ModeButton } from './ModeButton';
import { ReportOptions } from './ReportOptions';

export function ReportSidebar({
  customReportItems,
  categories,
  dateRangeLine,
  allMonths,
  setDateRange,
  setGraphType,
  setGroupBy,
  setInterval,
  setBalanceType,
  setMode,
  setIsDateStatic,
  setShowEmpty,
  setShowOffBudget,
  setShowHiddenCategories,
  setShowUncategorized,
  setSelectedCategories,
  onChangeDates,
  onReportChange,
  disabledItems,
  defaultItems,
  defaultModeItems,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const onSelectRange = cond => {
    onReportChange({ type: 'modify' });
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
        onChangeDates(
          ...getSpecificRange(
            ReportOptions.dateRangeMap.get(cond),
            cond === 'Last month' ? 0 : null,
          ),
        );
    }
  };

  const onChangeMode = cond => {
    onReportChange({ type: 'modify' });
    setMode(cond);
    let graph;
    if (cond === 'time') {
      if (customReportItems.graphType === 'BarGraph') {
        setGraphType('StackedBarGraph');
        graph = 'StackedBarGraph';
      }
    } else {
      if (customReportItems.graphType === 'StackedBarGraph') {
        setGraphType('BarGraph');
        graph = 'BarGraph';
      }
    }
    defaultModeItems(graph, cond);
  };

  const onChangeSplit = cond => {
    onReportChange({ type: 'modify' });
    setGroupBy(cond);
    defaultItems(cond);
  };

  const onChangeBalanceType = cond => {
    onReportChange({ type: 'modify' });
    setBalanceType(cond);
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
          <Text style={{ width: 50, textAlign: 'right', marginRight: 5 }}>
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
          <Text style={{ width: 50, textAlign: 'right', marginRight: 5 }}>
            Split:
          </Text>
          <Select
            value={customReportItems.groupBy}
            onChange={e => onChangeSplit(e)}
            options={ReportOptions.groupBy.map(option => [option, option])}
            disabledKeys={disabledItems('split')}
          />
        </View>
        <View
          style={{
            flexDirection: 'row',
            padding: 5,
            alignItems: 'center',
          }}
        >
          <Text style={{ width: 50, textAlign: 'right', marginRight: 5 }}>
            Type:
          </Text>
          <Select
            value={customReportItems.balanceType}
            onChange={e => onChangeBalanceType(e)}
            options={ReportOptions.balanceType.map(option => [
              option.description,
              option.description,
            ])}
            disabledKeys={disabledItems('type')}
          />
        </View>
        <View
          style={{
            flexDirection: 'row',
            padding: 5,
            alignItems: 'center',
          }}
        >
          <Text style={{ width: 50, textAlign: 'right', marginRight: 5 }}>
            Interval:
          </Text>
          <Select
            value={customReportItems.interval}
            onChange={e => {
              setInterval(e);
              onReportChange({ type: 'modify' });
            }}
            options={ReportOptions.interval.map(option => [
              option.description,
              option.description,
            ])}
            disabledKeys={[]}
          />
        </View>
        <View
          style={{
            flexDirection: 'row',
            padding: 5,
            alignItems: 'center',
          }}
        >
          <Text style={{ width: 50, textAlign: 'right', marginRight: 5 }} />
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
                <Menu
                  onMenuSelect={type => {
                    onReportChange({ type: 'modify' });

                    if (type === 'show-hidden-categories') {
                      setShowHiddenCategories(
                        !customReportItems.showHiddenCategories,
                      );
                    } else if (type === 'show-off-budget') {
                      setShowOffBudget(!customReportItems.showOffBudget);
                    } else if (type === 'show-empty-items') {
                      setShowEmpty(!customReportItems.showEmpty);
                    } else if (type === 'show-uncategorized') {
                      setShowUncategorized(
                        !customReportItems.showUncategorized,
                      );
                    }
                  }}
                  items={[
                    {
                      name: 'show-hidden-categories',
                      text: 'Show hidden categories',
                      tooltip: 'Show hidden categories',
                      toggle: customReportItems.showHiddenCategories,
                    },
                    {
                      name: 'show-empty-items',
                      text: 'Show empty rows',
                      tooltip: 'Show rows that are zero or blank',
                      toggle: customReportItems.showEmpty,
                    },
                    {
                      name: 'show-off-budget',
                      text: 'Show off budget',
                      tooltip: 'Show off budget accounts',
                      toggle: customReportItems.showOffBudget,
                    },
                    {
                      name: 'show-uncategorized',
                      text: 'Show uncategorized',
                      tooltip: 'Show uncategorized transactions',
                      toggle: customReportItems.showUncategorized,
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
            <Text style={{ width: 50, textAlign: 'right', marginRight: 5 }}>
              Range:
            </Text>
            <Select
              value={customReportItems.dateRange}
              onChange={e => {
                onSelectRange(e);
              }}
              options={ReportOptions.dateRange
                .filter(f => f[customReportItems.interval])
                .map(option => [option.description, option.description])}
              line={customReportItems.interval === 'Monthly' && dateRangeLine}
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
              <Text style={{ width: 50, textAlign: 'right', marginRight: 5 }}>
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
              <Text style={{ width: 50, textAlign: 'right', marginRight: 5 }}>
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
            categoryGroups={categories.grouped.filter(f => {
              return customReportItems.showHiddenCategories || !f.hidden
                ? true
                : false;
            })}
            selectedCategories={customReportItems.selectedCategories}
            setSelectedCategories={e => {
              setSelectedCategories(e);
              onReportChange({ type: 'modify' });
            }}
            showHiddenCategories={customReportItems.showHiddenCategories}
          />
        </View>
      )}
    </View>
  );
}
