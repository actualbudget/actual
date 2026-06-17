import { useMemo } from 'react';
import { Trans } from 'react-i18next';

import { AlignedText } from '@actual-app/components/aligned-text';
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

import {
  channelFormatType,
  getAxisFormatter,
  getSeriesColor,
} from './chart-helpers';

import { FinancialText } from '@desktop-client/components/FinancialText';
import { useFormat } from '@desktop-client/hooks/useFormat';
import type { FormatType } from '@desktop-client/hooks/useFormat';
import type { QueryResult } from '@desktop-client/queries/processQueryResult';
import type {
  ResolvedChannel,
  ResolvedChartSpec,
} from '@desktop-client/queries/resolveChannels';

type ColumnBarMarkProps = {
  result: QueryResult;
  resolved: ResolvedChartSpec;
  data: Record<string, unknown>[];
  seriesKeys: string[];
  compact?: boolean;
};

type ChartTooltipPayloadItem = {
  name?: string;
  value: number;
  color: string;
  dataKey: string;
};

type ChartTooltipProps = {
  active?: boolean;
  payload?: ChartTooltipPayloadItem[];
  label?: string;
  isNormalized: boolean;
  isStacked: boolean;
  format: (value: unknown, type: FormatType) => string;
  yFormatType: FormatType;
  formatLabel?: (label: unknown) => string;
};

function ChartTooltip({
  active,
  payload,
  label,
  isNormalized,
  isStacked,
  format,
  yFormatType,
  formatLabel,
}: ChartTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const items = payload.filter(p => p.value !== 0);
  const total = items.reduce((sum, p) => sum + p.value, 0);

  // For normalized mode, compute percentages from the raw values rather
  // than relying on Recharts' `stackOffset="expand"` (which only normalizes
  // visually but passes raw values to the tooltip payload).
  const totalAbsValue = isNormalized
    ? items.reduce((sum, p) => sum + Math.abs(p.value), 0)
    : 0;

  const formattedLabel =
    label !== undefined && label !== ''
      ? formatLabel
        ? formatLabel(label)
        : String(label)
      : '';

  return (
    <div
      style={{
        zIndex: 1000,
        pointerEvents: 'none',
        borderRadius: 2,
        boxShadow: '0 1px 6px rgba(0, 0, 0, .20)',
        backgroundColor: theme.menuBackground,
        color: theme.menuItemText,
        padding: 10,
      }}
    >
      <div>
        {formattedLabel && (
          <div style={{ marginBottom: 10 }}>
            <strong>{formattedLabel}</strong>
          </div>
        )}
        <div style={{ lineHeight: 1.5 }}>
          {items.map((p, i) => {
            const displayValue = isNormalized
              ? `${
                  totalAbsValue !== 0
                    ? Math.round((Math.abs(p.value) / totalAbsValue) * 1000) /
                      10
                    : 0
                }%`
              : format(p.value, yFormatType);
            return (
              <AlignedText
                key={i}
                left={p.name ?? p.dataKey}
                right={<FinancialText>{displayValue}</FinancialText>}
                style={{ color: p.color }}
              />
            );
          })}
          {isNormalized && items.length > 0 && (
            <AlignedText
              left={
                <strong>
                  <Trans>Total</Trans>
                </strong>
              }
              right={
                <FinancialText>
                  <strong>100%</strong>
                </FinancialText>
              }
              style={{
                fontWeight: 600,
                borderTop: `1px solid ${theme.tableBorder}`,
                paddingTop: 4,
                marginTop: 4,
              }}
            />
          )}
          {!isNormalized && isStacked && items.length > 1 && (
            <AlignedText
              left={
                <strong>
                  <Trans>Total</Trans>
                </strong>
              }
              right={
                <FinancialText>
                  <strong>{format(total, yFormatType)}</strong>
                </FinancialText>
              }
              style={{
                fontWeight: 600,
                borderTop: `1px solid ${theme.tableBorder}`,
                paddingTop: 4,
                marginTop: 4,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

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

  const yChannelByField = useMemo(() => {
    const map = new Map<string, ResolvedChannel>();
    if (!yChannels) return map;
    const channels = Array.isArray(yChannels) ? yChannels : [yChannels];
    for (const ch of channels) {
      map.set(ch.field, ch);
    }
    return map;
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

  const yFormatType = useMemo(
    () => channelFormatType(yChannels, 'financial-no-decimals'),
    [yChannels],
  );

  const stackMode = resolved.config?.stack;

  // `stackOffset="expand"` (used for 100% stacking) is mathematically broken
  // for data crossing zero — Recharts divides by the algebraic sum which is
  // near zero for mixed-sign data, producing nonsensical bar heights.
  // Detect negative values and fall back to regular stacked.
  const hasNegativeValues = useMemo(() => {
    const yKeys = hasColorSeries ? seriesKeys : yFieldList;
    if (yKeys.length === 0) return false;
    return data.some(row =>
      yKeys.some(key => {
        const val = row[key];
        return typeof val === 'number' && val < 0;
      }),
    );
  }, [data, seriesKeys, yFieldList, hasColorSeries]);

  const effectiveStackMode = useMemo(() => {
    if (stackMode === 'normalize' && hasNegativeValues) return 'stack';
    return stackMode;
  }, [stackMode, hasNegativeValues]);

  const isNormalized = effectiveStackMode === 'normalize';
  const stackId =
    isNormalized || effectiveStackMode === 'stack' ? 'a' : undefined;
  const isStacked = stackId !== undefined;

  const valueFormatter = useMemo(() => {
    if (isNormalized) {
      return (value: unknown) => {
        if (value === null || value === undefined) return '';
        if (typeof value === 'number') {
          if (value === 0) return '0%';
          if (value === 1) return '100%';
          return `${Math.round(value * 100)}%`;
        }
        return String(value);
      };
    }
    return (value: unknown) => {
      if (value === null || value === undefined) return '';
      if (typeof value === 'number') {
        return format(value, yFormatType);
      }
      return String(value);
    };
  }, [format, yFormatType, isNormalized]);

  const axesConfig = resolved.config?.axes;
  const valueAxisConfig = axesConfig?.valueAxis;
  const categoryAxisConfig = axesConfig?.categoryAxis;

  const xChannelLabel =
    xChannel && !Array.isArray(xChannel) ? xChannel.title : undefined;
  const yChannelLabel =
    yChannels && !Array.isArray(yChannels) ? yChannels.title : undefined;

  const categoryAxisLabel = categoryAxisConfig?.labelOverride ?? xChannelLabel;
  const valueAxisLabel = valueAxisConfig?.labelOverride ?? yChannelLabel;

  const labelFormatter = useMemo(() => {
    if (!xFormatter) return undefined;
    return (label: unknown) => {
      if (typeof label === 'string' || typeof label === 'number') {
        return xFormatter(label) ?? String(label);
      }
      return String(label);
    };
  }, [xFormatter]);

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
          name={key}
          stackId={stackId}
          fill={getSeriesColor(i)}
          isAnimationActive={false}
        />
      ));
    }
    if (useMultiYSeries) {
      return yFieldList.map((field, i) => {
        const yCh = yChannelByField.get(field);
        return (
          <Bar
            key={field}
            dataKey={field}
            name={yCh?.title ?? yCh?.field ?? field}
            stackId={stackId}
            fill={getSeriesColor(i)}
            isAnimationActive={false}
          />
        );
      });
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
    const yCh = yChannelByField.get(singleField);
    return (
      <Bar
        dataKey={singleField}
        name={yCh?.title ?? yCh?.field ?? singleField}
        stackId={stackId}
        fill={getSeriesColor(0)}
        isAnimationActive={false}
      />
    );
  };

  const stackOffset = isNormalized
    ? 'expand'
    : effectiveStackMode === 'stack'
      ? 'sign'
      : undefined;

  return (
    <View
      style={{
        width: '100%',
        height: '100%',
        padding: compact ? 4 : 12,
        minHeight: compact ? 0 : 200,
      }}
    >
      {stackMode === 'normalize' && hasNegativeValues && !compact && (
        <div
          style={{
            fontSize: 11,
            color: theme.warningText,
            padding: '4px 0',
            marginBottom: 4,
          }}
        >
          <Trans>
            100% stacking is not available with negative values. Showing as
            stacked instead.
          </Trans>
        </div>
      )}
      <ResponsiveContainer width="100%" height={compact ? 120 : '100%'}>
        <BarChart
          data={data}
          layout={isBar ? 'vertical' : 'horizontal'}
          margin={
            compact
              ? { top: 0, right: 0, left: 0, bottom: 0 }
              : { top: 8, right: 16, left: 8, bottom: 8 }
          }
          stackOffset={stackOffset}
        >
          {!compact && <CartesianGrid strokeDasharray="3 3" />}
          {isBar ? (
            <>
              <XAxis
                type="number"
                hide={compact}
                domain={isNormalized ? [0, 1] : undefined}
                label={
                  valueAxisLabel
                    ? {
                        value: valueAxisLabel,
                        angle: 0,
                        position: 'insideBottom',
                      }
                    : undefined
                }
                tickFormatter={valueFormatter}
                tick={{ fill: theme.pageText, fontSize: 11 }}
              />
              <YAxis
                type="category"
                dataKey={xField}
                hide={compact}
                label={
                  categoryAxisLabel
                    ? {
                        value: categoryAxisLabel,
                        angle: -90,
                        position: 'insideLeft',
                      }
                    : undefined
                }
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
                label={
                  categoryAxisLabel
                    ? { value: categoryAxisLabel, position: 'insideBottom' }
                    : undefined
                }
                tickFormatter={xFormatter}
                tick={{ fill: theme.pageText, fontSize: 11 }}
              />
              <YAxis
                type="number"
                hide={compact}
                domain={isNormalized ? [0, 1] : undefined}
                label={
                  valueAxisLabel
                    ? {
                        value: valueAxisLabel,
                        angle: -90,
                        position: 'insideLeft',
                      }
                    : undefined
                }
                tickFormatter={valueFormatter}
                tick={{ fill: theme.pageText, fontSize: 11 }}
              />
            </>
          )}
          {!compact && (
            <Tooltip
              content={
                <ChartTooltip
                  isNormalized={isNormalized}
                  isStacked={isStacked}
                  format={format}
                  yFormatType={yFormatType}
                  formatLabel={labelFormatter}
                />
              }
              cursor={{ fill: 'transparent' }}
              isAnimationActive={false}
            />
          )}
          {renderBars()}
        </BarChart>
      </ResponsiveContainer>
    </View>
  );
}
