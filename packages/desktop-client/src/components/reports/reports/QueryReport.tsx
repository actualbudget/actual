import { lazy, Suspense, useCallback, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useParams } from 'react-router';

import { Button } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import type { ChartSpec } from 'loot-core/types/chart-spec';
import type { QueryReportWidget } from 'loot-core/types/models';

import { EditablePageHeaderTitle } from '@desktop-client/components/EditablePageHeaderTitle';
import { MobileBackButton } from '@desktop-client/components/mobile/MobileBackButton';
import {
  MobilePageHeader,
  Page,
  PageHeader,
} from '@desktop-client/components/Page';
import { EncodingConfig } from '@desktop-client/components/query-report/EncodingConfig';
import { ChartRenderer } from '@desktop-client/components/query-report/visualizations/ChartRenderer';
import { LoadingIndicator } from '@desktop-client/components/reports/LoadingIndicator';
import { useDashboardWidget } from '@desktop-client/hooks/useDashboardWidget';
import { useFeatureFlag } from '@desktop-client/hooks/useFeatureFlag';
import { useNavigate } from '@desktop-client/hooks/useNavigate';
import { useQueryReport } from '@desktop-client/hooks/useQueryReport';
import { addNotification } from '@desktop-client/notifications/notificationsSlice';
import { useDispatch } from '@desktop-client/redux';
import { useUpdateDashboardWidgetMutation } from '@desktop-client/reports/mutations';

const AqlEditor = lazy(() =>
  import('../../query-report/AqlEditor').then(module => ({
    default: module.AqlEditor,
  })),
);

const DEFAULT_QUERY_SOURCE = `q('transactions')\n  .select('*')\n  .limit(100)`;
const DEFAULT_CHART_SPEC: ChartSpec = { mark: 'table', encoding: {} };

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

  const [querySource, setQuerySource] = useState(
    widget?.meta?.queries?.[0]?.source || DEFAULT_QUERY_SOURCE,
  );
  const [chartSpec, setChartSpec] = useState<ChartSpec>(
    widget?.meta?.chartSpec ?? DEFAULT_CHART_SPEC,
  );

  const title = widget?.meta?.name || t('Query Report');

  const { result, isLoading, error } = useQueryReport(
    querySource,
    widget?.meta?.defaultTimeFrame,
  );

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
      updateDashboardWidgetMutation.mutate({
        widget: {
          id: widget.id,
          meta: {
            ...(widget.meta ?? {}),
            name,
          },
        },
      });
    },
    [widget, updateDashboardWidgetMutation, dispatch, t],
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

    const currentQueries = widget.meta?.queries || [];
    const updatedQueries =
      currentQueries.length > 0
        ? currentQueries.map((q, i) =>
            i === 0 ? { ...q, source: querySource } : q,
          )
        : [{ source: querySource }];

    updateDashboardWidgetMutation.mutate(
      {
        widget: {
          id: widget.id,
          meta: {
            ...(widget.meta ?? {}),
            queries: updatedQueries,
            chartSpec,
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
    querySource,
    chartSpec,
    updateDashboardWidgetMutation,
    dispatch,
    t,
  ]);

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
            {error && (
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
                  {error.type === 'compile-error'
                    ? t('Compile Error')
                    : error.type === 'runtime-error'
                      ? t('Runtime Error')
                      : t('Error')}
                </div>
                <div>{error.message}</div>
              </View>
            )}
            {!isLoading && !error && result && (
              <ChartRenderer result={result} spec={chartSpec} />
            )}
            {!isLoading && !error && !result && (
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
          }}
        >
          <View
            style={{
              padding: 20,
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
            }}
          >
            <div
              style={{
                fontSize: 13,
                color: theme.pageTextSubdued,
                marginBottom: 8,
              }}
            >
              <Trans>AQL Query:</Trans>
            </div>
            <View
              style={{
                flex: 1,
                border: `1px solid ${theme.formInputBorder}`,
                borderRadius: 6,
                overflow: 'hidden',
                minHeight: 200,
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
                  value={querySource}
                  onChange={setQuerySource}
                  error={error?.message ?? null}
                  showLineNumbers
                />
              </Suspense>
            </View>
            <div
              style={{
                fontSize: 11,
                color: theme.pageTextSubdued,
                marginTop: 8,
                lineHeight: 1.5,
              }}
            >
              <Trans>
                Write AQL queries using the <code>q()</code> builder. Example:{' '}
                <code>
                  q(&apos;transactions&apos;).select(&apos;*&apos;).limit(100)
                </code>
              </Trans>
            </div>
          </View>
          <View
            style={{
              padding: 20,
              borderTop: `1px solid ${theme.tableBorder}`,
              backgroundColor: theme.pageBackground,
            }}
          >
            <EncodingConfig
              result={result ?? null}
              chartSpec={chartSpec}
              onChartSpecChange={setChartSpec}
            />
          </View>
        </View>
      </View>
    </Page>
  );
}
