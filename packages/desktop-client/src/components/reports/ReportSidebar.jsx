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
import { ModeButton } from './ModeButton';
import { ReportOptions } from './ReportOptions';
import {
  getSpecificRange,
  validateEnd,
  validateRange,
  validateStart,
} from './reportRanges';

export function ReportSidebar({
  customReportItems,
  categories,
  dateRangeLine,
  allIntervals,
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
  earliestTransaction,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const onSelectRange = cond => {
    const storedReport = JSON.parse(sessionStorage.getItem('report'));
    sessionStorage.setItem(
      'report',
      JSON.stringify({ ...storedReport, dateRange: cond }),
    );
    onReportChange({ type: 'modify' });
    setDateRange(cond);
    let dateStart;
    let dateEnd;
    switch (cond) {
      case 'All time':
        onChangeDates(earliestTransaction, monthUtils.currentDay());
        break;
      case 'Year to date':
        [dateStart, dateEnd] = validateRange(
          earliestTransaction,
          monthUtils.getYearStart(monthUtils.currentMonth()) + '-01',
          monthUtils.currentDay(),
        );
        onChangeDates(dateStart, dateEnd);
        break;
      case 'Last year':
        [dateStart, dateEnd] = validateRange(
          earliestTransaction,
          monthUtils.getYearStart(
            monthUtils.prevYear(monthUtils.currentMonth()),
          ) + '-01',
          monthUtils.getYearEnd(monthUtils.prevYear(monthUtils.currentDate())) +
            '-31',
        );
        onChangeDates(dateStart, dateEnd);
        break;
      default:
        [dateStart, dateEnd] = getSpecificRange(
          ReportOptions.dateRangeMap.get(cond),
          cond === 'Last month' ? 0 : null,
          customReportItems.interval,
        );
        onChangeDates(dateStart, dateEnd);
    }
  };

  const onChangeMode = cond => {
    const storedReport = JSON.parse(sessionStorage.getItem('report'));
    sessionStorage.setItem(
      'report',
      JSON.stringify({ ...storedReport, mode: cond }),
    );
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
    const storedReport = JSON.parse(sessionStorage.getItem('report'));
    sessionStorage.setItem(
      'report',
      JSON.stringify({ ...storedReport, groupBy: cond }),
    );
    onReportChange({ type: 'modify' });
    setGroupBy(cond);
    defaultItems(cond);
  };

  const onChangeBalanceType = cond => {
    const storedReport = JSON.parse(sessionStorage.getItem('report'));
    sessionStorage.setItem(
      'report',
      JSON.stringify({ ...storedReport, balanceType: cond }),
    );
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
            disabledKeys={
              customReportItems.mode === 'time'
                ? ['Monthly', 'Yearly']
                : ['Yearly']
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
                    const storedReport = JSON.parse(
                      sessionStorage.getItem('report'),
                    );
                    onReportChange({ type: 'modify' });

                    if (type === 'show-hidden-categories') {
                      sessionStorage.setItem(
                        'report',
                        JSON.stringify({
                          ...storedReport,
                          showHiddenCategories:
                            !customReportItems.showHiddenCategories,
                        }),
                      );
                      setShowHiddenCategories(
                        !customReportItems.showHiddenCategories,
                      );
                    } else if (type === 'show-off-budget') {
                      sessionStorage.setItem(
                        'report',
                        JSON.stringify({
                          ...storedReport,
                          showOffBudget: !customReportItems.showOffBudget,
                        }),
                      );
                      setShowOffBudget(!customReportItems.showOffBudget);
                    } else if (type === 'show-empty-items') {
                      sessionStorage.setItem(
                        'report',
                        JSON.stringify({
                          ...storedReport,
                          showEmpty: !customReportItems.showEmpty,
                        }),
                      );
                      setShowEmpty(!customReportItems.showEmpty);
                    } else if (type === 'show-uncategorized') {
                      sessionStorage.setItem(
                        'report',
                        JSON.stringify({
                          ...storedReport,
                          showUncategorized:
                            !customReportItems.showUncategorized,
                        }),
                      );
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
              const storedReport = JSON.parse(sessionStorage.getItem('report'));
              sessionStorage.setItem(
                'report',
                JSON.stringify({ ...storedReport, isDateStatic: false }),
              );
              setIsDateStatic(false);
              onSelectRange(customReportItems.dateRange);
            }}
          >
            Live
          </ModeButton>
          <ModeButton
            selected={customReportItems.isDateStatic}
            onSelect={() => {
              const storedReport = JSON.parse(sessionStorage.getItem('report'));
              sessionStorage.setItem(
                'report',
                JSON.stringify({ ...storedReport, isDateStatic: true }),
              );
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
              <Text style={{ width: 50, textAlign: 'right', marginRight: 5 }}>
                From:
              </Text>
              <Select
                onChange={newValue =>
                  onChangeDates(
                    ...validateStart(
                      earliestTransaction,
                      newValue,
                      customReportItems.endDate,
                      customReportItems.interval,
                    ),
                  )
                }
                value={customReportItems.startDate}
                defaultLabel={monthUtils.format(
                  customReportItems.startDate,
                  'MMMM, yyyy',
                )}
                options={allIntervals.map(({ name, pretty }) => [name, pretty])}
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
                      earliestTransaction,
                      customReportItems.startDate,
                      newValue,
                      customReportItems.interval,
                    ),
                  )
                }
                value={customReportItems.endDate}
                defaultLabel={monthUtils.format(
                  customReportItems.endDate,
                  'MMMM, yyyy',
                )}
                options={allIntervals.map(({ name, pretty }) => [name, pretty])}
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
