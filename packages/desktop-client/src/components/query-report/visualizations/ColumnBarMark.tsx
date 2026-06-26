import { useMemo } from 'react';
import { Trans } from 'react-i18next';
import { AutoSizer } from 'react-virtualized-auto-sizer';

import { AlignedText } from '@actual-app/components/aligned-text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';

import {
  axisFormatType,
  channelFormatType,
  getAxisFormatter,
  getSeriesColor,
} from './chart-helpers';

import { FinancialText } from '@desktop-client/components/FinancialText';
import { useRechartsAnimation } from '@desktop-client/components/reports/chart-theme';
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
  valueFormatType: FormatType;
  formatLabel?: (label: unknown) => string;
  channelByField?: Map<string, ResolvedChannel>;
};

function ChartTooltip({
  active,
  payload,
  label,
  isNormalized,
  isStacked,
  format,
  valueFormatType,
  formatLabel,
  channelByField,
}: ChartTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const items = payload.filter(p => p.value !== 0);
  const total = items.reduce((sum, p) => sum + p.value, 0);

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
            const fieldFormat = channelByField?.get(p.dataKey)?.format;
            const fieldFormatType = fieldFormat
              ? channelFormatType(
                  { field: p.dataKey, format: fieldFormat } as ResolvedChannel,
                  'financial-no-decimals',
                )
              : valueFormatType;
            const displayValue = isNormalized
              ? `${
                  totalAbsValue !== 0
                    ? Math.round((Math.abs(p.value) / totalAbsValue) * 1000) /
                      10
                    : 0
                }%`
              : format(p.value, fieldFormatType);
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
                  <strong>{format(total, valueFormatType)}</strong>
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
  const animationProps = useRechartsAnimation();

  const xChannel = resolved.encoding.x;
  const yChannels = resolved.encoding.y;

  const xFieldList: string[] = useMemo(() => {
    if (!xChannel) return [];
    return Array.isArray(xChannel)
      ? xChannel.map(ch => ch.field)
      : [xChannel.field];
  }, [xChannel]);

  const yFieldList: string[] = useMemo(() => {
    if (!yChannels) return [];
    return Array.isArray(yChannels)
      ? yChannels.map(ch => ch.field)
      : [yChannels.field];
  }, [yChannels]);

  // For bar mark, X is the value (horizontal) and Y is the category (vertical).
  // The category axis is the field that defines the rows/buckets.
  const categoryField = isBar
    ? (yFieldList[0] ?? xFieldList[0])
    : (xFieldList[0] ?? yFieldList[0]);

  // The value fields drive the bars themselves.
  const valueFields = isBar ? xFieldList : yFieldList;

  const xChannelByField = useMemo(() => {
    const map = new Map<string, ResolvedChannel>();
    if (!xChannel) return map;
    const channels = Array.isArray(xChannel) ? xChannel : [xChannel];
    for (const ch of channels) {
      map.set(ch.field, ch);
    }
    return map;
  }, [xChannel]);

  const yChannelByField = useMemo(() => {
    const map = new Map<string, ResolvedChannel>();
    if (!yChannels) return map;
    const channels = Array.isArray(yChannels) ? yChannels : [yChannels];
    for (const ch of channels) {
      map.set(ch.field, ch);
    }
    return map;
  }, [yChannels]);

  const valueChannelByField = isBar ? xChannelByField : yChannelByField;

  const deriveAxisTitle = (channels: ResolvedChannel[]): string | undefined => {
    if (!channels || channels.length === 0) return undefined;
    if (channels.length === 1) return channels[0].title ?? channels[0].field;
    const labels = channels.map(ch => ch.title ?? ch.field);
    if (labels.length <= 2) return labels.join(', ');
    return `${labels[0]}, ${labels[1]} +${labels.length - 2}`;
  };

  const hasColorSeries = seriesKeys.length > 0;
  const useMultiValueSeries = !hasColorSeries && valueFields.length > 1;

  const categoryFormatter = useMemo(() => {
    if (!categoryField) return undefined;
    // Pick the channel for the category field, whichever encoding owns it.
    // For bar, the category is on Y. For column, the category is on X.
    const candidates = isBar
      ? Array.isArray(yChannels)
        ? yChannels
        : yChannels
          ? [yChannels]
          : []
      : Array.isArray(xChannel)
        ? xChannel
        : xChannel
          ? [xChannel]
          : [];
    const ch = candidates.find(c => c.field === categoryField);
    if (!ch) return undefined;
    return getAxisFormatter(ch, result.columns, format);
  }, [categoryField, isBar, xChannel, yChannels, result.columns, format]);

  const valueFormatType = useMemo(
    () => axisFormatType(isBar ? xChannel : yChannels, 'financial-no-decimals'),
    [xChannel, yChannels, isBar],
  );

  const stackMode = resolved.config?.stack;

  // `stackOffset="expand"` (used for 100% stacking) is mathematically broken
  // for data crossing zero — Recharts divides by the algebraic sum which is
  // near zero for mixed-sign data, producing nonsensical bar heights.
  // Detect negative values and fall back to regular stacked.
  const hasNegativeValues = useMemo(() => {
    const vKeys = hasColorSeries ? seriesKeys : valueFields;
    if (vKeys.length === 0) return false;
    return data.some(row =>
      vKeys.some(key => {
        const val = row[key];
        return typeof val === 'number' && val < 0;
      }),
    );
  }, [data, seriesKeys, valueFields, hasColorSeries]);

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
        return format(value, valueFormatType);
      }
      return String(value);
    };
  }, [format, valueFormatType, isNormalized]);

  const axesConfig = resolved.config?.axes;
  const valueAxisConfig = axesConfig?.valueAxis;
  const categoryAxisConfig = axesConfig?.categoryAxis;

  const xChannelLabel =
    xChannel && !Array.isArray(xChannel)
      ? (xChannel.title ?? xChannel.field)
      : Array.isArray(xChannel)
        ? deriveAxisTitle(xChannel)
        : undefined;
  const yChannelLabel =
    yChannels && !Array.isArray(yChannels)
      ? (yChannels.title ?? yChannels.field)
      : Array.isArray(yChannels)
        ? deriveAxisTitle(yChannels)
        : undefined;

  const categoryChannelTitle = isBar ? yChannelLabel : xChannelLabel;
  const valueChannelTitle = isBar ? xChannelLabel : yChannelLabel;

  const categoryAxisLabel =
    categoryAxisConfig?.showLabel === true
      ? (categoryAxisConfig?.labelOverride ?? categoryChannelTitle)
      : undefined;
  const valueAxisLabel =
    valueAxisConfig?.showLabel === true
      ? (valueAxisConfig?.labelOverride ?? valueChannelTitle)
      : undefined;

  const labelFormatter = useMemo(() => {
    if (!categoryFormatter) return undefined;
    return (label: unknown) => {
      if (typeof label === 'string' || typeof label === 'number') {
        return categoryFormatter(label) ?? String(label);
      }
      return String(label);
    };
  }, [categoryFormatter]);

  if (!categoryField) {
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
          {...animationProps}
        />
      ));
    }
    if (useMultiValueSeries) {
      return valueFields.map((field, i) => {
        const vCh = valueChannelByField.get(field);
        return (
          <Bar
            key={field}
            dataKey={field}
            name={vCh?.title ?? vCh?.field ?? field}
            stackId={stackId}
            fill={getSeriesColor(i)}
            {...animationProps}
          />
        );
      });
    }
    const singleField = valueFields[0];
    if (!singleField) {
      return (
        <Bar
          dataKey={categoryField}
          stackId={stackId}
          fill={getSeriesColor(0)}
          {...animationProps}
        />
      );
    }
    const vCh = valueChannelByField.get(singleField);
    return (
      <Bar
        dataKey={singleField}
        name={vCh?.title ?? vCh?.field ?? singleField}
        stackId={stackId}
        fill={getSeriesColor(0)}
        {...animationProps}
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
        flex: 1,
        padding: compact ? 4 : 12,
        minHeight: compact ? 0 : 200,
        position: 'relative',
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
      <div style={{ width: '100%', height: '100%' }}>
        <AutoSizer
          renderProp={({ width = 0, height = 0 }) => {
            if (width === 0 || height === 0) {
              return null;
            }
            return (
              <BarChart
                width={width}
                height={height}
                data={data}
                layout={isBar ? 'vertical' : 'horizontal'}
                margin={
                  compact
                    ? {
                        top: 4,
                        right: 4,
                        left: Math.max(10, Math.round(width * 0.06)),
                        bottom: 4,
                      }
                    : { top: 8, right: 16, left: 20, bottom: 28 }
                }
                stackOffset={stackOffset}
              >
                {!compact && (
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={theme.tableBorder}
                  />
                )}
                {isBar ? (
                  <>
                    <XAxis
                      type="number"
                      hide={compact}
                      domain={isNormalized ? [0, 1] : undefined}
                      label={
                        !compact && valueAxisLabel
                          ? {
                              value: valueAxisLabel,
                              angle: 0,
                              position: 'bottom',
                              offset: 5,
                              fill: theme.pageText,
                              style: { fill: theme.pageText },
                            }
                          : undefined
                      }
                      tickFormatter={valueFormatter}
                      tick={{ fill: theme.pageText }}
                      tickLine={{ stroke: theme.pageTextLight }}
                      tickMargin={4}
                    />
                    <YAxis
                      type="category"
                      dataKey={categoryField}
                      label={
                        !compact && categoryAxisLabel
                          ? {
                              value: categoryAxisLabel,
                              angle: -90,
                              position: 'left',
                              offset: 10,
                              fill: theme.pageText,
                              style: { fill: theme.pageText },
                            }
                          : undefined
                      }
                      tickFormatter={categoryFormatter}
                      tick={{ fill: theme.pageText }}
                      tickLine={{ stroke: theme.pageTextLight }}
                      tickMargin={4}
                    />
                  </>
                ) : (
                  <>
                    <XAxis
                      dataKey={categoryField}
                      label={
                        !compact && categoryAxisLabel
                          ? {
                              value: categoryAxisLabel,
                              position: 'bottom',
                              offset: 5,
                              fill: theme.pageText,
                              style: { fill: theme.pageText },
                            }
                          : undefined
                      }
                      tickFormatter={categoryFormatter}
                      tick={{ fill: theme.pageText }}
                      tickLine={{ stroke: theme.pageTextLight }}
                      tickMargin={4}
                    />
                    <YAxis
                      type="number"
                      hide={compact}
                      domain={isNormalized ? [0, 1] : undefined}
                      label={
                        !compact && valueAxisLabel
                          ? {
                              value: valueAxisLabel,
                              angle: -90,
                              position: 'left',
                              offset: 10,
                              fill: theme.pageText,
                              style: { fill: theme.pageText },
                            }
                          : undefined
                      }
                      tickFormatter={valueFormatter}
                      tick={{ fill: theme.pageText }}
                      tickLine={{ stroke: theme.pageTextLight }}
                      tickMargin={4}
                    />
                  </>
                )}
                <Tooltip
                  content={
                    <ChartTooltip
                      isNormalized={isNormalized}
                      isStacked={isStacked}
                      format={format}
                      valueFormatType={valueFormatType}
                      formatLabel={labelFormatter}
                      channelByField={valueChannelByField}
                    />
                  }
                  cursor={{ fill: 'transparent' }}
                  isAnimationActive={false}
                />
                {renderBars()}
              </BarChart>
            );
          }}
        />
      </div>
    </View>
  );
}
