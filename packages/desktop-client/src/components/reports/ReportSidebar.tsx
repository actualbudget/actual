import React, { useMemo, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Input } from '@actual-app/components/input';
import { Menu } from '@actual-app/components/menu';
import { ModeButton } from '@actual-app/components/mode-button';
import { Popover } from '@actual-app/components/popover';
import { Select } from '@actual-app/components/select';
import { SpaceBetween } from '@actual-app/components/space-between';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';
import type {
  CategoryEntity,
  CategoryGroupEntity,
  CustomReportComparison,
  CustomReportComparisonSortAmount,
  CustomReportEntity,
  CustomReportTagScope,
  sortByOpType,
  TagEntity,
  TimeFrame,
  TransactionEntity,
} from '@actual-app/core/types/models';
import type { SyncedPrefs } from '@actual-app/core/types/prefs';

import { Information } from '#components/alerts';
import { LabeledCheckbox } from '#components/forms/LabeledCheckbox';
import { useFeatureFlag } from '#hooks/useFeatureFlag';

import { CategorySelector } from './CategorySelector';
import {
  canShowComparisonChanges,
  canUseBudgetedComparison,
  defaultComparison,
  getComparisonRange,
  getComparisonShift,
  getComparisonSortAmount,
  isOffsetComparison,
  isOffsetOverlapping,
  rangesOverlap,
  shiftRange,
} from './comparisonRange';
import { defaultsList, disabledList } from './disabledList';
import { getLiveRange } from './getLiveRange';
import { useFormatComparisonWindow } from './graphs/useFormatComparisonWindow';
import { ReportDateFilter } from './ReportDateFilter';
import { ReportOptions } from './ReportOptions';
import type { dateRangeProps } from './ReportOptions';
import { setSessionReport } from './setSessionReport';
import { TagScopeSelector } from './TagScopeSelector';

type ReportSidebarProps = {
  customReportItems: CustomReportEntity;
  selectedCategories: CategoryEntity[];
  categories: { list: CategoryEntity[]; grouped: CategoryGroupEntity[] };
  tags: TagEntity[];
  dateRangeLine: number;
  allIntervals: { name: string; pretty: string }[];
  setDateRange: (value: CustomReportEntity['dateRange']) => void;
  setGraphType: (value: CustomReportEntity['graphType']) => void;
  setGroupBy: (value: CustomReportEntity['groupBy']) => void;
  setTagScope: (value: CustomReportTagScope) => void;
  setInterval: (value: CustomReportEntity['interval']) => void;
  setBalanceType: (value: CustomReportEntity['balanceType']) => void;
  setSortBy: (value: CustomReportEntity['sortBy']) => void;
  setMode: (value: CustomReportEntity['mode']) => void;
  setIsDateStatic: (value: CustomReportEntity['isDateStatic']) => void;
  setShowEmpty: (value: CustomReportEntity['showEmpty']) => void;
  setShowOffBudget: (value: CustomReportEntity['showOffBudget']) => void;
  setShowHiddenCategories: (
    value: CustomReportEntity['showHiddenCategories'],
  ) => void;
  setShowUncategorized: (
    value: CustomReportEntity['showUncategorized'],
  ) => void;
  setTrimIntervals: (value: CustomReportEntity['trimIntervals']) => void;
  setShowTrendLines: (value: CustomReportEntity['showTrendLines']) => void;
  setComparison: (value: CustomReportComparison) => void;
  setIncludeCurrentInterval: (
    value: CustomReportEntity['includeCurrentInterval'],
  ) => void;
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
  earliestTransaction: TransactionEntity['date'];
  latestTransaction: TransactionEntity['date'];
  firstDayOfWeekIdx: SyncedPrefs['firstDayOfWeekIdx'];
  isComplexCategoryCondition?: boolean;
};

function isRangeUnavailable(dateRange: string, interval: string) {
  return ReportOptions.dateRange
    .filter(d => !d[interval as keyof dateRangeProps])
    .map(int => int.key)
    .includes(dateRange);
}

export function ReportSidebar({
  customReportItems,
  selectedCategories,
  categories,
  tags,
  dateRangeLine,
  allIntervals,
  setDateRange,
  setGraphType,
  setGroupBy,
  setTagScope,
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
  setTrimIntervals,
  setShowTrendLines,
  setComparison,
  setSelectedCategories,
  onChangeDates,
  onReportChange,
  disabledItems,
  defaultItems,
  defaultModeItems,
  earliestTransaction,
  latestTransaction,
  firstDayOfWeekIdx,
  isComplexCategoryCondition = false,
}: ReportSidebarProps) {
  const { t } = useTranslation();
  const reportComparisonEnabled = useFeatureFlag('reportComparison');
  const savedComparison = customReportItems.comparison ?? defaultComparison;
  // Live comparisons are resolved against today, since saved dates go stale
  const [comparisonStartDate, comparisonEndDate] = getComparisonRange(
    savedComparison,
    earliestTransaction,
    latestTransaction,
    firstDayOfWeekIdx,
  );
  const comparison = {
    ...savedComparison,
    startDate: comparisonStartDate,
    endDate: comparisonEndDate,
  };
  const isComparisonEnabled = reportComparisonEnabled && comparison.enabled;
  // Comparison options only show as ticked where they apply, keeping the saved
  // choice for when the graph switches back
  const canShowChanges = canShowComparisonChanges(customReportItems.graphType);
  const isShowingChanges = canShowChanges && !!comparison.showChanges;
  // Sorting by name or budget doesn't look at amounts
  const canSortByAmount =
    customReportItems.sortBy === 'asc' || customReportItems.sortBy === 'desc';
  const sortAmount = getComparisonSortAmount(comparison, !isShowingChanges);
  const sortAmountOptions: [CustomReportComparisonSortAmount, string][] = [
    ['current', t('Current')],
    ['comparison', t('Comparison')],
    ['change', t('Change')],
  ];
  const isOffset = isOffsetComparison(comparison);
  const comparisonShift = getComparisonShift(
    comparison,
    customReportItems.interval,
    [customReportItems.startDate, customReportItems.endDate],
  );
  const formatComparisonWindow = useFormatComparisonWindow();
  const canUseBudgeted = canUseBudgetedComparison(customReportItems.groupBy);
  const comparisonSource = comparison.source ?? 'actual';

  const [menuOpen, setMenuOpen] = useState(false);
  const [offsetCountDraft, setOffsetCountDraft] = useState<string | null>(null);
  const triggerRef = useRef(null);

  const onSelectRange = (cond: string) => {
    setSessionReport('dateRange', cond);
    onReportChange({ type: 'modify' });
    setDateRange(cond);
    onChangeDates(
      ...getLiveRange(
        cond,
        earliestTransaction,
        latestTransaction,
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

  // Live dates are resolved on every change so a static switch keeps them
  const updateComparison = (next: CustomReportComparison) => {
    const [startDate, endDate] = getComparisonRange(
      next,
      earliestTransaction,
      latestTransaction,
      firstDayOfWeekIdx,
    );
    const resolved = { ...next, startDate, endDate };
    setSessionReport('comparison', resolved);
    onReportChange({ type: 'modify' });
    setComparison(resolved);
  };

  // Projection only changes anything while the report's range runs past today
  const canProjectToFullPeriod =
    customReportItems.balanceType !== 'Budgeted' &&
    customReportItems.endDate > monthUtils.currentDay();

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
    // Budgets only exist per category, so other splits compare against what
    // was spent
    if (comparisonSource === 'budgeted' && !canUseBudgetedComparison(cond)) {
      updateComparison({ ...comparison, source: 'actual' });
    }
  };

  const onChangeTagScope = (scope: CustomReportTagScope) => {
    setSessionReport('tagScope', scope);
    onReportChange({ type: 'modify' });
    setTagScope(scope);
  };

  const onChangeBalanceType = (cond: string) => {
    setSessionReport('balanceType', cond);
    onReportChange({ type: 'modify' });
    setBalanceType(cond);

    if (cond === 'Budgeted') {
      // Budgeted does not support Payee, Account, or Tag splits
      if (
        customReportItems.groupBy === 'Payee' ||
        customReportItems.groupBy === 'Account' ||
        customReportItems.groupBy === 'Tag'
      ) {
        setSessionReport('groupBy', 'Category');
        setGroupBy('Category');
        defaultItems('Category');
      }
      // Budgeted only supports Monthly, Quarterly and Yearly intervals
      if (
        customReportItems.interval === 'Daily' ||
        customReportItems.interval === 'Weekly'
      ) {
        setSessionReport('interval', 'Monthly');
        setInterval('Monthly');
        if (isRangeUnavailable(customReportItems.dateRange, 'Monthly')) {
          onSelectRange(defaultsList.intervalRange.get('Monthly') || '');
        }
      }
    }
  };

  const onChangeSortBy = (cond?: sortByOpType) => {
    cond ??= 'desc';
    setSessionReport('sortBy', cond);
    onReportChange({ type: 'modify' });
    setSortBy(cond);
  };

  const disableSort =
    customReportItems.graphType !== 'TableGraph' &&
    (customReportItems.groupBy === 'Interval' ||
      (disabledList?.mode
        ?.find(m => m.description === customReportItems.mode)
        ?.graphs.find(g => g.description === customReportItems.graphType)
        ?.disableSort ??
        false));

  const comparisonOffsetRows = (
    <>
      <View
        style={{
          flexDirection: 'row',
          padding: 5,
          alignItems: 'center',
        }}
      >
        <Text style={{ width: 50, textAlign: 'right', marginRight: 5 }}>
          <Trans>Offset:</Trans>
        </Text>
        <Input
          type="number"
          min={1}
          step={1}
          aria-label={t('Offset')}
          // Shows what is typed until the field loses focus, then the saved
          // offset. Only whole, positive offsets are saved.
          value={
            offsetCountDraft ??
            String(comparison.offsetCount ?? defaultComparison.offsetCount)
          }
          onChangeValue={value => {
            setOffsetCountDraft(value);
            const offsetCount = Number(value);
            if (Number.isInteger(offsetCount) && offsetCount >= 1) {
              updateComparison({ ...comparison, offsetCount });
            }
          }}
          onUpdate={() => setOffsetCountDraft(null)}
          style={{ width: 60, marginRight: 5 }}
        />
        <Select
          value={comparison.offsetUnit ?? 'weeks'}
          onChange={offsetUnit =>
            updateComparison({ ...comparison, offsetUnit })
          }
          options={[
            ['days', t('days')],
            ['weeks', t('weeks')],
            ['months', t('months')],
            ['years', t('years')],
            ['intervals', t('intervals')],
            ['ranges', t('date ranges')],
          ]}
        />
      </View>
      <Text
        style={{
          padding: '0 5px 5px 60px',
          color: theme.pageTextSubdued,
        }}
      >
        {formatComparisonWindow(
          ...shiftRange(
            customReportItems.startDate,
            customReportItems.endDate,
            comparisonShift,
          ),
        )}
      </Text>
    </>
  );

  const comparisonSourceRow = (
    <SpaceBetween gap={5} style={{ padding: 5 }}>
      <Text style={{ width: 50, textAlign: 'right' }}>
        <Trans>Source:</Trans>
      </Text>
      <ModeButton
        selected={comparisonSource === 'actual'}
        onSelect={() => updateComparison({ ...comparison, source: 'actual' })}
      >
        <Trans>Actual</Trans>
      </ModeButton>
      <Tooltip
        placement="bottom start"
        content={
          <Text>
            <Trans>
              Budgets are only set for categories, so a budgeted comparison
              needs a Category, Group or Interval split.
            </Trans>
          </Text>
        }
        style={{ ...styles.tooltip, lineHeight: 1.5 }}
        triggerProps={{ isDisabled: canUseBudgeted }}
      >
        <ModeButton
          selected={comparisonSource === 'budgeted'}
          isDisabled={!canUseBudgeted}
          onSelect={() =>
            updateComparison({ ...comparison, source: 'budgeted' })
          }
        >
          <Trans>Budgeted</Trans>
        </ModeButton>
      </Tooltip>
    </SpaceBetween>
  );

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
        {reportComparisonEnabled && (
          // Lines up with the controls beside the 50px row labels
          <View style={{ padding: '0 5px 0 60px' }}>
            <LabeledCheckbox
              id="comparison-enabled"
              checked={comparison.enabled}
              onChange={() =>
                updateComparison({
                  ...comparison,
                  enabled: !comparison.enabled,
                })
              }
            >
              <Trans>Add a comparison</Trans>
            </LabeledCheckbox>
            {isComparisonEnabled && (
              <Tooltip
                placement="bottom start"
                content={
                  <Text>
                    <Trans>
                      Draw how much each amount changed from the comparison,
                      instead of the amount with the comparison drawn in.
                    </Trans>
                  </Text>
                }
                style={{ ...styles.tooltip, lineHeight: 1.5 }}
              >
                <LabeledCheckbox
                  id="comparison-show-changes"
                  checked={isShowingChanges}
                  disabled={!canShowChanges}
                  onChange={() =>
                    updateComparison({
                      ...comparison,
                      showChanges: !comparison.showChanges,
                    })
                  }
                >
                  <Trans>Show as change from comparison</Trans>
                </LabeledCheckbox>
              </Tooltip>
            )}
          </View>
        )}

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
            disabledKeys={
              customReportItems.balanceType === 'Budgeted'
                ? [
                    ...new Set([
                      ...disabledItems('split'),
                      'Payee',
                      'Account',
                      'Tag',
                    ]),
                  ]
                : disabledItems('split')
            }
            style={{ minWidth: 0 }}
          />
          {customReportItems.groupBy === 'Tag' && (
            <View style={{ marginLeft: 5, minWidth: 0 }}>
              <TagScopeSelector
                tags={tags}
                tagScope={customReportItems.tagScope}
                onChange={onChangeTagScope}
              />
            </View>
          )}
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
              if (isRangeUnavailable(customReportItems.dateRange, e)) {
                onSelectRange(defaultsList.intervalRange.get(e) || '');
              }
            }}
            options={ReportOptions.interval.map(option => [
              option.key,
              option.description,
            ])}
            disabledKeys={
              customReportItems.balanceType === 'Budgeted'
                ? ['Daily', 'Weekly']
                : []
            }
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
        {!disableSort && isComparisonEnabled && canSortByAmount && (
          <View
            style={{
              flexDirection: 'row',
              padding: 5,
              alignItems: 'center',
            }}
          >
            <Text style={{ width: 50, textAlign: 'right', marginRight: 5 }}>
              <Trans>By:</Trans>
            </Text>
            <Select
              value={sortAmount}
              onChange={sortAmount =>
                updateComparison({ ...comparison, sortAmount })
              }
              options={sortAmountOptions}
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
                } else if (type === 'trim-intervals') {
                  setSessionReport(
                    'trimIntervals',
                    !customReportItems.trimIntervals,
                  );
                  setTrimIntervals(!customReportItems.trimIntervals);
                } else if (type === 'show-trend-lines') {
                  setSessionReport(
                    'showTrendLines',
                    !customReportItems.showTrendLines,
                  );
                  setShowTrendLines(!customReportItems.showTrendLines);
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
                {
                  name: 'trim-intervals',
                  text: t('Trim intervals'),
                  tooltip: t(
                    'Trim empty intervals at the start and end of the report',
                  ),
                  toggle: customReportItems.trimIntervals,
                },
                {
                  name: 'show-trend-lines',
                  text: t('Show trend lines'),
                  tooltip: t('Add a trend line per series (line graphs only)'),
                  toggle: customReportItems.showTrendLines,
                  disabled: customReportItems.graphType !== 'LineGraph',
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
        <ReportDateFilter
          title={<Trans>Date filters</Trans>}
          interval={customReportItems.interval}
          dateRange={customReportItems.dateRange}
          isDateStatic={customReportItems.isDateStatic}
          startDate={customReportItems.startDate}
          endDate={customReportItems.endDate}
          includeCurrentInterval={customReportItems.includeCurrentInterval}
          dateRangeLine={dateRangeLine}
          allIntervals={allIntervals}
          earliestTransaction={earliestTransaction}
          latestTransaction={latestTransaction}
          firstDayOfWeekIdx={firstDayOfWeekIdx}
          onSelectRange={onSelectRange}
          onChangeDates={(dateStart, dateEnd) =>
            onChangeDates(dateStart, dateEnd, 'static')
          }
          onChangeStatic={isDateStatic => {
            setSessionReport('isDateStatic', isDateStatic);
            setIsDateStatic(isDateStatic);
            if (isDateStatic) {
              onChangeDates(
                customReportItems.startDate,
                customReportItems.endDate,
                'static',
              );
            } else {
              onSelectRange(customReportItems.dateRange);
            }
          }}
        >
          {isComparisonEnabled && (
            <View style={{ padding: '5px 5px 0 10px' }}>
              <Tooltip
                placement="bottom start"
                content={
                  <Text>
                    <Trans>
                      Project the amounts so far over the whole date range,
                      based on how many days have passed.
                    </Trans>
                  </Text>
                }
                style={{ ...styles.tooltip, lineHeight: 1.5 }}
              >
                <LabeledCheckbox
                  id="comparison-project-full-period"
                  checked={comparison.projectToFullPeriod}
                  disabled={!canProjectToFullPeriod}
                  onChange={() =>
                    updateComparison({
                      ...comparison,
                      projectToFullPeriod: !comparison.projectToFullPeriod,
                    })
                  }
                >
                  <Trans>Project to full period</Trans>
                </LabeledCheckbox>
              </Tooltip>
            </View>
          )}
        </ReportDateFilter>
        {isComparisonEnabled && (
          <>
            <View
              style={{
                height: 1,
                backgroundColor: theme.pillBorderDark,
                marginTop: 10,
                flexShrink: 0,
              }}
            />
            <ReportDateFilter
              title={<Trans>Comparison</Trans>}
              offset={{
                selected: isOffset,
                onSelect: () =>
                  updateComparison({ ...comparison, mode: 'offset' }),
                content: comparisonOffsetRows,
              }}
              interval={customReportItems.interval}
              dateRange={comparison.dateRange}
              isDateStatic={comparison.isDateStatic}
              startDate={comparison.startDate}
              endDate={comparison.endDate}
              includeCurrentInterval={comparison.includeCurrentInterval}
              // Only the comparison's totals are used, so any interval can
              // compare against any range
              offerAllRanges
              dateRangeLine={ReportOptions.dateRange.length - 3}
              allIntervals={allIntervals}
              earliestTransaction={earliestTransaction}
              latestTransaction={latestTransaction}
              firstDayOfWeekIdx={firstDayOfWeekIdx}
              onSelectRange={dateRange =>
                updateComparison({ ...comparison, dateRange })
              }
              onChangeDates={(startDate, endDate) =>
                updateComparison({ ...comparison, startDate, endDate })
              }
              onChangeStatic={isDateStatic =>
                updateComparison({ ...comparison, mode: 'range', isDateStatic })
              }
            >
              {comparisonSourceRow}
              {isOffset ? (
                <>
                  {/* Only calendar months make windows of different lengths,
                      and budgets are set per month whatever their length */}
                  {comparisonShift.unit === 'months' &&
                    comparisonSource === 'actual' && (
                      <View style={{ padding: '5px 5px 0 10px' }}>
                        <LabeledCheckbox
                          id="comparison-daily-average"
                          checked={!!comparison.compareDailyAverage}
                          onChange={() =>
                            updateComparison({
                              ...comparison,
                              compareDailyAverage:
                                !comparison.compareDailyAverage,
                            })
                          }
                        >
                          <Trans>Compare daily averages</Trans>
                        </LabeledCheckbox>
                      </View>
                    )}
                  {isOffsetOverlapping(
                    comparisonShift,
                    customReportItems.interval,
                  ) && (
                    <Information style={{ marginTop: 5 }}>
                      <Trans>
                        The offset is shorter than an interval, so some
                        transactions count towards both an interval and its
                        comparison.
                      </Trans>
                    </Information>
                  )}
                </>
              ) : (
                <>
                  <View style={{ padding: '5px 5px 0 10px' }}>
                    <LabeledCheckbox
                      id="comparison-include-current"
                      checked={comparison.includeCurrentInterval}
                      disabled={
                        comparison.isDateStatic ||
                        disabledList.currentInterval.get(comparison.dateRange)
                      }
                      onChange={() =>
                        updateComparison({
                          ...comparison,
                          includeCurrentInterval:
                            !comparison.includeCurrentInterval,
                        })
                      }
                    >
                      <Trans>Include current period</Trans>
                    </LabeledCheckbox>
                  </View>
                  {rangesOverlap(
                    [customReportItems.startDate, customReportItems.endDate],
                    [comparison.startDate, comparison.endDate],
                  ) && (
                    <Information style={{ marginTop: 5 }}>
                      <Trans>
                        The comparison overlaps the report's date range, so some
                        transactions count towards both.
                      </Trans>
                    </Information>
                  )}
                </>
              )}
              {/* Only these balance types count income categories */}
              {comparisonSource === 'budgeted' &&
                ['Deposit', 'Net', 'Net Deposit'].includes(
                  customReportItems.balanceType,
                ) && (
                  <Information style={{ marginTop: 5 }}>
                    <Trans>
                      Income isn't budgeted, so the comparison counts it as
                      zero.
                    </Trans>
                  </Information>
                )}
            </ReportDateFilter>
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
