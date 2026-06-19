import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useParams } from 'react-router';

import { Button } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { Select } from '@actual-app/components/select';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { Resizable } from 're-resizable';

import * as monthUtils from 'loot-core/shared/months';
import type { ChartSpec } from 'loot-core/types/chart-spec';
import type { QueryReportWidget, TimeFrame } from 'loot-core/types/models';

import { QueryTabBar } from './QueryTabBar';

import { EditablePageHeaderTitle } from '@desktop-client/components/EditablePageHeaderTitle';
import { MobileBackButton } from '@desktop-client/components/mobile/MobileBackButton';
import {
  MobilePageHeader,
  Page,
  PageHeader,
} from '@desktop-client/components/Page';
import { ChartConfigPanel } from '@desktop-client/components/query-report/ChartConfigPanel';
import { EncodingConfig } from '@desktop-client/components/query-report/EncodingConfig';
import { MarkSelector } from '@desktop-client/components/query-report/MarkSelector';
import { ChartRenderer } from '@desktop-client/components/query-report/visualizations/ChartRenderer';
import { LoadingIndicator } from '@desktop-client/components/reports/LoadingIndicator';
import { useDashboardWidget } from '@desktop-client/hooks/useDashboardWidget';
import { useFeatureFlag } from '@desktop-client/hooks/useFeatureFlag';
import { useMultiQueryReport } from '@desktop-client/hooks/useMultiQueryReport';
import { useNavigate } from '@desktop-client/hooks/useNavigate';
import { addNotification } from '@desktop-client/notifications/notificationsSlice';
import { resolveChannels } from '@desktop-client/queries/resolveChannels';
import { useDispatch } from '@desktop-client/redux';
import { useUpdateDashboardWidgetMutation } from '@desktop-client/reports/mutations';

const AqlEditor = lazy(() =>
  import('../../query-report/AqlEditor').then(module => ({
    default: module.AqlEditor,
  })),
);

const DEFAULT_QUERY_SOURCE = `q('transactions')\n  .select('*')\n  .limit(100)`;
const DEFAULT_CHART_SPEC: ChartSpec = { mark: 'table', encoding: {} };

type ConfigTab = 'encoding' | 'customize';
type TimeRangeValue =
  | 'none'
  | 'last1'
  | 'last3'
  | 'last6'
  | 'last12'
  | 'ytd'
  | 'lastMonth'
  | 'lastYear'
  | 'priorYearToDate'
  | 'allTime';

function timeFrameFromRange(value: TimeRangeValue): TimeFrame | undefined {
  const end = monthUtils.currentMonth();
  switch (value) {
    case 'none':
      return undefined;
    case 'last1':
      return {
        start: monthUtils.subMonths(end, 0),
        end,
        mode: 'sliding-window',
      };
    case 'last3':
      return {
        start: monthUtils.subMonths(end, 2),
        end,
        mode: 'sliding-window',
      };
    case 'last6':
      return {
        start: monthUtils.subMonths(end, 5),
        end,
        mode: 'sliding-window',
      };
    case 'last12':
      return {
        start: monthUtils.subMonths(end, 11),
        end,
        mode: 'sliding-window',
      };
    case 'ytd':
      return {
        start: monthUtils.currentYear() + '-01',
        end,
        mode: 'yearToDate',
      };
    case 'lastMonth':
      return {
        start: monthUtils.subMonths(end, 1),
        end: monthUtils.subMonths(end, 1),
        mode: 'lastMonth',
      };
    case 'lastYear':
      return {
        start: monthUtils.getYearStart(monthUtils.prevYear(end)),
        end: monthUtils.getYearEnd(monthUtils.prevYear(end)),
        mode: 'lastYear',
      };
    case 'priorYearToDate':
      return {
        start: monthUtils.getYearStart(monthUtils.prevYear(end)),
        end: monthUtils.prevYear(monthUtils.currentDate(), 'yyyy-MM-dd'),
        mode: 'priorYearToDate',
      };
    case 'allTime':
      return {
        start: '2000-01',
        end,
        mode: 'full',
      };
    default:
      return undefined;
  }
}

function timeRangeFromTimeFrame(tf: TimeFrame | undefined): TimeRangeValue {
  if (!tf) return 'none';
  switch (tf.mode) {
    case 'sliding-window': {
      const offset = monthUtils.differenceInCalendarMonths(tf.end, tf.start);
      if (offset === 0) return 'last1';
      if (offset === 2) return 'last3';
      if (offset === 5) return 'last6';
      if (offset === 11) return 'last12';
      return 'last3';
    }
    case 'yearToDate':
      return 'ytd';
    case 'lastMonth':
      return 'lastMonth';
    case 'lastYear':
      return 'lastYear';
    case 'priorYearToDate':
      return 'priorYearToDate';
    case 'full':
      return 'allTime';
    case 'static':
      return 'none';
    default:
      return 'none';
  }
}

const TIME_RANGE_OPTIONS: Array<readonly [TimeRangeValue, string]> = [
  ['none', 'No date filter'],
  ['last1', '1 month'],
  ['last3', 'Last 3 months'],
  ['last6', 'Last 6 months'],
  ['last12', '1 year'],
  ['ytd', 'Year to date'],
  ['lastMonth', 'Last month'],
  ['lastYear', 'Last year'],
  ['priorYearToDate', 'Prior year to date'],
  ['allTime', 'All time'],
];

function getAllSelectedFields(encoding: ChartSpec['encoding']): string[] {
  if (!encoding) return [];
  const fields: string[] = [];
  for (const key of ['x', 'y', 'series', 'color', 'size', 'text'] as const) {
    const ch = encoding[key];
    if (!ch) continue;
    if (Array.isArray(ch)) {
      fields.push(...ch.map(c => c.field));
    } else {
      fields.push(ch.field);
    }
  }
  if (encoding.tooltip) {
    fields.push(...encoding.tooltip.map(c => c.field));
  }
  return fields;
}

export function QueryReport() {
  const params = useParams();
  const { data: widget, isPending } = useDashboardWidget<QueryReportWidget>({
    id: params.id,
    type: 'query-report',
  });

  if (isPending) {
    return <LoadingIndicator />;
  }

  return <QueryReportInner widget={widget} />;
}

type QueryReportInnerProps = {
  widget?: QueryReportWidget;
};

function QueryReportInner({ widget }: QueryReportInnerProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isNarrowWidth } = useResponsive();
  const isFeatureFlagEnabled = useFeatureFlag('queryReport');

  const defaultSources =
    (widget?.meta?.queries || []).length > 0
      ? widget.meta!.queries.map(q => q.source)
      : [DEFAULT_QUERY_SOURCE];

  const [querySources, setQuerySources] = useState<string[]>(defaultSources);
  const [queryNames, setQueryNames] = useState<string[]>(() =>
    (widget?.meta?.queries || []).length > 0
      ? widget.meta!.queries.map(q => q.label ?? '')
      : [''],
  );
  const [activeQueryIndex, setActiveQueryIndex] = useState(0);
  const [chartSpec, setChartSpec] = useState<ChartSpec>(
    widget?.meta?.chartSpec ?? DEFAULT_CHART_SPEC,
  );
  const [activeTab, setActiveTab] = useState<ConfigTab>('encoding');
  const [timeRange, setTimeRange] = useState<TimeRangeValue>(() =>
    timeRangeFromTimeFrame(widget?.meta?.defaultTimeFrame),
  );
  const [mergeKey, setMergeKey] = useState<string | undefined>(
    widget?.meta?.mergeKey,
  );

  const title = widget?.meta?.name || t('Query Report');

  const activeTimeFrame = useMemo<TimeFrame | undefined>(
    () => timeFrameFromRange(timeRange),
    [timeRange],
  );

  const {
    merged: result,
    isLoading,
    mergeError,
    perQueryErrors,
    results,
    autoMergeKey,
  } = useMultiQueryReport(
    querySources,
    activeTimeFrame ?? widget?.meta?.defaultTimeFrame,
    mergeKey,
  );

  const resolved = useMemo(
    () => (result ? resolveChannels(chartSpec, result) : null),
    [chartSpec, result],
  );

  const intersectingColumns = useMemo(() => {
    if (results.length < 2) return [];
    const columnSets = results.map(r => new Set(r.columns.map(c => c.name)));
    return [...columnSets[0]].filter(name =>
      columnSets.every(s => s.has(name)),
    );
  }, [results]);

  const mergeKeyOptions = useMemo(() => {
    return intersectingColumns.map(name => ({
      value: name,
      label: name,
    }));
  }, [intersectingColumns]);

  const activeError = perQueryErrors[activeQueryIndex] ?? null;

  useEffect(() => {
    if (!result) return;

    const validColumnNames = new Set(result.columns.map(c => c.name));
    const selectedFields = getAllSelectedFields(chartSpec.encoding);
    const hasStaleFields = selectedFields.some(f => !validColumnNames.has(f));

    if (hasStaleFields) {
      dispatch(
        addNotification({
          notification: {
            type: 'message',
            message: t('Query result changed; visualization reset.'),
          },
        }),
      );
      setChartSpec(prev => ({ ...prev, encoding: {} }));
    }
  }, [result, t, dispatch, chartSpec.encoding]);

  const updateDashboardWidgetMutation = useUpdateDashboardWidgetMutation();

  const onSaveWidgetName = useCallback(
    async (newName: string) => {
      if (!widget) {
        dispatch(
          addNotification({
            notification: {
              type: 'error',
              message: t('Cannot save: No widget available.'),
            },
          }),
        );
        return;
      }

      const name = newName || t('Query Report');
      const currentDefaultTimeFrame =
        timeFrameFromRange(timeRange) ?? widget.meta?.defaultTimeFrame;

      updateDashboardWidgetMutation.mutate({
        widget: {
          id: widget.id,
          meta: {
            ...(widget.meta ?? {}),
            name,
            defaultTimeFrame: currentDefaultTimeFrame,
          },
        },
      });
    },
    [widget, updateDashboardWidgetMutation, dispatch, t, timeRange],
  );

  const onSaveWidget = useCallback(() => {
    if (!widget) {
      dispatch(
        addNotification({
          notification: {
            type: 'error',
            message: t('Cannot save: No widget available.'),
          },
        }),
      );
      return;
    }

    const updatedQueries = querySources.map((source, i) => ({
      source,
      ...(queryNames[i] ? { label: queryNames[i] } : {}),
    }));

    const currentDefaultTimeFrame =
      timeFrameFromRange(timeRange) ?? widget.meta?.defaultTimeFrame;

    updateDashboardWidgetMutation.mutate(
      {
        widget: {
          id: widget.id,
          meta: {
            ...(widget.meta ?? {}),
            name: widget.meta?.name || t('Query Report'),
            queries: updatedQueries,
            mergeKey: mergeKey ?? null,
            chartSpec,
            defaultTimeFrame: currentDefaultTimeFrame,
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
  }, [
    widget,
    querySources,
    queryNames,
    mergeKey,
    chartSpec,
    updateDashboardWidgetMutation,
    dispatch,
    t,
    timeRange,
  ]);

  const handleMarkChange = (nextSpec: ChartSpec) => {
    setChartSpec(nextSpec);
  };

  if (!isFeatureFlagEnabled) {
    return (
      <Page header={<PageHeader title={t('Query Report')} />}>
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            color: theme.pageTextSubdued,
          }}
        >
          <Trans>
            Query Report is an experimental feature. Enable it in Settings →
            Experimental.
          </Trans>
        </View>
      </Page>
    );
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
      {widget && (
        <View
          style={{
            padding: 20,
            display: 'flex',
            justifyContent: 'flex-end',
            flexDirection: 'row',
            background: theme.pageBackground,
          }}
        >
          <Button
            variant="primary"
            onPress={onSaveWidget}
            style={{ width: 140 }}
          >
            <Trans>Save widget</Trans>
          </Button>
        </View>
      )}
      <View
        style={{
          width: '100%',
          flex: 1,
          background: theme.pageBackground,
          display: 'flex',
          flexDirection: isNarrowWidth ? 'column' : 'row',
        }}
      >
        <View
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
          }}
        >
          <View
            style={{
              padding: 20,
              flex: 1,
              overflow: 'auto',
              backgroundColor: theme.tableBackground,
            }}
          >
            <div
              style={{
                fontSize: 14,
                color: theme.pageTextSubdued,
                marginBottom: 10,
              }}
            >
              <Trans>Result:</Trans>
            </div>
            {isLoading && (
              <View
                style={{
                  padding: 40,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <LoadingIndicator message={t('Executing query...')} />
              </View>
            )}
            {mergeError && result && (
              <View
                style={{
                  padding: 10,
                  backgroundColor: theme.warningBackground || '#fff8e1',
                  borderRadius: 6,
                  color: theme.warningText,
                  fontSize: 12,
                  marginBottom: 8,
                }}
              >
                {mergeError}
              </View>
            )}
            {!isLoading && result && (
              <ChartRenderer result={result} spec={chartSpec} />
            )}
            {!isLoading && !result && perQueryErrors.some(e => e !== null) && (
              <View
                style={{
                  padding: 16,
                  backgroundColor: theme.errorBackground || '#fff3f3',
                  borderRadius: 6,
                  color: theme.errorText,
                  fontSize: 13,
                  fontFamily: 'monospace',
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 4 }}>
                  {t('Compile Error')}
                </div>
                <div>
                  {perQueryErrors.find(e => e !== null)?.message ??
                    t('Unknown error')}
                </div>
              </View>
            )}
            {!isLoading && !result && !perQueryErrors.some(e => e !== null) && (
              <View
                style={{
                  padding: 40,
                  color: theme.pageTextSubdued,
                  textAlign: 'center',
                }}
              >
                <Trans>Write a query and it will execute automatically.</Trans>
              </View>
            )}
          </View>
        </View>

        <View
          style={{
            width: isNarrowWidth ? '100%' : 450,
            minWidth: isNarrowWidth ? undefined : 350,
            borderLeft: isNarrowWidth
              ? 'none'
              : `1px solid ${theme.tableBorder}`,
            borderTop: isNarrowWidth
              ? `1px solid ${theme.tableBorder}`
              : 'none',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'auto',
          }}
        >
          <View
            style={{
              padding: 20,
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <QueryTabBar
              count={querySources.length}
              activeIndex={activeQueryIndex}
              onSelect={setActiveQueryIndex}
              names={queryNames}
              onAdd={() => {
                setQuerySources(prev => [
                  ...prev,
                  `q('transactions')\n  .select('*')\n  .limit(100)`,
                ]);
                setQueryNames(prev => [...prev, '']);
                setActiveQueryIndex(querySources.length);
              }}
              onRemove={index => {
                setQuerySources(prev => prev.filter((_, i) => i !== index));
                setQueryNames(prev => prev.filter((_, i) => i !== index));
                if (activeQueryIndex >= index) {
                  setActiveQueryIndex(Math.max(0, index - 1));
                }
              }}
              onRename={(index, name) => {
                setQueryNames(prev => {
                  const next = [...prev];
                  next[index] = name;
                  return next;
                });
              }}
            />
            <div
              style={{
                fontSize: 13,
                color: theme.pageTextSubdued,
                marginBottom: 8,
              }}
            >
              <Trans>Query {activeQueryIndex + 1}</Trans>
            </div>
            <Resizable
              defaultSize={{ width: '100%', height: 200 }}
              minHeight={100}
              maxHeight={400}
              enable={{
                top: false,
                right: false,
                bottom: true,
                left: false,
                topRight: false,
                bottomRight: false,
                bottomLeft: false,
                topLeft: false,
              }}
            >
              <View
                style={{
                  flex: 1,
                  border: `1px solid ${theme.formInputBorder}`,
                  borderRadius: 6,
                  overflow: 'hidden',
                  height: '100%',
                }}
              >
                <Suspense
                  fallback={
                    <div style={{ padding: 10 }}>
                      <Trans>Loading editor...</Trans>
                    </div>
                  }
                >
                  <AqlEditor
                    value={querySources[activeQueryIndex] ?? ''}
                    onChange={value => {
                      setQuerySources(prev => {
                        const next = [...prev];
                        next[activeQueryIndex] = value;
                        return next;
                      });
                    }}
                    error={activeError?.message ?? null}
                    showLineNumbers
                  />
                </Suspense>
              </View>
            </Resizable>
            <View
              style={{
                borderTop: `1px solid ${theme.tableBorder}`,
                marginTop: 16,
                marginBottom: 4,
              }}
            />
            <div
              style={{
                fontSize: 13,
                color: theme.pageTextSubdued,
                marginTop: 12,
                marginBottom: 8,
              }}
            >
              <Trans>Time range</Trans>
            </div>
            <Select
              value={timeRange}
              options={TIME_RANGE_OPTIONS.map(([value, label]) => [
                value,
                t(label),
              ])}
              onChange={v => setTimeRange(v as TimeRangeValue)}
            />
            {timeRange === 'none' &&
              querySources.some(
                s => s.includes(':startDate') || s.includes(':endDate'),
              ) && (
                <div
                  style={{
                    fontSize: 11,
                    color: theme.warningText,
                    marginTop: 4,
                  }}
                >
                  <Trans>
                    Your query uses date variables but no time range is
                    selected. Select a time range to provide values.
                  </Trans>
                </div>
              )}
            {querySources.length > 1 && (
              <>
                <div
                  style={{
                    fontSize: 13,
                    color: theme.pageTextSubdued,
                    marginTop: 16,
                  }}
                >
                  <Trans>Merge key</Trans>
                </div>
                <Select
                  value={mergeKey || ''}
                  options={[
                    [
                      '',
                      mergeKey
                        ? t('Auto')
                        : autoMergeKey
                          ? `Auto (${autoMergeKey})`
                          : t('Auto'),
                    ],
                    ...mergeKeyOptions.map(o => [o.value, o.label] as const),
                  ]}
                  onChange={v => setMergeKey(v || undefined)}
                />
                {mergeError && (
                  <div
                    style={{
                      fontSize: 11,
                      color: theme.warningText,
                      marginTop: 4,
                    }}
                  >
                    {mergeError}
                  </div>
                )}
                <div
                  style={{
                    fontSize: 11,
                    color: theme.pageTextSubdued,
                    marginTop: 4,
                    lineHeight: 1.5,
                  }}
                >
                  <Trans>
                    All queries must share this column to combine results.
                  </Trans>
                </div>
              </>
            )}
            <div
              style={{
                fontSize: 13,
                color: theme.pageTextSubdued,
                marginTop: 16,
                marginBottom: 8,
              }}
            >
              <Trans>Visualization</Trans>
            </div>
            <MarkSelector value={chartSpec} onChange={handleMarkChange} />
            <View
              style={{
                flexDirection: 'row',
                gap: 8,
                marginTop: 12,
              }}
            >
              <Button
                variant={activeTab === 'encoding' ? 'primary' : 'normal'}
                onPress={() => setActiveTab('encoding')}
                style={{ flex: 1 }}
              >
                <Trans>Encoding</Trans>
              </Button>
              <Button
                variant={activeTab === 'customize' ? 'primary' : 'normal'}
                onPress={() => setActiveTab('customize')}
                style={{ flex: 1 }}
              >
                <Trans>Customize</Trans>
              </Button>
            </View>
            {activeTab === 'encoding' && (
              <View style={{ marginTop: 12 }}>
                <EncodingConfig
                  result={result ?? null}
                  chartSpec={chartSpec}
                  onChartSpecChange={setChartSpec}
                />
              </View>
            )}
            {activeTab === 'customize' && (
              <View style={{ marginTop: 12 }}>
                <ChartConfigPanel
                  result={result ?? null}
                  chartSpec={chartSpec}
                  resolved={resolved}
                  onChartSpecChange={setChartSpec}
                />
              </View>
            )}
          </View>
        </View>
      </View>
    </Page>
  );
}
