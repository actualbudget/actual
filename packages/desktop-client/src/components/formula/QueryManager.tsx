import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Dialog, DialogTrigger } from 'react-aria-components';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { DateRangePicker } from '@actual-app/components/date-range-picker';
import type { DateRangePreset } from '@actual-app/components/date-range-picker';
import { SvgCopy, SvgTrash } from '@actual-app/components/icons/v1';
import { SvgDownloadThickBottom } from '@actual-app/components/icons/v2';
import { Input } from '@actual-app/components/input';
import { Popover } from '@actual-app/components/popover';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import * as monthUtils from '@actual-app/core/shared/months';
import type {
  RuleConditionEntity,
  TimeFrame,
} from '@actual-app/core/types/models';

import { AppliedFilters } from '#components/filters/AppliedFilters';
import { FilterButton } from '#components/filters/FiltersMenu';
import { buildDateRangePresets } from '#components/reports/dateRangePresets';
import { clampMonthRangeToBounds } from '#components/reports/monthRange';
import {
  asMonthSlidingTimeFrame,
  calculateTimeRange,
} from '#components/reports/reportRanges';
import { useDateFormat } from '#hooks/useDateFormat';
import { useLanguage } from '#hooks/useLocale';
import { useRuleConditionFilters } from '#hooks/useRuleConditionFilters';
import { addNotification } from '#notifications/notificationsSlice';
import { useDispatch } from '#redux';
import type { AppDispatch } from '#redux/store';

import {
  normalizeQueryTimeFrameEnd,
  normalizeQueryTimeFrameStart,
} from './queryTimeFrame';

type QueryConfig = {
  conditions?: RuleConditionEntity[];
  conditionsOp?: 'and' | 'or';
  timeFrame?: TimeFrame;
};

export function normalizeMonthRangeForPicker(start: string, end: string) {
  return [monthUtils.getMonth(start), monthUtils.getMonth(end)] satisfies [
    string,
    string,
  ];
}

export function normalizeMonthPickerSelectionForQuery(
  start: string,
  end: string,
) {
  return [
    normalizeQueryTimeFrameStart(start),
    normalizeQueryTimeFrameEnd(end),
  ] satisfies [string, string];
}

export function shouldIgnoreMonthPickerNoop(
  startDate: string,
  endDate: string,
  nextStart: string,
  nextEnd: string,
) {
  const [currentStartMonth, currentEndMonth] = normalizeMonthRangeForPicker(
    startDate,
    endDate,
  );

  return currentStartMonth === nextStart && currentEndMonth === nextEnd;
}

export function canRenderDateRangePicker(
  isTransactionBoundsReady: boolean,
  earliestMonth: string,
  latestMonth: string,
) {
  return (
    isTransactionBoundsReady && Boolean(earliestMonth) && Boolean(latestMonth)
  );
}

export function calculateDateRangeBoundMonths(
  earliestTransaction: { date: string } | null,
  latestTransaction: { date: string } | null,
) {
  const currentMonth = monthUtils.currentMonth();
  const currentDay = monthUtils.currentDay();

  const earliestTransactionDate = earliestTransaction
    ? earliestTransaction.date
    : currentDay;
  const latestTransactionDate = latestTransaction
    ? latestTransaction.date
    : currentDay;

  const computedEarliestMonth = earliestTransaction
    ? monthUtils.getMonth(earliestTransaction.date)
    : currentMonth;
  const latestTransactionMonth = latestTransaction
    ? monthUtils.getMonth(latestTransaction.date)
    : currentMonth;

  const computedLatestMonth =
    latestTransactionMonth > currentMonth
      ? latestTransactionMonth
      : currentMonth;

  return {
    earliestMonth: computedEarliestMonth,
    latestMonth: computedLatestMonth,
    earliestTransactionDate,
    latestTransactionDate,
  };
}

type PresetTimeRangeMode = Exclude<
  TimeFrame['mode'],
  'sliding-window' | 'static'
>;

function isPresetTimeRangeMode(
  mode: TimeFrame['mode'],
): mode is PresetTimeRangeMode {
  return !['sliding-window', 'static'].includes(mode);
}

type QueryManagerProps = {
  queries: Record<string, QueryConfig>;
  onQueriesChange: (queries: Record<string, QueryConfig>) => void;
};

export function QueryManager({ queries, onQueriesChange }: QueryManagerProps) {
  const { t } = useTranslation();
  const [newQueryName, setNewQueryName] = useState('');
  const [isAddingQuery, setIsAddingQuery] = useState(false);
  const dispatch = useDispatch();

  function handleAddQuery() {
    if (!newQueryName.trim()) return;

    if (queries[newQueryName]) {
      dispatch(
        addNotification({
          notification: {
            type: 'error',
            message: t('Query with this name already exists'),
          },
        }),
      );
      return;
    }

    onQueriesChange({
      ...queries,
      [newQueryName]: {
        conditions: [],
        conditionsOp: 'and',
        timeFrame: {
          start: monthUtils.firstDayOfMonth(monthUtils.currentDay()),
          end: monthUtils.currentDay(),
          mode: 'sliding-window',
        },
      },
    });

    setNewQueryName('');
    setIsAddingQuery(false);
  }

  function handleRemoveQuery(queryName: string) {
    const newQueries = { ...queries };
    delete newQueries[queryName];
    onQueriesChange(newQueries);
  }

  function handleUpdateQuery(queryName: string, config: QueryConfig) {
    onQueriesChange({
      ...queries,
      [queryName]: config,
    });
  }

  return (
    <View style={{ padding: 20, flex: 1, minWidth: 400 }}>
      <View
        style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: 600 }}>
          <Trans>Query Definitions</Trans>
        </Text>
        <Button
          variant="primary"
          onPress={() => setIsAddingQuery(!isAddingQuery)}
        >
          {isAddingQuery ? <Trans>Cancel</Trans> : <Trans>Add Query</Trans>}
        </Button>
      </View>

      {isAddingQuery && (
        <View
          style={{
            padding: 16,
            border: `1px solid ${theme.tableBorder}`,
            borderRadius: 4,
            marginBottom: 16,
            backgroundColor: theme.tableBackground,
          }}
        >
          <View style={{ display: 'flex', flexDirection: 'row', gap: 8 }}>
            <Input
              placeholder={t("Query name (e.g., 'expenses', 'income')")}
              value={newQueryName}
              onChange={e => setNewQueryName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  handleAddQuery();
                }
              }}
              style={{ flex: 1 }}
            />
            <Button variant="primary" onPress={handleAddQuery}>
              <Trans>Create</Trans>
            </Button>
          </View>
        </View>
      )}

      {Object.entries(queries).length === 0 ? (
        <View
          style={{
            padding: 32,
            textAlign: 'center',
            color: theme.pageTextSubdued,
            border: `1px dashed ${theme.tableBorder}`,
            borderRadius: 4,
            maxWidth: 400,
          }}
        >
          <Text>
            <Trans>
              No queries defined. Click 'Add Query' to create your first query.
            </Trans>
          </Text>
          <Text style={{ fontSize: 12, marginTop: 8 }}>
            <Trans>
              Queries allow you to reference filtered transaction data in your
              formulas using QUERY("queryName") or QUERY_COUNT("queryName")
            </Trans>
          </Text>
        </View>
      ) : (
        <View style={{ display: 'block' }}>
          {Object.entries(queries).map(([queryName, config]) => (
            <QueryItem
              key={queryName}
              queryName={queryName}
              defaultConfig={config}
              onUpdate={newConfig => handleUpdateQuery(queryName, newConfig)}
              onRemove={() => handleRemoveQuery(queryName)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

type QueryItemProps = {
  queryName: string;
  defaultConfig: QueryConfig;
  onUpdate: (config: QueryConfig) => void;
  onRemove: () => void;
};

function QueryItem({
  queryName,
  defaultConfig,
  onUpdate,
  onRemove,
}: QueryItemProps) {
  const language = useLanguage();
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';
  const { t } = useTranslation();
  const [importJsonText, setImportJsonText] = useState('');
  const dispatch = useDispatch<AppDispatch>();

  // Time range state
  const [startDate, setStartDate] = useState(
    defaultConfig.timeFrame?.start ||
      monthUtils.dayFromDate(monthUtils.currentMonth()),
  );
  const [endDate, setEndDate] = useState(
    defaultConfig.timeFrame?.end || monthUtils.currentDay(),
  );

  const [earliestMonth, setEarliestMonth] = useState(monthUtils.currentMonth());
  const [latestMonth, setLatestMonth] = useState(monthUtils.currentMonth());
  const [isTransactionBoundsReady, setIsTransactionBoundsReady] =
    useState(false);
  const [earliestTransaction, setEarliestTransaction] = useState(
    monthUtils.currentDay(),
  );
  const [latestTransaction, setLatestTransaction] = useState(
    monthUtils.currentDay(),
  );

  const timeRangeRef = useRef<string>(
    defaultConfig.timeFrame?.mode || 'sliding-window',
  );
  const conditionsRef = useRef<RuleConditionEntity[]>(
    defaultConfig.conditions || [],
  );

  // Accepting null here to detect changes and make rerender work properly:
  const conditionsOpRef = useRef<'and' | 'or' | null>(
    defaultConfig.conditionsOp || null,
  );

  useEffect(() => {
    if (conditionsRef.current.length === 0) {
      conditionsRef.current = defaultConfig.conditions || [];
    }

    if (conditionsOpRef.current === null) {
      conditionsOpRef.current = defaultConfig.conditionsOp || 'and';
    }
  }, [defaultConfig]);

  // Fetch transaction bounds for per-query date picker limits and presets.
  useEffect(() => {
    async function run() {
      try {
        const [earliestTransactionResult, latestTransactionResult] =
          await Promise.all([
            send('get-earliest-transaction').catch(() => null),
            send('get-latest-transaction').catch(() => null),
          ]);

        const computedBounds = calculateDateRangeBoundMonths(
          earliestTransactionResult,
          latestTransactionResult,
        );

        setEarliestTransaction(computedBounds.earliestTransactionDate);
        setLatestTransaction(computedBounds.latestTransactionDate);

        // Make sure the month selects are at least populated with a
        // year's worth of months. We can undo this when we have fancier
        // date selects.
        let computedEarliestMonth = computedBounds.earliestMonth;
        const yearAgo = monthUtils.subMonths(computedBounds.latestMonth, 12);
        if (computedEarliestMonth > yearAgo) {
          computedEarliestMonth = yearAgo;
        }

        setEarliestMonth(computedEarliestMonth);
        setLatestMonth(computedBounds.latestMonth);
      } finally {
        setIsTransactionBoundsReady(true);
      }
    }
    void run();
  }, []);

  const filters = useRuleConditionFilters(
    conditionsRef.current,
    conditionsOpRef.current ?? ('and' as 'and' | 'or'),
  );

  const prevFiltersRef = useRef<{
    conditions: RuleConditionEntity[];
    conditionsOp: 'and' | 'or';
    startDate: string;
    endDate: string;
  }>({
    conditions: filters.conditions,
    conditionsOp: filters.conditionsOp,
    startDate,
    endDate,
  });

  const sendUpdate = useCallback(
    (
      conditions = filters.conditions,
      conditionsOp = filters.conditionsOp,
      newStartDate = startDate,
      newEndDate = endDate,
      mode = timeRangeRef.current as TimeFrame['mode'],
    ) => {
      timeRangeRef.current = mode;
      onUpdate({
        conditions,
        conditionsOp,
        timeFrame: {
          start: newStartDate,
          end: newEndDate,
          mode,
        },
      });
    },
    [
      filters.conditions,
      filters.conditionsOp,
      timeRangeRef,
      startDate,
      endDate,
      onUpdate,
    ],
  );

  useEffect(() => {
    const prev = prevFiltersRef.current;
    const conditionsChanged =
      JSON.stringify(prev.conditions) !== JSON.stringify(filters.conditions);
    const conditionsOpChanged = prev.conditionsOp !== filters.conditionsOp;

    if (conditionsChanged || conditionsOpChanged) {
      prevFiltersRef.current = {
        conditions: filters.conditions,
        conditionsOp: filters.conditionsOp,
        startDate,
        endDate,
      };
      sendUpdate();
    }
  }, [
    filters.conditions,
    filters.conditionsOp,
    startDate,
    endDate,
    sendUpdate,
  ]);

  async function handleExport() {
    const config = {
      conditions: filters.conditions,
      conditionsOp: filters.conditionsOp,
      timeFrame: {
        start: startDate,
        end: endDate,
        mode: timeRangeRef.current as TimeFrame['mode'],
      },
    };

    const jsonString = JSON.stringify(config, null, 2);

    try {
      await navigator.clipboard.writeText(jsonString);
      dispatch(
        addNotification({
          notification: {
            type: 'message',
            message: t('Query configuration copied to clipboard'),
          },
        }),
      );
    } catch {
      dispatch(
        addNotification({
          notification: {
            type: 'error',
            message: t('Failed to copy to clipboard'),
          },
        }),
      );
    }
  }

  function handleImport() {
    try {
      const config = JSON.parse(importJsonText);
      if (config.conditions && config.conditionsOp && config.timeFrame) {
        // Update refs
        conditionsRef.current = config.conditions;
        conditionsOpRef.current = config.conditionsOp;
        timeRangeRef.current = config.timeFrame.mode;

        setStartDate(
          config.timeFrame.start
            ? normalizeQueryTimeFrameStart(config.timeFrame.start)
            : monthUtils.dayFromDate(monthUtils.currentMonth()),
        );
        setEndDate(
          config.timeFrame.end
            ? normalizeQueryTimeFrameEnd(config.timeFrame.end)
            : monthUtils.currentDay(),
        );

        // Update the query
        sendUpdate(
          config.conditions,
          config.conditionsOp,
          normalizeQueryTimeFrameStart(config.timeFrame.start),
          normalizeQueryTimeFrameEnd(config.timeFrame.end),
          config.timeFrame.mode,
        );
        setImportJsonText('');
      } else {
        dispatch(
          addNotification({
            notification: {
              type: 'error',
              message: t('Invalid JSON. Please check your input.'),
            },
          }),
        );
      }
    } catch {
      dispatch(
        addNotification({
          notification: {
            type: 'error',
            message: t('Invalid JSON. Please check your input.'),
          },
        }),
      );
    }
  }

  const timeRangeMode = timeRangeRef.current as TimeFrame['mode'];
  const isPresetTimeRange = isPresetTimeRangeMode(timeRangeMode);
  const timeRangeLabels = {
    'sliding-window': t('Live'),
    static: t('Static'),
    full: t('All time'),
    lastMonth: t('Last month'),
    lastYear: t('Last year'),
    yearToDate: t('Year to date'),
    priorYearToDate: t('Prior year to date'),
    currentQuarter: t('Current quarter'),
    previousQuarter: t('Previous quarter'),
  } satisfies Record<TimeFrame['mode'], string>;
  const timeRangeLabel = timeRangeLabels[timeRangeMode];
  const presetTimeRangeLabels = {
    full: t('All time transactions'),
    lastMonth: t('Last month transactions'),
    lastYear: t('Last year transactions'),
    yearToDate: t('Year to date transactions'),
    priorYearToDate: t('Prior year to date transactions'),
    currentQuarter: t('Current quarter transactions'),
    previousQuarter: t('Previous quarter transactions'),
  } satisfies Record<PresetTimeRangeMode, string>;
  const presetTimeRangeLabel = isPresetTimeRange
    ? presetTimeRangeLabels[timeRangeMode]
    : null;

  function formatDayLabel(date: string) {
    return monthUtils.format(date, dateFormat);
  }

  const [pickerStartDate, pickerEndDate] = clampMonthRangeToBounds(
    ...normalizeMonthRangeForPicker(startDate, endDate),
    earliestMonth,
    latestMonth,
  );

  const presets: DateRangePreset[] = buildDateRangePresets({
    t,
    onSelectRange: ([rangeStart, rangeEnd, rangeMode]) => {
      const [normalizedRangeStart, normalizedRangeEnd] =
        normalizeMonthPickerSelectionForQuery(rangeStart, rangeEnd);

      setStartDate(normalizedRangeStart);
      setEndDate(normalizedRangeEnd);
      sendUpdate(
        filters.conditions,
        filters.conditionsOp,
        normalizedRangeStart,
        normalizedRangeEnd,
        rangeMode,
      );
    },
    earliestTransaction,
    latestTransaction,
    show1Month: true,
    includeAllTime: true,
  });

  const isDateRangePickerReady = canRenderDateRangePicker(
    isTransactionBoundsReady,
    earliestMonth,
    latestMonth,
  );

  return (
    <View
      style={{
        padding: 16,
        marginBottom: 16,
        border: `1px solid ${theme.tableBorder}`,
        borderRadius: 4,
        backgroundColor: theme.tableBackground,
        display: 'block',
        flex: 1,
      }}
    >
      <View
        style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <View
          style={{
            display: 'flex',
            flexDirection: 'row',
            gap: 8,
            alignItems: 'center',
          }}
        >
          <Text style={{ fontWeight: 600, fontFamily: 'monospace' }}>
            <Trans>QUERY("{queryName}")</Trans>
          </Text>
        </View>
        <View
          style={{
            display: 'flex',
            flexDirection: 'row',
            gap: 8,
            justifyContent: 'flex-end',
            alignItems: 'center',
          }}
        >
          <View style={{ display: 'flex', flexDirection: 'row', gap: 4 }}>
            <Button
              variant="bare"
              onPress={handleExport}
              aria-label={t('Export query configuration')}
            >
              <SvgCopy style={{ width: 13, height: 13 }} />
            </Button>
            <DialogTrigger>
              <Button
                variant="bare"
                aria-label={t('Import query configuration')}
              >
                <SvgDownloadThickBottom style={{ width: 13, height: 13 }} />
              </Button>
              <Popover>
                <Dialog>
                  <View style={{ padding: 16, minWidth: 400 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        marginBottom: 12,
                      }}
                    >
                      <Trans>Import Query Configuration</Trans>
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        color: theme.pageTextSubdued,
                        marginBottom: 8,
                      }}
                    >
                      <Trans>Paste the JSON configuration below:</Trans>
                    </Text>
                    <textarea
                      value={importJsonText}
                      onChange={e => setImportJsonText(e.target.value)}
                      placeholder={JSON.stringify(
                        {
                          conditions: [],
                          conditionsOp: 'and',
                          timeFrame: {
                            start: '',
                            end: '',
                            mode: 'sliding-window',
                          },
                        },
                        null,
                        2,
                      )}
                      style={{
                        width: '100%',
                        height: 200,
                        padding: 8,
                        border: `1px solid ${theme.formInputBorder}`,
                        borderRadius: 4,
                        backgroundColor: theme.tableBackground,
                        color: theme.formInputText,
                        fontFamily: 'monospace',
                        fontSize: 12,
                        resize: 'vertical',
                        outline: 'none',
                      }}
                    />
                    <View
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        gap: 8,
                        marginTop: 12,
                        justifyContent: 'flex-end',
                      }}
                    >
                      <Button variant="bare" slot="close">
                        <Trans>Cancel</Trans>
                      </Button>
                      <Button
                        variant="primary"
                        onPress={handleImport}
                        slot="close"
                      >
                        <Trans>Import</Trans>
                      </Button>
                    </View>
                  </View>
                </Dialog>
              </Popover>
            </DialogTrigger>
            <Button variant="bare" onPress={onRemove}>
              <SvgTrash style={{ width: 13, height: 13 }} />
            </Button>
          </View>
        </View>
      </View>

      <View style={{ marginBottom: 12 }}>
        <View
          style={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'flex-end',
            gap: 8,
            marginTop: 16,
            alignItems: 'center',
          }}
        >
          <Button
            style={{ minWidth: 50 }}
            variant={timeRangeMode === 'static' ? 'normal' : 'primary'}
            onPress={() => {
              const newMode =
                timeRangeMode === 'static' ? 'sliding-window' : 'static';
              const [newStart, newEnd] = calculateTimeRange(
                asMonthSlidingTimeFrame({
                  start: startDate,
                  end: endDate,
                  mode: newMode,
                }),
              );

              setStartDate(newStart);
              setEndDate(newEnd);
              sendUpdate(
                filters.conditions,
                filters.conditionsOp,
                newStart,
                newEnd,
                newMode,
              );
            }}
          >
            {timeRangeLabel}
          </Button>
          {isDateRangePickerReady ? (
            <DateRangePicker
              start={pickerStartDate}
              end={pickerEndDate}
              minDate={earliestMonth}
              maxDate={latestMonth}
              granularities={['month']}
              locale={language}
              formatDayLabel={formatDayLabel}
              labels={{
                selectBy: t('Select by'),
                quickSelect: t('Quick select'),
                month: t('Month'),
                day: t('Day'),
                previous: t('Previous'),
                next: t('Next'),
                previousMonth: t('Previous month'),
                nextMonth: t('Next month'),
                year: t('Year'),
                dateRange: t('Date range'),
              }}
              presets={presets}
              onChangeDates={(newStart, newEnd) => {
                if (
                  shouldIgnoreMonthPickerNoop(
                    startDate,
                    endDate,
                    newStart,
                    newEnd,
                  )
                ) {
                  return;
                }

                const [normalizedStart, normalizedEnd] =
                  normalizeMonthPickerSelectionForQuery(newStart, newEnd);

                setStartDate(normalizedStart);
                setEndDate(normalizedEnd);
                sendUpdate(
                  filters.conditions,
                  filters.conditionsOp,
                  normalizedStart,
                  normalizedEnd,
                  'static',
                );
              }}
            />
          ) : (
            <Button
              variant="normal"
              isDisabled
              aria-label={t('Loading date range...')}
            >
              {t('Loading date range...')}
            </Button>
          )}
        </View>

        {presetTimeRangeLabel ? (
          <Input
            value={presetTimeRangeLabel}
            readOnly
            disabled
            style={{
              width: '100%',
              marginTop: 8,
              textAlign: 'center',
            }}
          />
        ) : null}
      </View>

      <View style={{ marginBottom: 8, flex: 1 }}>
        <Text
          style={{
            fontSize: 12,
            fontWeight: 500,
            marginBottom: 6,
            color: theme.pageTextSubdued,
          }}
        >
          <Trans>Filters:</Trans>
        </Text>
        <View
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            maxWidth: 400,
            flex: 1,
          }}
        >
          {filters.conditions.length > 0 && (
            <AppliedFilters
              conditions={filters.conditions}
              onUpdate={filters.onUpdate}
              onDelete={filters.onDelete}
              conditionsOp={filters.conditionsOp}
              onConditionsOpChange={filters.onConditionsOpChange}
              style={{ maxWidth: '100%' }}
            />
          )}
          <FilterButton
            compact={false}
            onApply={filters.onApply}
            hover={false}
          />
        </View>
      </View>
    </View>
  );
}
