import { useMemo } from 'react';
import { Trans } from 'react-i18next';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { getAxisFormatter, getSeriesColor } from './chart-helpers';

import { useFormat } from '@desktop-client/hooks/useFormat';
import type { QueryResult } from '@desktop-client/queries/processQueryResult';
import type { ResolvedChartSpec } from '@desktop-client/queries/resolveChannels';

type ColumnBarMarkProps = {
  result: QueryResult;
  resolved: ResolvedChartSpec;
  data: Record<string, unknown>[];
  seriesKeys: string[];
  compact?: boolean;
};

export function ColumnBarMark({
  result,
  resolved,
  data,
  seriesKeys,
  compact = false,
}: ColumnBarMarkProps) {
  const format = useFormat();
  const isBar = resolved.mark === 'bar';

  const xChannel = resolved.encoding.x;
  const xField =
    xChannel && !Array.isArray(xChannel) ? xChannel.field : undefined;

  const yChannels = resolved.encoding.y;
  const yFieldList: string[] = useMemo(() => {
    if (!yChannels) return [];
    return Array.isArray(yChannels)
      ? yChannels.map(ch => ch.field)
      : [yChannels.field];
  }, [yChannels]);

  const hasColorSeries = seriesKeys.length > 0;
  const useMultiYSeries = !hasColorSeries && yFieldList.length > 1;

  const xFormatter = useMemo(
    () =>
      xChannel && !Array.isArray(xChannel)
        ? getAxisFormatter(xChannel, result.columns, format)
        : undefined,
    [xChannel, result.columns, format],
  );

  const valueFormatter = useMemo(
    () => (value: unknown) => {
      if (value === null || value === undefined) return '';
      if (typeof value === 'number') {
        return format(value, 'financial-no-decimals');
      }
      return String(value);
    },
    [format],
  );

  const stackMode = resolved.config?.stack;
  const stackId =
    stackMode === 'stack' || stackMode === 'normalize' ? 'a' : undefined;
  const isNormalized = stackMode === 'normalize';

  if (!xField) {
    return (
      <View
        style={{
          padding: 20,
          color: theme.pageTextSubdued,
          textAlign: 'center',
        }}
      >
        <Trans>No x-axis field available</Trans>
      </View>
    );
  }

  const renderBars = () => {
    if (hasColorSeries) {
      return seriesKeys.map((key, i) => (
        <Bar
          key={key}
          dataKey={key}
          stackId={stackId}
          fill={getSeriesColor(i)}
          isAnimationActive={false}
        />
      ));
    }
    if (useMultiYSeries) {
      return yFieldList.map((field, i) => (
        <Bar
          key={field}
          dataKey={field}
          stackId={stackId}
          fill={getSeriesColor(i)}
          isAnimationActive={false}
        />
      ));
    }
    const singleField = yFieldList[0];
    if (!singleField) {
      return (
        <Bar
          dataKey={xField}
          stackId={stackId}
          fill={getSeriesColor(0)}
          isAnimationActive={false}
        />
      );
    }
    return (
      <Bar
        dataKey={singleField}
        stackId={stackId}
        fill={getSeriesColor(0)}
        isAnimationActive={false}
      />
    );
  };

  return (
    <View
      style={{
        width: '100%',
        height: '100%',
        padding: compact ? 4 : 12,
        minHeight: compact ? 0 : 200,
      }}
    >
      <ResponsiveContainer width="100%" height={compact ? 120 : '100%'}>
        <BarChart
          data={data}
          layout={isBar ? 'vertical' : 'horizontal'}
          margin={
            compact
              ? { top: 0, right: 0, left: 0, bottom: 0 }
              : { top: 8, right: 16, left: 8, bottom: 8 }
          }
        >
          {!compact && <CartesianGrid strokeDasharray="3 3" />}
          {isBar ? (
            <>
              <XAxis
                type="number"
                hide={compact}
                tickFormatter={valueFormatter}
                tick={{ fill: theme.pageText, fontSize: 11 }}
              />
              <YAxis
                type="category"
                dataKey={xField}
                hide={compact}
                tickFormatter={xFormatter}
                tick={{ fill: theme.pageText, fontSize: 11 }}
                width={80}
              />
            </>
          ) : (
            <>
              <XAxis
                dataKey={xField}
                hide={compact}
                tickFormatter={xFormatter}
                tick={{ fill: theme.pageText, fontSize: 11 }}
              />
              <YAxis
                type="number"
                hide={compact}
                tickFormatter={valueFormatter}
                tick={{ fill: theme.pageText, fontSize: 11 }}
              />
            </>
          )}
          {!compact && (
            <Tooltip
              formatter={(value: unknown) =>
                typeof value === 'number'
                  ? format(value, 'financial')
                  : String(value)
              }
              isAnimationActive={false}
            />
          )}
          {renderBars()}
          {isNormalized && (
            <YAxis
              type="number"
              domain={[0, 100]}
              tickFormatter={v => `${v}%`}
              hide={compact}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </View>
  );
}
