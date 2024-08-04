import React, { useMemo, useRef, useState, type ComponentProps } from 'react';

import * as monthUtils from 'loot-core/src/shared/months';
import { type CategoryEntity } from 'loot-core/types/models/category';
import { type CategoryGroupEntity } from 'loot-core/types/models/category-group';
import { type CustomReportEntity } from 'loot-core/types/models/reports';
import { type LocalPrefs } from 'loot-core/types/prefs';

import { styles } from '../../style/styles';
import { theme } from '../../style/theme';
import { Information } from '../alerts';
import { Button } from '../common/Button';
import { Menu } from '../common/Menu';
import { Popover } from '../common/Popover';
import { Select } from '../common/Select';
import { Text } from '../common/Text';
import { Tooltip } from '../common/Tooltip';
import { View } from '../common/View';

import { CategorySelector } from './CategorySelector';
import { defaultsList, disabledList } from './disabledList';
import { getLiveRange } from './getLiveRange';
import { ModeButton } from './ModeButton';
import { type dateRangeProps, ReportOptions } from './ReportOptions';
import { validateEnd, validateStart } from './reportRanges';
import { setSessionReport } from './setSessionReport';

type ReportSidebarProps = {
  customReportItems: CustomReportEntity;
  selectedCategories: CategoryEntity[];
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
  setIncludeCurrentInterval: (value: boolean) => void;
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
  isComplexCategoryCondition?: boolean;
};

export function ReportSidebar({
  customReportItems,
  selectedCategories,
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
  setIncludeCurrentInterval,
  setShowUncategorized,
  setSelectedCategories,
  onChangeDates,
  onReportChange,
  disabledItems,
  defaultItems,
  defaultModeItems,
  earliestTransaction,
  firstDayOfWeekIdx,
  isComplexCategoryCondition = false,
}: ReportSidebarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef(null);
  const onSelectRange = (cond: string) => {
    setSessionReport('dateRange', cond);
    onReportChange({ type: 'modify' });
    setDateRange(cond);
    onChangeDates(
      ...getLiveRange(
        cond,
        earliestTransaction,
        customReportItems.includeCurrentInterval,
        firstDayOfWeekIdx,
      ),
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

  const rangeOptions = useMemo(() => {
    const options: ComponentProps<typeof Select>['options'] =
      ReportOptions.dateRange
        .filter(f => f[customReportItems.interval as keyof dateRangeProps])
        .map(option => [option.description, option.description]);

    // Append separator if necessary
    if (dateRangeLine > 0) {
      options.splice(dateRangeLine, 0, Menu.line);
    }
    return options;
  }, [customReportItems, dateRangeLine]);

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
            ref={triggerRef}
            onClick={() => {
              setMenuOpen(true);
            }}
            style={{
              color: 'currentColor',
              padding: '5px 10px',
            }}
          >
            Options
          </Button>

          <Popover
            triggerRef={triggerRef}
            placement="bottom start"
            isOpen={menuOpen}
            onOpenChange={() => setMenuOpen(false)}
          >
            <Menu
              onMenuSelect={type => {
                onReportChange({ type: 'modify' });

                if (type === 'include-current-interval') {
                  setSessionReport(
                    'includeCurrentInterval',
                    !customReportItems.includeCurrentInterval,
                  );
                  setIncludeCurrentInterval(
                    !customReportItems.includeCurrentInterval,
                  );
                } else if (type === 'show-hidden-categories') {
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
                  setSessionReport('showEmpty', !customReportItems.showEmpty);
                  setShowEmpty(!customReportItems.showEmpty);
                } else if (type === 'show-uncategorized') {
                  setSessionReport(
                    'showUncategorized',
                    !customReportItems.showUncategorized,
                  );
                  setShowUncategorized(!customReportItems.showUncategorized);
                }
              }}
              items={[
                {
                  name: 'include-current-interval',
                  text:
                    'Include current ' +
                    (
                      ReportOptions.dateRangeType.get(
                        customReportItems.dateRange,
                      ) || ''
                    ).toLowerCase(),
                  tooltip:
                    'Include current ' +
                    (
                      ReportOptions.dateRangeType.get(
                        customReportItems.dateRange,
                      ) || ''
                    ).toLowerCase() +
                    ' in live range',
                  toggle: customReportItems.includeCurrentInterval,
                  disabled:
                    customReportItems.isDateStatic ||
                    disabledList.currentInterval.get(
                      customReportItems.dateRange,
                    ),
                },
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
          </Popover>
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
              onChange={onSelectRange}
              options={rangeOptions}
            />
            {!disabledList.currentInterval.get(customReportItems.dateRange) &&
              customReportItems.includeCurrentInterval && (
                <Tooltip
                  placement="bottom start"
                  content={<Text>Current month</Text>}
                  style={{
                    ...styles.tooltip,
                    lineHeight: 1.5,
                    padding: '6px 10px',
                    marginTop: 5,
                  }}
                >
                  <Text style={{ marginLeft: 10 }}>+1</Text>
                </Tooltip>
              )}
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
        {isComplexCategoryCondition ? (
          <Information>
            Remove active category filters to show the category selector.
          </Information>
        ) : (
          <CategorySelector
            categoryGroups={categories.grouped.filter(f => {
              return customReportItems.showHiddenCategories || !f.hidden
                ? true
                : false;
            })}
            selectedCategories={selectedCategories || []}
            setSelectedCategories={e => {
              setSelectedCategories(e);
              onReportChange({ type: 'modify' });
            }}
            showHiddenCategories={customReportItems.showHiddenCategories}
          />
        )}
      </View>
    </View>
  );
}
