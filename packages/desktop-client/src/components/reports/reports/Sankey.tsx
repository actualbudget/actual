import { useEffect, useMemo, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useParams } from 'react-router';

import { Button } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import {
  SvgArrowDown,
  SvgCheveronRight,
  SvgLayers,
  SvgList,
  SvgRefresh,
} from '@actual-app/components/icons/v1';
import { Menu } from '@actual-app/components/menu';
import { Paragraph } from '@actual-app/components/paragraph';
import { Popover } from '@actual-app/components/popover';
import { SpaceBetween } from '@actual-app/components/space-between';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import * as monthUtils from '@actual-app/core/shared/months';
import { mapField } from '@actual-app/core/shared/rules';
import type {
  RuleConditionEntity,
  SankeyWidget,
  TimeFrame,
} from '@actual-app/core/types/models';
import * as d from 'date-fns';
import debounce from 'lodash/debounce';
import type { SankeyData } from 'recharts/types/chart/Sankey';

import { EditablePageHeaderTitle } from '#components/EditablePageHeaderTitle';
import { MobileBackButton } from '#components/mobile/MobileBackButton';
import { MobilePageHeader, Page, PageHeader } from '#components/Page';
import { SankeyGraph } from '#components/reports/graphs/SankeyGraph';
import { Header } from '#components/reports/Header';
import { LoadingIndicator } from '#components/reports/LoadingIndicator';
import { ModeButton } from '#components/reports/ModeButton';
import { calculateTimeRange } from '#components/reports/reportRanges';
import {
  buildSankeyData,
  createBaseGraphSpreadsheet,
  GRAPH_LAYER_ORDER,
  GraphLayers,
} from '#components/reports/spreadsheets/sankey-spreadsheet';
import type { Graph } from '#components/reports/spreadsheets/sankey-spreadsheet';
import { useReport } from '#components/reports/useReport';
import { fromDateRepr } from '#components/reports/util';
import { useCategories } from '#hooks/useCategories';
import { useDashboardWidget } from '#hooks/useDashboardWidget';
import { useFormatList } from '#hooks/useFormatList';
import { useLocale } from '#hooks/useLocale';
import { useNavigate } from '#hooks/useNavigate';
import { useResizeObserver } from '#hooks/useResizeObserver';
import { useRuleConditionFilters } from '#hooks/useRuleConditionFilters';
import { addNotification } from '#notifications/notificationsSlice';
import { useDispatch } from '#redux';
import { useUpdateDashboardWidgetMutation } from '#reports/mutations';

export function Sankey() {
  const params = useParams();
  const { data: widget, isLoading } = useDashboardWidget<SankeyWidget>({
    id: params.id ?? '',
    type: 'sankey-card',
  });

  if (isLoading) {
    return <LoadingIndicator />;
  }

  return <SankeyInner widget={widget} />;
}

export function topNNodes(cardHeight: number): number {
  const PX_PER_NODE = 35;
  const heightBasedTopN = Math.max(2, Math.floor(cardHeight / PX_PER_NODE));
  return heightBasedTopN;
}

type GraphMode = 'budgeted' | 'spent';

type LayerDirection = 'from' | 'to';
type LayerRange = {
  from: GraphLayers;
  to: GraphLayers;
};

function getAvailableLayers(mode: GraphMode): GraphLayers[] {
  return GRAPH_LAYER_ORDER.filter(layer => {
    if (mode === 'budgeted') {
      return layer !== GraphLayers.IncomePayee;
    }

    return layer !== GraphLayers.Budget;
  }) as GraphLayers[];
}

function getDefaultLayerRange(mode: GraphMode): LayerRange {
  return {
    from:
      mode === 'budgeted'
        ? GraphLayers.IncomeCategory
        : GraphLayers.IncomePayee,
    to: GraphLayers.Category,
  };
}

function normalizeLayerRange(
  mode: GraphMode,
  candidate: LayerRange,
  changedDirection?: LayerDirection,
): LayerRange {
  const availableLayers = getAvailableLayers(mode);
  const fallback = getDefaultLayerRange(mode);
  const defaultFromIndex = availableLayers.indexOf(fallback.from);
  const defaultToIndex = availableLayers.indexOf(fallback.to);

  let from = availableLayers.includes(candidate.from)
    ? candidate.from
    : fallback.from;
  let to = availableLayers.includes(candidate.to) ? candidate.to : fallback.to;

  let fromIndex = availableLayers.indexOf(from);
  let toIndex = availableLayers.indexOf(to);

  if (fromIndex >= toIndex) {
    if (changedDirection === 'from') {
      const adjustedToIndex = Math.min(
        availableLayers.length - 1,
        Math.max(fromIndex + 1, defaultToIndex),
      );
      to = availableLayers[adjustedToIndex] ?? fallback.to;
    } else if (changedDirection === 'to') {
      const adjustedFromIndex = Math.max(
        0,
        Math.min(toIndex - 1, defaultFromIndex),
      );
      from = availableLayers[adjustedFromIndex] ?? fallback.from;
    } else {
      from = fallback.from;
      to = fallback.to;
    }

    fromIndex = availableLayers.indexOf(from);
    toIndex = availableLayers.indexOf(to);
  }

  if (fromIndex >= toIndex) {
    return fallback;
  }

  return { from, to };
}

function getLayerMenuItems(
  mode: GraphMode,
  direction: LayerDirection,
  otherLayer: GraphLayers,
): GraphLayers[] {
  const availableLayers = getAvailableLayers(mode);
  const otherIndex = availableLayers.indexOf(otherLayer);

  if (otherIndex === -1) {
    return [];
  }

  if (direction === 'from') {
    return availableLayers.slice(0, otherIndex);
  }

  return availableLayers.slice(otherIndex + 1);
}

// 1e5 is used as a sentinel value for 'All'
const TOP_N_OPTIONS = [1e5, 10, 15, 20, 25, 30] as const;

type TopNSelectorProps = {
  value: number;
  onChange: (value: number) => void;
};

function displayN(n: number, t: Function): string {
  return n === 1e5 ? t('All') : String(n);
}

function TopNSelector({ value, onChange }: TopNSelectorProps) {
  const { t } = useTranslation();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        ref={triggerRef}
        variant="bare"
        onPress={() => setIsOpen(true)}
        aria-label={t('Change category limit')}
      >
        <SvgList style={{ width: 12, height: 12 }} />
        <span style={{ marginLeft: 5 }}>
          {t('Show up to {{n}}', { n: displayN(value, t) })}
        </span>
      </Button>
      <Popover
        triggerRef={triggerRef}
        placement="bottom start"
        isOpen={isOpen}
        onOpenChange={() => setIsOpen(false)}
      >
        <Menu
          onMenuSelect={item => {
            onChange(Number(item));
            setIsOpen(false);
          }}
          items={TOP_N_OPTIONS.map(n => ({
            name: String(n),
            text: t('Show up to {{n}}', { n: displayN(n, t) }),
          }))}
        />
      </Popover>
    </>
  );
}

type CategorySortSelectorProps = {
  value: 'per-group' | 'global' | 'budget-order';
  onChange: (value: 'per-group' | 'global' | 'budget-order') => void;
};

function CategorySortSelector({ value, onChange }: CategorySortSelectorProps) {
  const { t } = useTranslation();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const options: Array<{
    key: 'per-group' | 'global' | 'budget-order';
    label: string;
  }> = [
    { key: 'per-group', label: t('Sort per group') },
    { key: 'global', label: t('Sort all') },
    { key: 'budget-order', label: t('Sort as budget') },
  ];

  const currentLabel =
    value === 'global'
      ? t('Sort all')
      : value === 'budget-order'
        ? t('Sort as budget')
        : t('Sort per group');

  return (
    <>
      <Button
        ref={triggerRef}
        variant="bare"
        onPress={() => setIsOpen(true)}
        aria-label={t('Change category sort order')}
      >
        <SvgArrowDown style={{ width: 12, height: 12 }} />
        <span style={{ marginLeft: 5 }}>{currentLabel}</span>
      </Button>
      <Popover
        triggerRef={triggerRef}
        placement="bottom start"
        isOpen={isOpen}
        onOpenChange={() => setIsOpen(false)}
      >
        <Menu
          onMenuSelect={item => {
            onChange(item as 'per-group' | 'global' | 'budget-order');
            setIsOpen(false);
          }}
          items={options.map(({ key, label }) => ({
            name: key,
            text: label,
          }))}
        />
      </Popover>
    </>
  );
}

type LayerSelectorProps = {
  direction: LayerDirection;
  value: GraphLayers;
  layerLabels: Record<GraphLayers, string>;
  menuItems: GraphLayers[];
  onChange: (layer: GraphLayers) => void;
};

function LayerSelector({
  direction,
  value,
  layerLabels,
  menuItems,
  onChange,
}: LayerSelectorProps) {
  const { t } = useTranslation();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const translatedDirection = direction === 'from' ? t('from') : t('to');

  return (
    <>
      <Button
        ref={triggerRef}
        variant="bare"
        onPress={() => setIsOpen(true)}
        aria-label={t('Change layer {{direction}}', {
          direction: translatedDirection,
        })}
      >
        <span style={{ marginLeft: 5 }}>{layerLabels[value]}</span>
      </Button>
      <Popover
        triggerRef={triggerRef}
        placement="bottom start"
        isOpen={isOpen}
        onOpenChange={() => setIsOpen(false)}
      >
        <Menu
          onMenuSelect={item => {
            onChange(item as GraphLayers);
            setIsOpen(false);
          }}
          items={menuItems.map(layer => ({
            name: layer,
            text: layerLabels[layer],
          }))}
        />
      </Popover>
    </>
  );
}

type GraphModeSelectorProps = {
  mode: GraphMode;
  onChange: (mode: GraphMode) => void;
};

function GraphModeSelector({ mode, onChange }: GraphModeSelectorProps) {
  return (
    <SpaceBetween gap={5}>
      <ModeButton
        selected={mode === 'spent'}
        style={{
          backgroundColor: 'inherit',
        }}
        onSelect={() => {
          onChange('spent');
        }}
      >
        <Trans>Spent</Trans>
      </ModeButton>
      <ModeButton
        selected={mode === 'budgeted'}
        onSelect={() => {
          onChange('budgeted');
        }}
        style={{
          backgroundColor: 'inherit',
        }}
      >
        <Trans>Budgeted</Trans>
      </ModeButton>
    </SpaceBetween>
  );
}

type OptionsButtonProps = {
  showPercentages: boolean;
  onTogglePercentages: () => void;
  groupAccounts: boolean;
  onToggleGroupAccounts: () => void;
};

function OptionsButton({
  showPercentages,
  onTogglePercentages,
  groupAccounts,
  onToggleGroupAccounts,
}: OptionsButtonProps) {
  const { t } = useTranslation();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <Button ref={triggerRef} onPress={() => setIsOpen(true)}>
        <Trans>Options</Trans>
      </Button>
      <Popover
        triggerRef={triggerRef}
        placement="bottom end"
        isOpen={isOpen}
        onOpenChange={() => setIsOpen(false)}
      >
        <Menu
          onMenuSelect={item => {
            if (item === 'show-percentages') onTogglePercentages();
            if (item === 'group-accounts') onToggleGroupAccounts();
          }}
          items={[
            {
              name: 'show-percentages',
              text: t('Show as percentages'),
              toggle: showPercentages,
            },
            {
              name: 'group-accounts',
              text: t('Group accounts in Spent view'),
              toggle: groupAccounts,
            },
          ]}
        />
      </Popover>
    </>
  );
}

type SankeyInnerProps = {
  widget?: SankeyWidget;
};
function SankeyInner({ widget }: SankeyInnerProps) {
  const locale = useLocale();
  const dispatch = useDispatch();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { isNarrowWidth } = useResponsive();

  const {
    conditions,
    conditionsOp,
    onApply: onApplyFilter,
    onDelete: onDeleteFilter,
    onUpdate: onUpdateFilter,
    onConditionsOpChange,
  } = useRuleConditionFilters<RuleConditionEntity>(
    widget?.meta?.conditions,
    widget?.meta?.conditionsOp,
  );

  const currentMonth = monthUtils.currentMonth();
  const [allMonths, setAllMonths] = useState([
    {
      name: currentMonth,
      pretty: monthUtils.format(currentMonth, 'MMMM yyyy', locale),
    },
  ]);

  const [start, setStart] = useState(monthUtils.currentMonth());
  const [end, setEnd] = useState(monthUtils.currentMonth());
  const [timeFrameMode, setTimeFrameMode] = useState<TimeFrame['mode']>(
    widget?.meta?.timeFrame?.mode ?? 'sliding-window',
  );
  const [datesInitialized, setDatesInitialized] = useState(false);

  const [earliestTransaction, setEarliestTransaction] = useState('');
  const [latestTransaction, setLatestTransaction] = useState('');

  const [graphMode, setGraphMode] = useState<GraphMode>(
    widget?.meta?.mode ?? 'spent',
  );

  const [topNcategories, settopNcategories] = useState<number>(
    widget?.meta?.topNcategories ?? 15,
  );

  const [cardHeight, setCardHeight] = useState(0);
  const throttledSetCardHeight = useMemo(
    () =>
      debounce(
        (height: number) => {
          setCardHeight(prev => (prev === height ? prev : height));
        },
        200,
        { leading: true, trailing: true, maxWait: 100 },
      ),
    [],
  );

  useEffect(() => {
    return () => {
      throttledSetCardHeight.cancel();
    };
  }, [throttledSetCardHeight]);

  const containerRef = useResizeObserver<HTMLDivElement>(rect => {
    throttledSetCardHeight(rect.height);
  });

  const heightBasedTopN = topNNodes(cardHeight);

  const topN = Math.min(topNcategories, heightBasedTopN);

  const [categorySort, setCategorySort] = useState<
    'per-group' | 'global' | 'budget-order'
  >(widget?.meta?.categorySort ?? 'per-group');

  const [showPercentages, setShowPercentages] = useState(
    widget?.meta?.showPercentages ?? false,
  );
  const [groupAccounts, setGroupAccounts] = useState(
    widget?.meta?.groupAccounts ?? false,
  );

  const [layerRange, setLayerRange] = useState<LayerRange>(() =>
    normalizeLayerRange(widget?.meta?.mode ?? 'spent', {
      from:
        (widget?.meta?.layerFrom as GraphLayers) ??
        getDefaultLayerRange(widget?.meta?.mode ?? 'spent').from,
      to:
        (widget?.meta?.layerTo as GraphLayers) ??
        getDefaultLayerRange(widget?.meta?.mode ?? 'spent').to,
    }),
  );

  const layerFrom = layerRange.from;
  const layerTo = layerRange.to;

  useEffect(() => {
    setLayerRange(prev => normalizeLayerRange(graphMode, prev));
  }, [graphMode]);

  const layerLabels = useMemo<Record<GraphLayers, string>>(
    () => ({
      [GraphLayers.IncomePayee]: t('Payee'),
      [GraphLayers.IncomeCategory]: t('Income category'),
      [GraphLayers.Account]: t('Account'),
      [GraphLayers.Budget]: t('Budget'),
      [GraphLayers.CategoryGroup]: t('Category group'),
      [GraphLayers.Category]: t('Category'),
    }),
    [t],
  );

  const fromLayerMenuItems = useMemo(
    () => getLayerMenuItems(graphMode, 'from', layerTo),
    [graphMode, layerTo],
  );
  const toLayerMenuItems = useMemo(
    () => getLayerMenuItems(graphMode, 'to', layerFrom),
    [graphMode, layerFrom],
  );

  function onChangeLayer(direction: LayerDirection, layer: GraphLayers) {
    setLayerRange(prev => {
      const next =
        direction === 'from'
          ? { ...prev, from: layer }
          : { ...prev, to: layer };

      return normalizeLayerRange(graphMode, next, direction);
    });
  }

  function onResetLayers() {
    setLayerRange(getDefaultLayerRange(graphMode));
  }

  const { data: { grouped: groupedCategories = [] } = { grouped: [] } } =
    useCategories();

  const baseGraphParams = useMemo(() => {
    if (!datesInitialized) {
      return null;
    }

    return createBaseGraphSpreadsheet(
      start,
      end,
      groupedCategories,
      conditions,
      conditionsOp,
      graphMode,
      groupAccounts,
    );
  }, [
    datesInitialized,
    start,
    end,
    groupedCategories,
    conditions,
    conditionsOp,
    graphMode,
    groupAccounts,
  ]);

  const defaultGetBaseGraph = async (
    _spreadsheet: unknown,
    setData: (data: Graph) => void,
  ) => setData(new Map());

  const baseGraph = useReport('sankey', baseGraphParams ?? defaultGetBaseGraph);
  const baseGraphRef = useRef(baseGraph);

  useEffect(() => {
    if (baseGraph) {
      baseGraphRef.current = baseGraph;
    }
  }, [baseGraph]);

  const displayBaseGraph = baseGraph || baseGraphRef.current;
  const displayData: SankeyData | null = useMemo(() => {
    if (!displayBaseGraph) {
      return null;
    }

    return buildSankeyData(
      displayBaseGraph,
      topN,
      groupedCategories,
      categorySort,
      layerFrom,
      layerTo,
    );
  }, [
    displayBaseGraph,
    topN,
    groupedCategories,
    categorySort,
    layerFrom,
    layerTo,
  ]);

  useEffect(() => {
    async function run() {
      const earliestTransaction = await send('get-earliest-transaction');
      const earliestTransactionDate = earliestTransaction
        ? earliestTransaction.date
        : monthUtils.currentDay();
      setEarliestTransaction(earliestTransactionDate);

      const latestTransaction = await send('get-latest-transaction');
      const latestTransactionDate = latestTransaction
        ? latestTransaction.date
        : monthUtils.currentDay();
      setLatestTransaction(latestTransactionDate);

      const [initialStart, initialEnd, initialMode] = calculateTimeRange(
        widget?.meta?.timeFrame,
        undefined,
        latestTransactionDate,
      );
      setStart(initialStart);
      setEnd(initialEnd);
      setTimeFrameMode(initialMode);
      setDatesInitialized(true);

      const currentMonth = monthUtils.currentMonth();
      let earliestMonth = earliestTransaction
        ? monthUtils.monthFromDate(
            d.parseISO(fromDateRepr(earliestTransaction.date)),
          )
        : currentMonth;
      const latestTransactionMonth = latestTransaction
        ? monthUtils.monthFromDate(
            d.parseISO(fromDateRepr(latestTransaction.date)),
          )
        : currentMonth;

      const latestMonth =
        latestTransactionMonth > currentMonth
          ? latestTransactionMonth
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
          pretty: monthUtils.format(month, 'MMMM yyyy', locale),
        }))
        .reverse();

      setAllMonths(allMonths);
    }
    void run();
  }, [locale, widget?.meta?.timeFrame]);
  function onChangeDates(start: string, end: string, mode: TimeFrame['mode']) {
    setStart(start);
    setEnd(end);
    setTimeFrameMode(mode);
  }

  const updateDashboardWidgetMutation = useUpdateDashboardWidgetMutation();
  async function onSaveWidget() {
    if (!widget) {
      throw new Error('No widget that could be saved.');
    }

    updateDashboardWidgetMutation.mutate(
      {
        widget: {
          id: widget.id,
          meta: {
            ...(widget.meta ?? {}),
            conditions,
            conditionsOp,
            mode: graphMode,
            topNcategories,
            categorySort,
            showPercentages,
            layerFrom,
            layerTo,
            timeFrame: {
              start,
              end,
              mode: timeFrameMode,
            },
            groupAccounts,
          },
        },
      },
      {
        onSuccess: () => {
          dispatch(
            addNotification({
              notification: {
                type: 'message',
                message: t('Dashboard widget successfully saved.'),
              },
            }),
          );
        },
      },
    );
  }

  const onSaveWidgetName = (newName: string) => {
    if (!widget) {
      throw new Error('No widget that could be saved.');
    }

    const name = newName || t('Sankey');
    updateDashboardWidgetMutation.mutate({
      widget: {
        id: widget.id,
        meta: {
          ...(widget.meta ?? {}),
          name,
        },
      },
    });
  };

  const title = widget?.meta?.name || t('Sankey');

  const ignoredFilterFields =
    graphMode === 'budgeted'
      ? [
          ...new Set(
            conditions
              .filter(
                c => c.field !== 'category' && c.field !== 'category_group',
              )
              .map(c => mapField(c.field)),
          ),
        ]
      : [];

  const ignoredFilterFieldsList = useFormatList(
    ignoredFilterFields,
    i18n.language,
  );

  if (!datesInitialized || !displayData) {
    return <LoadingIndicator />;
  }

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
      <Header
        allMonths={allMonths}
        start={start}
        end={end}
        mode={timeFrameMode}
        show1Month
        earliestTransaction={earliestTransaction}
        latestTransaction={latestTransaction}
        onChangeDates={onChangeDates}
        filters={conditions}
        onApply={onApplyFilter}
        onUpdateFilter={onUpdateFilter}
        onDeleteFilter={onDeleteFilter}
        conditionsOp={conditionsOp}
        onConditionsOpChange={onConditionsOpChange}
        filterExclude={['date']}
        inlineContent={
          <>
            <View
              style={{
                width: 1,
                height: 28,
                backgroundColor: theme.pillBorderDark,
                marginRight: 10,
                marginLeft: 10,
              }}
            />
            <GraphModeSelector mode={graphMode} onChange={setGraphMode} />
            <View
              style={{
                width: 1,
                height: 28,
                backgroundColor: theme.pillBorderDark,
                marginRight: 10,
                marginLeft: 10,
              }}
            />
            <TopNSelector value={topNcategories} onChange={settopNcategories} />
            <CategorySortSelector
              value={categorySort}
              onChange={setCategorySort}
            />
            <View
              style={{
                width: 1,
                height: 28,
                backgroundColor: theme.pillBorderDark,
                marginRight: 10,
                marginLeft: 10,
              }}
            />
            <SvgLayers style={{ width: 12, height: 12 }} />
            <LayerSelector
              direction="from"
              value={layerFrom}
              layerLabels={layerLabels}
              menuItems={fromLayerMenuItems}
              onChange={layer => onChangeLayer('from', layer)}
            />
            <SvgCheveronRight style={{ width: 12, height: 12 }} />
            <LayerSelector
              direction="to"
              value={layerTo}
              layerLabels={layerLabels}
              menuItems={toLayerMenuItems}
              onChange={layer => onChangeLayer('to', layer)}
            />
            <Button
              variant="bare"
              onPress={onResetLayers}
              aria-label={t('Reset layers')}
            >
              <SvgRefresh style={{ width: 12, height: 12 }} />
            </Button>
          </>
        }
      >
        <View style={{ marginRight: 4 }}>
          <OptionsButton
            showPercentages={showPercentages}
            onTogglePercentages={() => setShowPercentages(v => !v)}
            groupAccounts={groupAccounts}
            onToggleGroupAccounts={() => setGroupAccounts(v => !v)}
          />
        </View>
        {widget && (
          <Button variant="primary" onPress={onSaveWidget}>
            <Trans>Save widget</Trans>
          </Button>
        )}
      </Header>
      <View
        style={{
          backgroundColor: theme.tableBackground,
          padding: 20,
          paddingTop: 0,
          flex: '1 0 auto',
          overflowY: 'visible',
        }}
      >
        <View
          style={{
            display: 'flex',
            flexDirection: 'row',
            paddingTop: 0,
            flexGrow: 1,
          }}
        >
          <View
            style={{
              flexGrow: 1,
            }}
          >
            <View
              style={{
                backgroundColor: theme.tableBackground,
                padding: 20,
                paddingTop: 0,
                flex: '1 0 auto',
                overflowY: 'auto',
              }}
            >
              <View
                style={{
                  flexDirection: 'column',
                  flexGrow: 1,
                  padding: 10,
                  paddingTop: 10,
                }}
              >
                {displayData &&
                displayData.links &&
                displayData.links.length > 0 ? (
                  <View
                    ref={containerRef}
                    style={{
                      flexDirection: 'column',
                      flexGrow: 1,
                    }}
                  >
                    <SankeyGraph
                      style={{ flexGrow: 1 }}
                      data={displayData}
                      showPercentages={showPercentages}
                    />
                  </View>
                ) : (
                  <View
                    style={{
                      flexGrow: 1,
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: theme.pageTextSubdued,
                    }}
                  >
                    <Text style={{ fontSize: 16, textAlign: 'center' }}>
                      {graphMode === 'budgeted' && (
                        <Trans>
                          No data available for this period. Try budgeting
                          categories or selecting a different period.
                        </Trans>
                      )}
                      {graphMode === 'spent' && (
                        <Trans>
                          No data available for this period. Try adding
                          transactions or selecting a different period.
                        </Trans>
                      )}
                    </Text>
                  </View>
                )}

                {ignoredFilterFields.length > 0 && (
                  <View
                    style={{
                      marginTop: 10,
                      padding: '8px 12px',
                      backgroundColor: theme.warningBackground,
                      borderRadius: 4,
                      color: theme.warningText,
                    }}
                  >
                    <Text style={{ fontSize: 13 }}>
                      <Trans>
                        Filters on <strong>{ignoredFilterFieldsList}</strong>{' '}
                        are ignored in <strong>Budgeted</strong> mode.
                      </Trans>
                    </Text>
                  </View>
                )}

                {!isNarrowWidth && (
                  <View style={{ marginTop: 30 }}>
                    <Trans>
                      <Paragraph>
                        <strong>What is a Sankey plot?</strong>
                      </Paragraph>
                      <Paragraph>
                        A Sankey plot visualizes the flow of quantities between
                        multiple categories, emphasizing the distribution and
                        proportional relationships of data streams.
                      </Paragraph>
                      <Paragraph>
                        <strong>View options:</strong>
                      </Paragraph>
                      <Paragraph>
                        <ul style={{ marginTop: 0, paddingLeft: 20 }}>
                          <li style={{ marginBottom: 5 }}>
                            <strong>Spent:</strong> Displays actual spending by
                            category from transactions.
                          </li>
                          <li style={{ marginBottom: 5 }}>
                            <strong>Budgeted:</strong> Shows how your budget is
                            allocated across categories.
                          </li>
                        </ul>
                        <strong>Disclaimer:</strong> A Sankey chart cannot
                        directly represent negative numbers. In some cases, such
                        as when funds are reallocated from categories with
                        negative budgeting (e.g. using savings to cover
                        overspending), the chart structure may differ from the
                        main budget overview. As a result, some category totals
                        and flows in this diagram may not exactly match the
                        summary figures elsewhere in the app.
                      </Paragraph>
                    </Trans>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>
      </View>
    </Page>
  );
}
