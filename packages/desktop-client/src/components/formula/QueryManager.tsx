import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Dialog, DialogTrigger } from 'react-aria-components';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgCopy, SvgTrash } from '@actual-app/components/icons/v1';
import { SvgDownloadThickBottom } from '@actual-app/components/icons/v2';
import { Input } from '@actual-app/components/input';
import { Menu } from '@actual-app/components/menu';
import { Popover } from '@actual-app/components/popover';
import { Select } from '@actual-app/components/select';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { parseISO } from 'date-fns';

import { send } from 'loot-core/platform/client/fetch';
import * as monthUtils from 'loot-core/shared/months';
import {
  type RuleConditionEntity,
  type TimeFrame,
} from 'loot-core/types/models';

import { AppliedFilters } from '@desktop-client/components/filters/AppliedFilters';
import { FilterButton } from '@desktop-client/components/filters/FiltersMenu';
import { getLiveRange } from '@desktop-client/components/reports/getLiveRange';
import {
  calculateTimeRange,
  validateEnd,
  validateStart,
  getLatestRange,
} from '@desktop-client/components/reports/reportRanges';
import { fromDateRepr } from '@desktop-client/components/reports/util';
import { useRuleConditionFilters } from '@desktop-client/hooks/useRuleConditionFilters';
import { addNotification } from '@desktop-client/notifications/notificationsSlice';
import { useDispatch } from '@desktop-client/redux';
import { type AppDispatch } from '@desktop-client/redux/store';

type QueryConfig = {
  conditions?: RuleConditionEntity[];
  conditionsOp?: 'and' | 'or';
  timeFrame?: TimeFrame;
};

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
              placeholder={t('Query name (e.g., ‘expenses’, ‘income’)')}
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
              No queries defined. Click ‘Add Query’ to create your first query.
            </Trans>
          </Text>
          <Text style={{ fontSize: 12, marginTop: 8 }}>
            <Trans>
              Queries allow you to reference filtered transaction data in your
              formulas using QUERY(‘queryName’)
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
  const { t } = useTranslation();
  const [importJsonText, setImportJsonText] = useState('');
  const dispatch = useDispatch<AppDispatch>();
  const timeRangeMenuTriggerRef = useRef(null);
  const [timeRangeMenuOpen, setTimeRangeMenuOpen] = useState(false);

  // Time range state
  const [startDate, setStartDate] = useState(
    defaultConfig.timeFrame?.start ||
      monthUtils.dayFromDate(monthUtils.currentMonth()),
  );
  const [endDate, setEndDate] = useState(
    defaultConfig.timeFrame?.end || monthUtils.currentDay(),
  );

  // Months data for range picker
  const [allMonths, setAllMonths] = useState<
    Array<{
      name: string;
      pretty: string;
    }>
  >([]);
  const [_earliestTransaction, setEarliestTransaction] = useState('');
  const [_latestTransaction, setLatestTransaction] = useState('');

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

  // Fetch transaction data for month range picker
  useEffect(() => {
    async function run() {
      const earliestTransaction = await send('get-earliest-transaction');
      setEarliestTransaction(
        earliestTransaction
          ? earliestTransaction.date
          : monthUtils.currentDay(),
      );

      const latestTransaction = await send('get-latest-transaction');
      setLatestTransaction(
        latestTransaction ? latestTransaction.date : monthUtils.currentDay(),
      );

      const currentMonth = monthUtils.currentMonth();
      let earliestMonth = earliestTransaction
        ? monthUtils.monthFromDate(
            parseISO(fromDateRepr(earliestTransaction.date)),
          )
        : currentMonth;
      const latestMonth = latestTransaction
        ? monthUtils.monthFromDate(
            parseISO(fromDateRepr(latestTransaction.date)),
          )
        : currentMonth;

      // Make sure the month selects are at least populated with a
      // year's worth of months. We can undo this when we have fancier
      // date selects.
      const yearAgo = monthUtils.subMonths(latestMonth, 12);
      if (earliestMonth > yearAgo) {
        earliestMonth = yearAgo;
      }

      const allMonths = monthUtils
        .rangeInclusive(earliestMonth, latestMonth)
        .map(month => ({
          name: month,
          pretty: monthUtils.format(month, 'MMMM, yyyy'),
        }))
        .reverse();

      setAllMonths(allMonths);
    }
    run();
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

  function handleStartDateChange(newStart: string) {
    setStartDate(monthUtils.dayFromDate(newStart));
    sendUpdate(
      filters.conditions,
      filters.conditionsOp,
      monthUtils.dayFromDate(newStart),
      endDate,
      timeRangeRef.current as TimeFrame['mode'],
    );
  }

  function handleEndDateChange(newEnd: string) {
    setEndDate(monthUtils.dayFromDate(newEnd));
    sendUpdate(
      filters.conditions,
      filters.conditionsOp,
      startDate,
      monthUtils.dayFromDate(newEnd),
      timeRangeRef.current as TimeFrame['mode'],
    );
  }

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
          config.timeFrame.start ||
            monthUtils.dayFromDate(monthUtils.currentMonth()),
        );
        setEndDate(config.timeFrame.end || monthUtils.currentDay());

        // Update the query
        sendUpdate(
          config.conditions,
          config.conditionsOp,
          config.timeFrame.start,
          config.timeFrame.end,
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
            <Trans>QUERY(‘{queryName}’)</Trans>
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
          }}
        >
          <Button
            style={{ width: 50 }}
            variant={timeRangeRef.current === 'static' ? 'normal' : 'primary'}
            onPress={() => {
              const currentMode = timeRangeRef.current as TimeFrame['mode'];
              const newMode =
                currentMode === 'static' ? 'sliding-window' : 'static';
              const [newStart, newEnd] = calculateTimeRange({
                start: startDate,
                end: endDate,
                mode: newMode,
              });

              setStartDate(newStart);
              setEndDate(newEnd);
              timeRangeRef.current = newMode;
              sendUpdate(
                filters.conditions,
                filters.conditionsOp,
                newStart,
                newEnd,
                newMode,
              );
            }}
          >
            {timeRangeRef.current === 'static' ? t('Static') : t('Live')}
          </Button>
          <Button
            ref={timeRangeMenuTriggerRef}
            variant="bare"
            onPress={() => setTimeRangeMenuOpen(true)}
          >
            ⋮
          </Button>
          <Popover
            triggerRef={timeRangeMenuTriggerRef}
            placement="bottom start"
            isOpen={timeRangeMenuOpen}
            onOpenChange={() => setTimeRangeMenuOpen(false)}
          >
            <Menu
              onMenuSelect={item => {
                let start: string, end: string, mode: TimeFrame['mode'];
                const currentMode = timeRangeRef.current as TimeFrame['mode'];
                // For quick selections, use the current toggle state (static vs sliding-window)
                const quickSelectMode = ['static', 'sliding-window'].includes(
                  currentMode,
                )
                  ? currentMode
                  : 'sliding-window';

                switch (item) {
                  case 'last-month': {
                    const prevMonth = monthUtils.subMonths(
                      monthUtils.currentMonth(),
                      1,
                    );
                    start = monthUtils.firstDayOfMonth(prevMonth);
                    end = monthUtils.lastDayOfMonth(prevMonth);
                    mode = quickSelectMode;
                    break;
                  }
                  case '1-month': {
                    const [startMonth, endMonth] = getLatestRange(0);
                    start = monthUtils.firstDayOfMonth(startMonth);
                    end = monthUtils.lastDayOfMonth(endMonth);
                    mode = quickSelectMode;
                    break;
                  }
                  case '3-months': {
                    const [startMonth, endMonth] = getLatestRange(2);
                    start = monthUtils.firstDayOfMonth(startMonth);
                    end = monthUtils.lastDayOfMonth(endMonth);
                    mode = quickSelectMode;
                    break;
                  }
                  case '6-months': {
                    const [startMonth, endMonth] = getLatestRange(5);
                    start = monthUtils.firstDayOfMonth(startMonth);
                    end = monthUtils.lastDayOfMonth(endMonth);
                    mode = quickSelectMode;
                    break;
                  }
                  case '1-year': {
                    const [startMonth, endMonth] = getLatestRange(11);
                    start = monthUtils.firstDayOfMonth(startMonth);
                    end = monthUtils.lastDayOfMonth(endMonth);
                    mode = quickSelectMode;
                    break;
                  }
                  case 'year-to-date': {
                    [start, end] = getLiveRange(
                      'Year to date',
                      _earliestTransaction,
                      _latestTransaction,
                      true,
                    );
                    mode = 'yearToDate';
                    break;
                  }
                  case 'last-year': {
                    [start, end] = getLiveRange(
                      'Last year',
                      _earliestTransaction,
                      _latestTransaction,
                      false,
                    );
                    mode = 'lastYear';
                    break;
                  }
                  case 'prior-year-to-date': {
                    [start, end] = getLiveRange(
                      'Prior year to date',
                      _earliestTransaction,
                      _latestTransaction,
                      false,
                    );
                    mode = 'priorYearToDate';
                    break;
                  }
                  case 'all-time': {
                    [start, end] = getLiveRange(
                      'All time',
                      _earliestTransaction,
                      _latestTransaction,
                      true,
                    );
                    mode = 'full';
                    break;
                  }
                  default:
                    return;
                }
                setStartDate(start);
                setEndDate(end);
                timeRangeRef.current = mode;
                sendUpdate(
                  filters.conditions,
                  filters.conditionsOp,
                  start,
                  end,
                  mode,
                );
                setTimeRangeMenuOpen(false);
              }}
              items={[
                { name: '1-month', text: t('1 month') },
                { name: '3-months', text: t('3 months') },
                { name: '6-months', text: t('6 months') },
                { name: '1-year', text: t('1 year') },
                Menu.line,
                { name: 'year-to-date', text: t('Year to date') },
                { name: 'last-month', text: t('Last month') },
                { name: 'last-year', text: t('Last year') },
                {
                  name: 'prior-year-to-date',
                  text: t('Prior year to date'),
                },
                { name: 'all-time', text: t('All time') },
              ]}
            />
          </Popover>
        </View>

        {/* Date range selectors */}
        {allMonths.length > 0 && (
          <View
            style={{
              display: 'flex',
              flexDirection: 'row',
              gap: 10,
              marginTop: 8,
              alignItems: 'center',
            }}
          >
            <Select
              value={fromDateRepr(startDate)}
              onChange={newValue => {
                const [validatedStart] = validateStart(
                  allMonths[allMonths.length - 1].name,
                  allMonths[0].name,
                  newValue,
                  fromDateRepr(endDate),
                );
                handleStartDateChange(validatedStart);
              }}
              options={allMonths.map(({ name, pretty }) => [name, pretty])}
              style={{ flex: 1 }}
            />
            <Text style={{ fontSize: 12, color: theme.pageTextSubdued }}>
              <Trans>to</Trans>
            </Text>
            <Select
              value={fromDateRepr(endDate)}
              onChange={newValue => {
                const [, validatedEnd] = validateEnd(
                  allMonths[allMonths.length - 1].name,
                  allMonths[0].name,
                  fromDateRepr(startDate),
                  newValue,
                );
                handleEndDateChange(validatedEnd);
              }}
              options={allMonths.map(({ name, pretty }) => [name, pretty])}
              style={{ flex: 1 }}
            />
          </View>
        )}
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
