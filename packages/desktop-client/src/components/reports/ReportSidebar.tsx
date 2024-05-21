import React, { useState } from 'react';

import * as monthUtils from 'loot-core/src/shared/months';
import { type CategoryEntity } from 'loot-core/types/models/category';
import { type CategoryGroupEntity } from 'loot-core/types/models/category-group';
import { type CustomReportEntity } from 'loot-core/types/models/reports';
import { type LocalPrefs } from 'loot-core/types/prefs';

import { theme } from '../../style/theme';
import { Button } from '../common/Button';
import { Menu } from '../common/Menu';
import { Select } from '../common/Select';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { Tooltip } from '../tooltips';

import { CategorySelector } from './CategorySelector';
import { defaultsList } from './disabledList';
import { getLiveRange } from './getLiveRange';
import { ModeButton } from './ModeButton';
import { type dateRangeProps, ReportOptions } from './ReportOptions';
import { validateEnd, validateStart } from './reportRanges';
import { setSessionReport } from './setSessionReport';

type ReportSidebarProps = {
  customReportItems: CustomReportEntity;
  categories: { list: CategoryEntity[]; grouped: CategoryGroupEntity[] };
  dateRangeLine: number;
  allIntervals: { name: string; pretty: string }[];
  setDateRange: (value: string) => void;
  setGraphType: (value: string) => void;
  setGroupBy: (value: string) => void;
  setInterval: (value: string) => void;
  setBalanceType: (value: string) => void;
  setMode: (value: string) => void;
  setIsDateStatic: (value: boolean) => void;
  setShowEmpty: (value: boolean) => void;
  setShowOffBudget: (value: boolean) => void;
  setShowHiddenCategories: (value: boolean) => void;
  setShowUncategorized: (value: boolean) => void;
  setSelectedCategories: (value: CategoryEntity[]) => void;
  onChangeDates: (dateStart: string, dateEnd: string) => void;
  onReportChange: ({
    savedReport,
    type,
  }: {
    savedReport?: CustomReportEntity;
    type: string;
  }) => void;
  disabledItems: (type: string) => string[];
  defaultItems: (item: string) => void;
  defaultModeItems: (graph: string, item: string) => void;
  earliestTransaction: string;
  firstDayOfWeekIdx: LocalPrefs['firstDayOfWeekIdx'];
};

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
  firstDayOfWeekIdx,
}: ReportSidebarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const onSelectRange = (cond: string) => {
    setSessionReport('dateRange', cond);
    onReportChange({ type: 'modify' });
    setDateRange(cond);
    onChangeDates(
      ...getLiveRange(cond, earliestTransaction, firstDayOfWeekIdx),
    );
  };

  const onChangeMode = (cond: string) => {
    setSessionReport('mode', cond);
    onReportChange({ type: 'modify' });
    setMode(cond);
    let graph = '';
    if (cond === 'time') {
      if (customReportItems.graphType === 'BarGraph') {
        setSessionReport('graphType', 'StackedBarGraph');
        setGraphType('StackedBarGraph');
        graph = 'StackedBarGraph';
      }
    } else {
      if (customReportItems.graphType === 'StackedBarGraph') {
        setSessionReport('graphType', 'BarGraph');
        setGraphType('BarGraph');
        graph = 'BarGraph';
      }
    }
    defaultModeItems(graph, cond);
  };

  const onChangeSplit = (cond: string) => {
    setSessionReport('groupBy', cond);
    onReportChange({ type: 'modify' });
    setGroupBy(cond);
    defaultItems(cond);
  };

  const onChangeBalanceType = (cond: string) => {
    setSessionReport('balanceType', cond);
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
              setSessionReport('interval', e);
              setInterval(e);
              onReportChange({ type: 'modify' });
              if (
                ReportOptions.dateRange
                  .filter(d => !d[e as keyof dateRangeProps])
                  .map(int => int.description)
                  .includes(customReportItems.dateRange)
              ) {
                onSelectRange(defaultsList.intervalRange.get(e) || '');
              }
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
                      setSessionReport(
                        'showHiddenCategories',
                        !customReportItems.showHiddenCategories,
                      );
                      setShowHiddenCategories(
                        !customReportItems.showHiddenCategories,
                      );
                    } else if (type === 'show-off-budget') {
                      setSessionReport(
                        'showOffBudget',
                        !customReportItems.showOffBudget,
                      );
                      setShowOffBudget(!customReportItems.showOffBudget);
                    } else if (type === 'show-empty-items') {
                      setSessionReport(
                        'showEmpty',
                        !customReportItems.showEmpty,
                      );
                      setShowEmpty(!customReportItems.showEmpty);
                    } else if (type === 'show-uncategorized') {
                      setSessionReport(
                        'showUncategorized',
                        !customReportItems.showUncategorized,
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
              setSessionReport('isDateStatic', false);
              setIsDateStatic(false);
              onSelectRange(customReportItems.dateRange);
            }}
          >
            Live
          </ModeButton>
          <ModeButton
            selected={customReportItems.isDateStatic}
            onSelect={() => {
              setSessionReport('isDateStatic', true);
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
                .filter(
                  f => f[customReportItems.interval as keyof dateRangeProps],
                )
                .map(option => [option.description, option.description])}
              line={dateRangeLine > 0 ? dateRangeLine : undefined}
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
                      firstDayOfWeekIdx,
                    ),
                  )
                }
                value={customReportItems.startDate}
                defaultLabel={monthUtils.format(
                  customReportItems.startDate,
                  ReportOptions.intervalFormat.get(
                    customReportItems.interval,
                  ) || '',
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
                      firstDayOfWeekIdx,
                    ),
                  )
                }
                value={customReportItems.endDate}
                defaultLabel={monthUtils.format(
                  customReportItems.endDate,
                  ReportOptions.intervalFormat.get(
                    customReportItems.interval,
                  ) || '',
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
          selectedCategories={customReportItems.selectedCategories || []}
          setSelectedCategories={e => {
            setSelectedCategories(e);
            onReportChange({ type: 'modify' });
          }}
          showHiddenCategories={customReportItems.showHiddenCategories}
        />
      </View>
    </View>
  );
}
