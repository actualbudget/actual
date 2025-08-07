import React, { useMemo, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Menu } from '@actual-app/components/menu';
import { Popover } from '@actual-app/components/popover';
import { Select, type SelectOption } from '@actual-app/components/select';
import { SpaceBetween } from '@actual-app/components/space-between';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';

import * as monthUtils from 'loot-core/shared/months';
import {
  type CategoryEntity,
  type CategoryGroupEntity,
  type TimeFrame,
  type CustomReportEntity,
  type sortByOpType,
} from 'loot-core/types/models';
import { type SyncedPrefs } from 'loot-core/types/prefs';

import { CategorySelector } from './CategorySelector';
import { defaultsList, disabledList } from './disabledList';
import { getLiveRange } from './getLiveRange';
import { ModeButton } from './ModeButton';
import { type dateRangeProps, ReportOptions } from './ReportOptions';
import { validateEnd, validateStart } from './reportRanges';
import { setSessionReport } from './setSessionReport';

import { Information } from '@desktop-client/components/alerts';
import { useLocale } from '@desktop-client/hooks/useLocale';

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
  setSortBy: (value: string) => void;
  setMode: (value: string) => void;
  setIsDateStatic: (value: boolean) => void;
  setShowEmpty: (value: boolean) => void;
  setShowOffBudget: (value: boolean) => void;
  setShowHiddenCategories: (value: boolean) => void;
  setShowUncategorized: (value: boolean) => void;
  setIncludeCurrentInterval: (value: boolean) => void;
  setSelectedCategories: (value: CategoryEntity[]) => void;
  onChangeDates: (
    dateStart: string,
    dateEnd: string,
    mode: TimeFrame['mode'],
  ) => void;
  onReportChange: ({ type }: { type: 'modify' }) => void;
  disabledItems: (type: string) => string[];
  defaultItems: (item: string) => void;
  defaultModeItems: (graph: string, item: string) => void;
  earliestTransaction: string;
  firstDayOfWeekIdx: SyncedPrefs['firstDayOfWeekIdx'];
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
  setSortBy,
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
  const { t } = useTranslation();
  const locale = useLocale();

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

  const [includeCurrentIntervalText, includeCurrentIntervalTooltip] =
    useMemo(() => {
      const rangeType = (
        ReportOptions.dateRangeType.get(customReportItems.dateRange) || ''
      ).toLowerCase();

      let text = t('Include current period');
      let tooltip = t('Include current period in live range');

      if (rangeType === 'month') {
        text = t('Include current Month');
        tooltip = t('Include current Month in live range');
      } else if (rangeType === 'year') {
        text = t('Include current Year');
        tooltip = t('Include current Year in live range');
      }

      return [text, tooltip];
    }, [customReportItems.dateRange, t]);

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

  const onChangeSortBy = (cond?: sortByOpType) => {
    cond ??= 'desc';
    setSessionReport('sortBy', cond);
    onReportChange({ type: 'modify' });
    setSortBy(cond);
  };

  const rangeOptions = useMemo(() => {
    const options: SelectOption[] = ReportOptions.dateRange
      .filter(f => f[customReportItems.interval as keyof dateRangeProps])
      .map(option => [option.key, option.description]);

    // Append separator if necessary
    if (dateRangeLine > 0) {
      options.splice(dateRangeLine, 0, Menu.line);
    }
    return options;
  }, [customReportItems, dateRangeLine]);

  const disableSort =
    customReportItems.graphType !== 'TableGraph' &&
    (customReportItems.groupBy === 'Interval' ||
      (disabledList?.mode
        ?.find(m => m.description === customReportItems.mode)
        ?.graphs.find(g => g.description === customReportItems.graphType)
        ?.disableSort ??
        false));

  return (
    <View
      style={{
        minWidth: 225,
        maxWidth: 250,
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
            <strong>
              <Trans>Display</Trans>
            </strong>
          </Text>
        </View>
        <SpaceBetween
          gap={5}
          style={{
            padding: 5,
          }}
        >
          <Text style={{ width: 50, textAlign: 'right' }}>
            <Trans>Mode:</Trans>
          </Text>
          <ModeButton
            selected={customReportItems.mode === 'total'}
            onSelect={() => onChangeMode('total')}
          >
            <Trans>Total</Trans>
          </ModeButton>
          <ModeButton
            selected={customReportItems.mode === 'time'}
            onSelect={() => onChangeMode('time')}
          >
            <Trans>Time</Trans>
          </ModeButton>
        </SpaceBetween>

        <View
          style={{
            flexDirection: 'row',
            padding: 5,
            alignItems: 'center',
          }}
        >
          <Text style={{ width: 50, textAlign: 'right', marginRight: 5 }}>
            <Trans>Split:</Trans>
          </Text>
          <Select
            value={customReportItems.groupBy}
            onChange={e => onChangeSplit(e)}
            options={ReportOptions.groupBy.map(option => [
              option.key,
              option.description,
            ])}
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
            <Trans>Type:</Trans>
          </Text>
          <Select
            value={customReportItems.balanceType}
            onChange={e => onChangeBalanceType(e)}
            options={ReportOptions.balanceType.map(option => [
              option.key,
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
            <Trans>Interval:</Trans>
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
                  .map(int => int.key)
                  .includes(customReportItems.dateRange)
              ) {
                onSelectRange(defaultsList.intervalRange.get(e) || '');
              }
            }}
            options={ReportOptions.interval.map(option => [
              option.key,
              option.description,
            ])}
            disabledKeys={[]}
          />
        </View>

        {!disableSort && (
          <View
            style={{
              flexDirection: 'row',
              padding: 5,
              alignItems: 'center',
            }}
          >
            <Text style={{ width: 50, textAlign: 'right', marginRight: 5 }}>
              <Trans>Sort:</Trans>
            </Text>
            <Select
              value={customReportItems.sortBy}
              onChange={(e?: sortByOpType) => onChangeSortBy(e)}
              options={ReportOptions.sortBy.map(option => [
                option.format,
                option.description,
              ])}
              disabledKeys={disabledItems('sort') as sortByOpType[]}
            />
          </View>
        )}

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
            onPress={() => {
              setMenuOpen(true);
            }}
            style={{
              color: 'currentColor',
              padding: '5px 10px',
            }}
          >
            <Trans>Options</Trans>
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
                  text: includeCurrentIntervalText,
                  tooltip: includeCurrentIntervalTooltip,
                  toggle: customReportItems.includeCurrentInterval,
                  disabled:
                    customReportItems.isDateStatic ||
                    disabledList.currentInterval.get(
                      customReportItems.dateRange,
                    ),
                },
                {
                  name: 'show-hidden-categories',
                  text: t('Show hidden categories'),
                  tooltip: t('Show hidden categories'),
                  toggle: customReportItems.showHiddenCategories,
                },
                {
                  name: 'show-empty-items',
                  text: t('Show empty rows'),
                  tooltip: t('Show rows that are zero or blank'),
                  toggle: customReportItems.showEmpty,
                },
                {
                  name: 'show-off-budget',
                  text: t('Show off budget'),
                  tooltip: t('Show off budget accounts'),
                  toggle: customReportItems.showOffBudget,
                },
                {
                  name: 'show-uncategorized',
                  text: t('Show uncategorized'),
                  tooltip: t('Show uncategorized transactions'),
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
        <SpaceBetween
          gap={5}
          style={{
            marginTop: 10,
            marginBottom: 5,
          }}
        >
          <Text>
            <strong>
              <Trans>Date filters</Trans>
            </strong>
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
            <Trans>Live</Trans>
          </ModeButton>
          <ModeButton
            selected={customReportItems.isDateStatic}
            onSelect={() => {
              setSessionReport('isDateStatic', true);
              setIsDateStatic(true);
              onChangeDates(
                customReportItems.startDate,
                customReportItems.endDate,
                'static',
              );
            }}
          >
            <Trans>Static</Trans>
          </ModeButton>
        </SpaceBetween>
        {!customReportItems.isDateStatic ? (
          <View
            style={{
              flexDirection: 'row',
              padding: 5,
              alignItems: 'center',
            }}
          >
            <Text style={{ width: 50, textAlign: 'right', marginRight: 5 }}>
              <Trans>Range:</Trans>
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
                  content={
                    <Text>
                      <Trans>Current month</Trans>
                    </Text>
                  }
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
                <Trans>From:</Trans>
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
                  locale,
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
                <Trans>To:</Trans>
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
                  locale,
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
            <Trans>
              Remove active category filters to show the category selector.
            </Trans>
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
