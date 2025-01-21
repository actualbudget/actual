import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  type Ref,
  useCallback,
} from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router-dom';
import { useSpring, animated, config } from 'react-spring';

import { css } from '@emotion/css';
import { useDrag } from '@use-gesture/react';
import { format, parseISO } from 'date-fns';

import { SchedulesProvider } from 'loot-core/client/data-hooks/schedules';
import { useTransactions } from 'loot-core/client/data-hooks/transactions';
import { useWidget } from 'loot-core/client/data-hooks/widget';
import { addNotification } from 'loot-core/client/notifications/notificationsSlice';
import { send } from 'loot-core/platform/client/fetch';
import { q, type Query } from 'loot-core/shared/query';
import { ungroupTransactions } from 'loot-core/shared/transactions';
import { amountToCurrency } from 'loot-core/shared/util';
import * as monthUtils from 'loot-core/src/shared/months';
import {
  type RuleConditionEntity,
  type CalendarWidget,
  type TimeFrame,
  type TransactionEntity,
} from 'loot-core/types/models';

import { useAccounts } from '../../../hooks/useAccounts';
import { useCategories } from '../../../hooks/useCategories';
import { useDateFormat } from '../../../hooks/useDateFormat';
import { useFilters } from '../../../hooks/useFilters';
import { useMergedRefs } from '../../../hooks/useMergedRefs';
import { useNavigate } from '../../../hooks/useNavigate';
import { usePayees } from '../../../hooks/usePayees';
import { useResizeObserver } from '../../../hooks/useResizeObserver';
import { SelectedProviderWithItems } from '../../../hooks/useSelected';
import { SplitsExpandedProvider } from '../../../hooks/useSplitsExpanded';
import { useSyncedPref } from '../../../hooks/useSyncedPref';
import {
  SvgArrowThickDown,
  SvgArrowThickUp,
  SvgCheveronDown,
  SvgCheveronUp,
} from '../../../icons/v1';
import { useDispatch } from '../../../redux';
import { styles, theme } from '../../../style';
import { Button } from '../../common/Button2';
import { View } from '../../common/View';
import { EditablePageHeaderTitle } from '../../EditablePageHeaderTitle';
import { MobileBackButton } from '../../mobile/MobileBackButton';
import { TransactionList as TransactionListMobile } from '../../mobile/transactions/TransactionList';
import { MobilePageHeader, Page, PageHeader } from '../../Page';
import { PrivacyFilter } from '../../PrivacyFilter';
import { useResponsive } from '../../responsive/ResponsiveProvider';
import { TransactionList } from '../../transactions/TransactionList';
import { chartTheme } from '../chart-theme';
import { DateRange } from '../DateRange';
import { CalendarGraph } from '../graphs/CalendarGraph';
import { Header } from '../Header';
import { LoadingIndicator } from '../LoadingIndicator';
import { calculateTimeRange } from '../reportRanges';
import {
  type CalendarDataType,
  calendarSpreadsheet,
} from '../spreadsheets/calendar-spreadsheet';
import { useReport } from '../useReport';
import { fromDateRepr } from '../util';

const CHEVRON_HEIGHT = 42;
const SUMMARY_HEIGHT = 140;

export function Calendar() {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const { data: widget, isLoading } = useWidget<CalendarWidget>(
    params.id ?? '',
    'calendar-card',
  );

  if (isLoading) {
    return <LoadingIndicator />;
  }

  return <CalendarInner widget={widget} parameters={searchParams} />;
}

type CalendarInnerProps = {
  widget?: CalendarWidget;
  parameters: URLSearchParams;
};

function CalendarInner({ widget, parameters }: CalendarInnerProps) {
  const { t } = useTranslation();
  const [initialStart, initialEnd, initialMode] = calculateTimeRange(
    widget?.meta?.timeFrame,
    {
      start: monthUtils.dayFromDate(monthUtils.currentMonth()),
      end: monthUtils.currentDay(),
      mode: 'full',
    },
  );
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);
  const [mode, setMode] = useState(initialMode);
  const [query, setQuery] = useState<Query | undefined>(undefined);
  const [dirty, setDirty] = useState(false);

  const { transactions: transactionsGrouped, loadMore: loadMoreTransactions } =
    useTransactions({ query });

  const allTransactions = useMemo(
    () => ungroupTransactions(transactionsGrouped as TransactionEntity[]),
    [transactionsGrouped],
  );

  const accounts = useAccounts();
  const payees = usePayees();
  const { grouped: categoryGroups } = useCategories();

  const [_firstDayOfWeekIdx] = useSyncedPref('firstDayOfWeekIdx');
  const firstDayOfWeekIdx = _firstDayOfWeekIdx || '0';
  const {
    conditions,
    conditionsOp,
    onApply: onApplyFilter,
    onDelete: onDeleteFilter,
    onUpdate: onUpdateFilter,
    onConditionsOpChange,
  } = useFilters(widget?.meta?.conditions, widget?.meta?.conditionsOp);

  useEffect(() => {
    const day = parameters.get('day');
    const month = parameters.get('month');

    if (day && onApplyFilter) {
      onApplyFilter({
        conditions: [
          ...(widget?.meta?.conditions || []),
          {
            op: 'is',
            field: 'date',
            value: day,
          } as RuleConditionEntity,
        ],
        conditionsOp: 'and',
        id: [],
      });
    }

    if (month && onApplyFilter) {
      onApplyFilter({
        conditions: [
          ...(widget?.meta?.conditions || []),
          {
            field: 'date',
            op: 'is',
            value: month,
            options: {
              month: true,
            },
          },
        ],
        conditionsOp: 'and',
        id: [],
      });
    }
  }, [widget?.meta?.conditions, onApplyFilter, parameters]);

  const params = useMemo(() => {
    if (dirty === true) {
      setDirty(false);
    }

    return calendarSpreadsheet(
      start,
      end,
      conditions,
      conditionsOp,
      firstDayOfWeekIdx,
    );
  }, [start, end, conditions, conditionsOp, firstDayOfWeekIdx, dirty]);

  const [sortField, setSortField] = useState('');
  const [ascDesc, setAscDesc] = useState('desc');

  useEffect(() => {
    const conditionsOpKey = conditionsOp === 'or' ? '$or' : '$and';

    send('make-filters-from-conditions', {
      conditions: conditions.filter(cond => !cond.customName),
    })
      .then((data: { filters: unknown[] }) => {
        let query = q('transactions')
          .filter({
            [conditionsOpKey]: data.filters,
          })
          .filter({
            $and: [
              { date: { $gte: monthUtils.firstDayOfMonth(start) } },
              { date: { $lte: monthUtils.lastDayOfMonth(end) } },
            ],
          })
          .select('*');

        if (sortField) {
          query = query.orderBy({
            [getField(sortField)]: ascDesc,
          });
        }

        setQuery(query.options({ splits: 'grouped' }));
      })
      .catch((error: unknown) => {
        console.error('Error generating filters:', error);
      });
  }, [start, end, conditions, conditionsOp, sortField, ascDesc]);

  const [flexAlignment, setFlexAlignment] = useState('center');
  const scrollbarContainer = useRef<HTMLDivElement>(null);
  const ref = useResizeObserver(() => {
    setFlexAlignment(
      scrollbarContainer.current &&
        scrollbarContainer.current.scrollWidth >
          scrollbarContainer.current.clientWidth
        ? 'flex-start'
        : 'center',
    );
  });
  const mergedRef = useMergedRefs(
    ref,
    scrollbarContainer,
  ) as Ref<HTMLDivElement>;

  const data = useReport('calendar', params);

  const [allMonths, setAllMonths] = useState<
    Array<{
      name: string;
      pretty: string;
    }>
  >([]);

  useEffect(() => {
    async function run() {
      try {
        const trans = await send('get-earliest-transaction');
        const currentMonth = monthUtils.currentMonth();
        let earliestMonth = trans
          ? monthUtils.monthFromDate(parseISO(fromDateRepr(trans.date)))
          : currentMonth;

        // Make sure the month selects are at least populates with a
        // year's worth of months. We can undo this when we have fancier
        // date selects.
        const yearAgo = monthUtils.subMonths(monthUtils.currentMonth(), 12);
        if (earliestMonth > yearAgo) {
          earliestMonth = yearAgo;
        }

        const allMonths = monthUtils
          .rangeInclusive(earliestMonth, monthUtils.currentMonth())
          .map(month => ({
            name: month,
            pretty: monthUtils.format(month, 'MMMM, yyyy'),
          }))
          .reverse();

        setAllMonths(allMonths);
      } catch (error) {
        console.error('Error fetching earliest transaction:', error);
      }
    }
    run();
  }, []);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isNarrowWidth } = useResponsive();
  const title = widget?.meta?.name || t('Calendar');
  const table = useRef(null);
  const dateFormat = useDateFormat();

  const onSaveWidgetName = async (newName: string) => {
    if (!widget) {
      throw new Error('No widget that could be saved.');
    }

    const name = newName || t('Calendar');
    await send('dashboard-update-widget', {
      id: widget.id,
      meta: {
        ...(widget.meta ?? {}),
        name,
      },
    });
  };

  function onChangeDates(start: string, end: string, mode: TimeFrame['mode']) {
    setStart(start);
    setEnd(end);
    setMode(mode);
  }

  async function onSaveWidget() {
    if (!widget) {
      throw new Error('No widget that could be saved.');
    }

    try {
      await send('dashboard-update-widget', {
        id: widget.id,
        meta: {
          ...(widget.meta ?? {}),
          conditions,
          conditionsOp,
          timeFrame: {
            start,
            end,
            mode,
          },
        },
      });
      dispatch(
        addNotification({
          notification: {
            type: 'message',
            message: t('Dashboard widget successfully saved.'),
          },
        }),
      );
    } catch (error) {
      dispatch(
        addNotification({
          notification: {
            type: 'error',
            message: t('Failed to save dashboard widget.'),
          },
        }),
      );
      console.error('Error saving widget:', error);
    }
  }
  const { totalIncome, totalExpense } = useMemo(() => {
    if (!data || !data.calendarData) {
      return { totalIncome: 0, totalExpense: 0 };
    }
    return {
      totalIncome: data.calendarData.reduce(
        (prev, cur) => prev + cur.totalIncome,
        0,
      ),
      totalExpense: data.calendarData.reduce(
        (prev, cur) => prev + cur.totalExpense,
        0,
      ),
    };
  }, [data]);

  const onSort = useCallback(
    (headerClicked: string, ascDesc: 'asc' | 'desc') => {
      if (headerClicked === sortField) {
        setAscDesc(ascDesc);
      } else {
        setSortField(headerClicked);
        setAscDesc('desc');
      }
    },
    [sortField],
  );

  const onOpenTransaction = useCallback(
    (transaction: TransactionEntity) => {
      navigate(`/transactions/${transaction.id}`);
    },
    [navigate],
  );

  const refContainer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (refContainer.current) {
      setTotalHeight(refContainer.current.clientHeight - SUMMARY_HEIGHT);
    }
  }, [query]);

  const [totalHeight, setTotalHeight] = useState(0);
  const closeY = useRef(3000);

  const openY = 0;
  const [mobileTransactionsOpen, setMobileTransactionsOpen] = useState(false);

  const [{ y }, api] = useSpring(() => ({
    y: closeY.current,
    immediate: false,
  }));

  useEffect(() => {
    closeY.current = totalHeight;
    api.start({
      y: mobileTransactionsOpen ? openY : closeY.current,
      immediate: false,
    });
  }, [totalHeight, mobileTransactionsOpen, api]);

  const open = useCallback(
    ({ canceled }: { canceled: boolean }) => {
      api.start({
        y: openY,
        immediate: false,
        config: canceled ? config.wobbly : config.stiff,
      });
      setMobileTransactionsOpen(true);
    },
    [api],
  );

  const close = useCallback(
    (velocity = 0) => {
      api.start({
        y: closeY.current,
        config: { ...config.stiff, velocity },
      });
      setMobileTransactionsOpen(false);
    },
    [api],
  );

  const bind = useDrag(
    ({ offset: [, oy], cancel }) => {
      if (oy < 0) {
        cancel();
        api.start({ y: 0, immediate: true });
        return;
      }

      if (oy > totalHeight * 0.05 && mobileTransactionsOpen) {
        cancel();
        close();
        setMobileTransactionsOpen(false);
      } else if (!mobileTransactionsOpen) {
        if (oy / totalHeight > 0.05) {
          cancel();
          open({ canceled: true });
          setMobileTransactionsOpen(true);
        } else {
          api.start({ y: oy, immediate: true });
        }
      }
    },
    {
      from: () => [0, y.get()],
      filterTaps: true,
      bounds: {
        top: -totalHeight + CHEVRON_HEIGHT,
        bottom: totalHeight - CHEVRON_HEIGHT,
      },
      axis: 'y',
      rubberband: true,
    },
  );

  const [earliestTransaction, _] = useState('');

  return (
    <Page
      header={
        isNarrowWidth ? (
          <MobilePageHeader
            title={title}
            leftContent={
              <MobileBackButton onPress={() => navigate('/reports')} />
            }
          />
        ) : (
          <PageHeader
            title={
              widget ? (
                <EditablePageHeaderTitle
                  title={title}
                  onSave={onSaveWidgetName}
                />
              ) : (
                title
              )
            }
          />
        )
      }
      padding={0}
    >
      <View style={{ minHeight: !isNarrowWidth ? '120px' : 'unset' }}>
        <Header
          allMonths={allMonths}
          start={start}
          end={end}
          earliestTransaction={earliestTransaction}
          firstDayOfWeekIdx={firstDayOfWeekIdx}
          mode={mode}
          onChangeDates={onChangeDates}
          filters={conditions}
          onApply={onApplyFilter}
          onUpdateFilter={onUpdateFilter}
          onDeleteFilter={onDeleteFilter}
          conditionsOp={conditionsOp}
          onConditionsOpChange={onConditionsOpChange}
          show1Month={true}
        >
          {widget && (
            <Button variant="primary" onPress={onSaveWidget}>
              <Trans>Save widget</Trans>
            </Button>
          )}
        </Header>
      </View>
      <View ref={refContainer as Ref<HTMLDivElement>} style={{ flexGrow: 1 }}>
        <View
          style={{
            backgroundColor: theme.pageBackground,
            paddingTop: 0,
            minHeight: '350px',
            overflowY: 'auto',
          }}
        >
          <View
            style={{
              flexDirection: isNarrowWidth ? 'column-reverse' : 'row',
              justifyContent: 'flex-start',
              flexGrow: 1,
              gap: 16,
              position: 'relative',
              marginBottom: 16,
            }}
          >
            {data && (
              <View
                ref={mergedRef}
                style={{
                  flexGrow: 1,
                  flexDirection: 'row',
                  gap: '20px',
                  overflow: 'auto',
                  height: '100%',
                  justifyContent: flexAlignment,
                  display: 'flex',
                  ...styles.horizontalScrollbar,
                }}
              >
                {data.calendarData.map((calendar, index) => (
                  <CalendarWithHeader
                    key={index}
                    calendar={calendar}
                    onApplyFilter={onApplyFilter}
                    firstDayOfWeekIdx={firstDayOfWeekIdx}
                    conditions={conditions}
                    conditionsOp={conditionsOp}
                  />
                ))}
              </View>
            )}
            <CalendarCardHeader
              start={start}
              end={end}
              totalExpense={totalExpense}
              totalIncome={totalIncome}
              isNarrowWidth={isNarrowWidth}
            />
          </View>
        </View>
        <SelectedProviderWithItems
          name="transactions"
          items={[]}
          fetchAllIds={async () => []}
          registerDispatch={() => {}}
          selectAllFilter={(item: TransactionEntity) =>
            !item._unmatched && !item.is_parent
          }
        >
          <SchedulesProvider query={undefined}>
            <View
              style={{
                width: '100%',
                flexGrow: 1,
                overflow: isNarrowWidth ? 'auto' : 'hidden',
              }}
              ref={table}
            >
              {!isNarrowWidth ? (
                <SplitsExpandedProvider initialMode="collapse">
                  <TransactionList
                    headerContent={undefined}
                    tableRef={table}
                    account={undefined}
                    transactions={transactionsGrouped}
                    allTransactions={allTransactions}
                    loadMoreTransactions={loadMoreTransactions}
                    accounts={accounts}
                    category={undefined}
                    categoryGroups={categoryGroups}
                    payees={payees}
                    balances={null}
                    showBalances={false}
                    showReconciled={true}
                    showCleared={false}
                    showAccount={true}
                    isAdding={false}
                    isNew={() => false}
                    isMatched={() => false}
                    isFiltered={() => true}
                    dateFormat={dateFormat}
                    hideFraction={false}
                    renderEmpty={() => (
                      <View
                        style={{
                          color: theme.tableText,
                          marginTop: 20,
                          textAlign: 'center',
                          fontStyle: 'italic',
                        }}
                      >
                        <Trans>No transactions</Trans>
                      </View>
                    )}
                    onSort={onSort}
                    sortField={sortField}
                    ascDesc={ascDesc}
                    onChange={() => {}}
                    onRefetch={() => setDirty(true)}
                    onCloseAddTransaction={() => {}}
                    onCreatePayee={() => {}}
                    onApplyFilter={() => {}}
                    onBatchDelete={() => {}}
                    onBatchDuplicate={() => {}}
                    onBatchLinkSchedule={() => {}}
                    onBatchUnlinkSchedule={() => {}}
                    onCreateRule={() => {}}
                    onScheduleAction={() => {}}
                    onMakeAsNonSplitTransactions={() => {}}
                    showSelection={false}
                    allowSplitTransaction={false}
                  />
                </SplitsExpandedProvider>
              ) : (
                <animated.div
                  {...bind()}
                  style={{
                    y,
                    touchAction: 'pan-x',
                    backgroundColor: theme.mobileNavBackground,
                    borderTop: `1px solid ${theme.menuBorder}`,
                    ...styles.shadow,
                    height: totalHeight + CHEVRON_HEIGHT,
                    width: '100%',
                    position: 'fixed',
                    zIndex: 100,
                    bottom: 0,
                    display: isNarrowWidth ? 'flex' : 'none',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  <Button
                    variant="bare"
                    onPress={() =>
                      !mobileTransactionsOpen
                        ? open({ canceled: false })
                        : close()
                    }
                    className={css({
                      color: theme.pageTextSubdued,
                      height: 42,
                      '&[data-pressed]': { backgroundColor: 'transparent' },
                    })}
                  >
                    {!mobileTransactionsOpen && (
                      <>
                        <SvgCheveronUp width={16} height={16} />
                        <Trans>Show transactions</Trans>
                      </>
                    )}
                    {mobileTransactionsOpen && (
                      <>
                        <SvgCheveronDown width={16} height={16} />
                        <Trans>Hide transactions</Trans>
                      </>
                    )}
                  </Button>
                  <View
                    style={{ height: '100%', width: '100%', overflow: 'auto' }}
                  >
                    <TransactionListMobile
                      isLoading={false}
                      onLoadMore={loadMoreTransactions}
                      transactions={allTransactions}
                      onOpenTransaction={onOpenTransaction}
                      isLoadingMore={false}
                    />
                  </View>
                </animated.div>
              )}
            </View>
          </SchedulesProvider>
        </SelectedProviderWithItems>
      </View>
    </Page>
  );
}

type CalendarWithHeaderProps = {
  calendar: {
    start: Date;
    end: Date;
    data: CalendarDataType[];
    totalExpense: number;
    totalIncome: number;
  };
  onApplyFilter: (
    conditions:
      | null
      | RuleConditionEntity
      | {
          conditions: RuleConditionEntity[];
          conditionsOp: 'and' | 'or';
          id: RuleConditionEntity[];
        },
  ) => void;
  firstDayOfWeekIdx: string;
  conditions: RuleConditionEntity[];
  conditionsOp: 'and' | 'or';
};

function CalendarWithHeader({
  calendar,
  onApplyFilter,
  firstDayOfWeekIdx,
  conditions,
  conditionsOp,
}: CalendarWithHeaderProps) {
  const { t } = useTranslation();

  return (
    <View
      style={{
        minWidth: '300px',
        maxWidth: '300px',
        padding: 10,
        borderRadius: 4,
        backgroundColor: theme.tableBackground,
      }}
      onClick={() =>
        onApplyFilter({
          conditions: [...conditions.filter(f => f.field !== 'date')],
          conditionsOp,
          id: [],
        })
      }
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          marginBottom: 16,
        }}
      >
        <Button
          variant="bare"
          style={{
            color: theme.pageTextSubdued,
            fontWeight: 'bold',
            fontSize: '14px',
            margin: 0,
            padding: 0,
            display: 'inline-block',
            width: 'max-content',
          }}
          onPress={() => {
            onApplyFilter({
              conditions: [
                ...conditions.filter(f => f.field !== 'date'),
                {
                  field: 'date',
                  op: 'is',
                  value: format(calendar.start, 'yyyy-MM'),
                  options: {
                    month: true,
                  },
                },
              ],
              conditionsOp: 'and',
              id: [],
            });
          }}
        >
          {format(calendar.start, 'MMMM yyyy')}
        </Button>
        <View
          style={{ display: 'grid', gridTemplateColumns: '16px 1fr', gap: 2 }}
        >
          <SvgArrowThickUp
            width={16}
            height={16}
            style={{ color: chartTheme.colors.blue, flexShrink: 0 }}
          />
          <View
            style={{
              color: chartTheme.colors.blue,
              flexDirection: 'row',
              flexGrow: 1,
              justifyContent: 'start',
            }}
            aria-label={t('Income')}
          >
            <PrivacyFilter>
              {amountToCurrency(calendar.totalIncome)}
            </PrivacyFilter>
          </View>
          <SvgArrowThickDown
            width={16}
            height={16}
            style={{ color: chartTheme.colors.red, flexShrink: 0 }}
          />
          <View
            style={{
              color: chartTheme.colors.red,
              flexDirection: 'row',
              flexGrow: 1,
              justifyContent: 'start',
            }}
            aria-label={t('Expenses')}
          >
            <PrivacyFilter>
              {amountToCurrency(calendar.totalExpense)}
            </PrivacyFilter>
          </View>
        </View>
      </View>
      <View style={{ flexGrow: 1, display: 'block', marginBottom: 20 }}>
        <CalendarGraph
          data={calendar.data}
          start={calendar.start}
          onDayClick={date => {
            if (date) {
              onApplyFilter({
                conditions: [
                  ...conditions.filter(f => f.field !== 'date'),
                  {
                    field: 'date',
                    op: 'is',
                    value: format(date, 'yyyy-MM-dd'),
                  },
                ],
                conditionsOp: 'and',
                id: [],
              });
            } else {
              onApplyFilter({
                conditions: [...conditions.filter(f => f.field !== 'date')],
                conditionsOp: 'and',
                id: [],
              });
            }
          }}
          firstDayOfWeekIdx={firstDayOfWeekIdx}
        />
      </View>
    </View>
  );
}

type CalendarCardHeaderProps = {
  start: string;
  end: string;
  totalIncome: number;
  totalExpense: number;
  isNarrowWidth: boolean;
};

function CalendarCardHeader({
  start,
  end,
  totalIncome,
  totalExpense,
  isNarrowWidth,
}: CalendarCardHeaderProps) {
  return (
    <View
      style={{
        ...styles.smallText,
        marginLeft: isNarrowWidth ? 0 : 16,
        marginTop: isNarrowWidth ? 16 : 0,
        justifyContent: isNarrowWidth ? 'center' : 'flex-end',
        flexDirection: 'row',
        height: '100px',
        minWidth: '210px',
      }}
    >
      <View
        style={{
          width: '200px',
          borderRadius: 4,
          backgroundColor: theme.tableBackground,
          padding: 10,
        }}
      >
        <DateRange start={start} end={end} />
        <View style={{ lineHeight: 1.5 }}>
          <View
            style={{
              display: 'grid',
              gridTemplateColumns: '70px 1fr',
              gridAutoRows: '1fr',
            }}
          >
            <View
              style={{
                textAlign: 'right',
                marginRight: 4,
              }}
            >
              <Trans>Income:</Trans>
            </View>
            <View style={{ color: chartTheme.colors.blue }}>
              <PrivacyFilter>{amountToCurrency(totalIncome)}</PrivacyFilter>
            </View>

            <View
              style={{
                textAlign: 'right',
                marginRight: 4,
              }}
            >
              <Trans>Expenses:</Trans>
            </View>
            <View style={{ color: chartTheme.colors.red }}>
              <PrivacyFilter>{amountToCurrency(totalExpense)}</PrivacyFilter>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

function getField(field?: string) {
  if (!field) {
    return 'date';
  }

  switch (field) {
    case 'account':
      return 'account.name';
    case 'payee':
      return 'payee.name';
    case 'category':
      return 'category.name';
    case 'payment':
      return 'amount';
    case 'deposit':
      return 'amount';
    default:
      return field;
  }
}
