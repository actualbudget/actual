import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Select } from '@actual-app/components/select';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import type { ChannelDef, ChartSpec, Mark } from 'loot-core/types/chart-spec';

import { Checkbox } from '@desktop-client/components/forms';
import { toFieldType } from '@desktop-client/queries/chart-spec';
import type { QueryResult } from '@desktop-client/queries/processQueryResult';
import { resolveChannels } from '@desktop-client/queries/resolveChannels';
import type { ResolvedChartSpec } from '@desktop-client/queries/resolveChannels';

type EncodingConfigProps = {
  result: QueryResult | null;
  chartSpec: ChartSpec;
  onChartSpecChange: (next: ChartSpec) => void;
};

type ChannelVisibility = {
  x: boolean;
  y: boolean;
  series: boolean;
  color: boolean;
  size: boolean;
};

const CHANNEL_VISIBILITY: Record<Mark, ChannelVisibility> = {
  table: { x: true, y: true, series: false, color: false, size: false },
  number: { x: false, y: true, series: false, color: false, size: false },
  column: { x: true, y: true, series: true, color: false, size: false },
  bar: { x: true, y: true, series: true, color: false, size: false },
  line: { x: true, y: true, series: true, color: false, size: false },
  area: { x: true, y: true, series: true, color: false, size: false },
  point: { x: true, y: true, series: false, color: false, size: true },
  arc: { x: false, y: true, series: false, color: false, size: false },
};

function toOptions(
  items: Array<{ value: string; label: string }>,
): Array<readonly [string, string]> {
  return items.map(item => [item.value, item.label] as const);
}

function isMultiYMark(mark: Mark): boolean {
  return (
    mark === 'table' ||
    mark === 'column' ||
    mark === 'bar' ||
    mark === 'line' ||
    mark === 'area'
  );
}

function isMultiXMark(mark: Mark): boolean {
  return mark === 'table';
}

function channelLabel(
  mark: Mark,
  channel: 'x' | 'y' | 'series' | 'color',
): string {
  if (mark === 'table') {
    if (channel === 'x') return 'Groups';
    if (channel === 'y') return 'Values';
  }
  if (mark === 'number') {
    if (channel === 'y') return 'Number';
  }
  if (channel === 'x') return 'X Axis';
  if (channel === 'y') return 'Y Axis';
  if (channel === 'series') return 'Series';
  if (channel === 'color') return 'Color';
  return channel;
}

function inferTypeFromColumns(
  field: string,
  result: QueryResult,
): ChannelDef['type'] {
  const col = result.columns.find(c => c.name === field);
  if (!col) return undefined;
  return toFieldType(col.type);
}

export function EncodingConfig({
  result,
  chartSpec,
  onChartSpecChange,
}: EncodingConfigProps) {
  const { t } = useTranslation();
  const visibility = CHANNEL_VISIBILITY[chartSpec.mark];
  const resolved: ResolvedChartSpec | null = useMemo(
    () => (result ? resolveChannels(chartSpec, result) : null),
    [chartSpec, result],
  );

  const columnOptions = useMemo(() => {
    if (!result) return { all: [], numeric: [], categorical: [] };
    const all = result.columns.map(c => ({
      value: c.name,
      label: c.name,
      type: toFieldType(c.type),
    }));
    return {
      all,
      numeric: all.filter(c => c.type === 'number'),
      categorical: all.filter(c => c.type === 'category'),
    };
  }, [result]);

  const handleXChange = (value: string) => {
    onChartSpecChange({
      ...chartSpec,
      encoding: {
        ...chartSpec.encoding,
        x: value ? { field: value } : undefined,
      },
    });
  };

  const handleXMultiToggle = (field: string) => {
    if (!result) return;
    const current = chartSpec.encoding.x;
    const currentArray: ChannelDef[] = Array.isArray(current)
      ? current
      : current
        ? [current]
        : [];
    const existing = currentArray.findIndex(ch => ch.field === field);

    if (existing >= 0) {
      const next = currentArray.filter((_, i) => i !== existing);
      onChartSpecChange({
        ...chartSpec,
        encoding: {
          ...chartSpec.encoding,
          x: next.length > 0 ? next : undefined,
        },
      });
    } else {
      const next = [
        ...currentArray,
        { field, type: inferTypeFromColumns(field, result) },
      ];
      onChartSpecChange({
        ...chartSpec,
        encoding: {
          ...chartSpec.encoding,
          x: next,
        },
      });
    }
  };

  const handleYSingleChange = (value: string) => {
    onChartSpecChange({
      ...chartSpec,
      encoding: {
        ...chartSpec.encoding,
        y:
          value && result
            ? { field: value, type: inferTypeFromColumns(value, result) }
            : undefined,
      },
    });
  };

  const handleYMultiToggle = (field: string) => {
    if (!result) return;
    const current = chartSpec.encoding.y;
    const currentArray: ChannelDef[] = Array.isArray(current)
      ? current
      : current
        ? [current]
        : [];
    const existing = currentArray.findIndex(ch => ch.field === field);

    if (existing >= 0) {
      const next = currentArray.filter((_, i) => i !== existing);
      onChartSpecChange({
        ...chartSpec,
        encoding: {
          ...chartSpec.encoding,
          y: next.length > 0 ? next : undefined,
        },
      });
    } else {
      const next = [
        ...currentArray,
        { field, type: inferTypeFromColumns(field, result) },
      ];
      onChartSpecChange({
        ...chartSpec,
        encoding: {
          ...chartSpec.encoding,
          y: next,
        },
      });
    }
  };

  const handleSeriesChange = (value: string) => {
    onChartSpecChange({
      ...chartSpec,
      encoding: {
        ...chartSpec.encoding,
        series: value ? { field: value } : undefined,
      },
    });
  };

  const handleStackChange = (value: string) => {
    onChartSpecChange({
      ...chartSpec,
      config: {
        ...chartSpec.config,
        stack: value === 'none' ? undefined : (value as 'stack' | 'normalize'),
      },
    });
  };

  const selectedXFields = useMemo(() => {
    const current = chartSpec.encoding.x;
    if (Array.isArray(current)) return current.map(ch => ch.field);
    if (current) return [current.field];
    return [];
  }, [chartSpec.encoding.x]);

  const selectedYFields = useMemo(() => {
    const current = chartSpec.encoding.y;
    if (Array.isArray(current)) return current.map(ch => ch.field);
    if (current) return [current.field];
    return [];
  }, [chartSpec.encoding.y]);

  const xFieldForSelect =
    chartSpec.encoding.x && !Array.isArray(chartSpec.encoding.x)
      ? chartSpec.encoding.x.field
      : '';
  const yFieldForSingleSelect =
    chartSpec.encoding.y && !Array.isArray(chartSpec.encoding.y)
      ? chartSpec.encoding.y.field
      : '';
  const seriesFieldForSelect = chartSpec.encoding.series?.field ?? '';

  const yOptionsForMark = isMultiYMark(chartSpec.mark)
    ? columnOptions.all
    : chartSpec.mark === 'number'
      ? columnOptions.numeric
      : columnOptions.all;

  const showStackConfig = ['column', 'bar', 'area'].includes(chartSpec.mark);
  const stackOptions: Array<readonly [string, string]> = [
    ['none', t('None')],
    ['stack', t('Stacked')],
    ['normalize', t('100%')],
  ];
  const stackValue = chartSpec.config?.stack ?? 'none';

  return (
    <View style={{ gap: 12 }}>
      {!result && (
        <div style={{ fontSize: 12, color: theme.pageTextSubdued }}>
          <Trans>Run the query to configure encoding channels.</Trans>
        </div>
      )}

      {resolved &&
        resolved.errors.map((err, i) => (
          <div
            key={`err-${i}`}
            style={{ fontSize: 12, color: theme.errorText }}
          >
            {err}
          </div>
        ))}

      {resolved &&
        resolved.warnings.map((warn, i) => (
          <div
            key={`warn-${i}`}
            style={{ fontSize: 12, color: theme.warningText }}
          >
            {warn}
          </div>
        ))}

      {result && visibility.x && (
        <Field label={t(channelLabel(chartSpec.mark, 'x'))}>
          {isMultiXMark(chartSpec.mark) ? (
            <CheckboxList
              options={columnOptions.all.map(c => c.value)}
              selected={selectedXFields}
              onToggle={handleXMultiToggle}
            />
          ) : (
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
            >
              <Select
                value={xFieldForSelect}
                options={toOptions(columnOptions.all)}
                onChange={handleXChange}
                defaultLabel={t('(none)')}
              />
              {resolved?.encoding.x &&
                !Array.isArray(resolved.encoding.x) &&
                resolved.encoding.x.autoAssigned && <AutoLabel />}
            </View>
          )}
        </Field>
      )}

      {result && visibility.y && (
        <Field label={t(channelLabel(chartSpec.mark, 'y'))}>
          {isMultiYMark(chartSpec.mark) ? (
            <CheckboxList
              options={yOptionsForMark.map(c => c.value)}
              selected={selectedYFields}
              onToggle={handleYMultiToggle}
            />
          ) : (
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
            >
              <Select
                value={yFieldForSingleSelect}
                options={toOptions(yOptionsForMark)}
                onChange={handleYSingleChange}
                defaultLabel={t('(none)')}
              />
              {resolved?.encoding.y &&
                !Array.isArray(resolved.encoding.y) &&
                resolved.encoding.y.autoAssigned && <AutoLabel />}
            </View>
          )}
        </Field>
      )}

      {result && visibility.series && (
        <Field label={t(channelLabel(chartSpec.mark, 'series'))}>
          <Select
            value={seriesFieldForSelect}
            options={toOptions([
              { value: '', label: t('(none)') },
              ...columnOptions.all,
            ])}
            onChange={handleSeriesChange}
            defaultLabel={t('(none)')}
          />
        </Field>
      )}

      {result && showStackConfig && (
        <Field label={t('Stack')}>
          <Select
            value={stackValue}
            options={stackOptions}
            onChange={handleStackChange}
          />
        </Field>
      )}
    </View>
  );
}

type FieldProps = {
  label: string;
  help?: string;
  children: ReactNode;
};

function Field({ label, help, children }: FieldProps) {
  return (
    <View>
      <div
        style={{
          fontSize: 12,
          color: theme.pageTextSubdued,
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      {children}
      {help && (
        <div
          style={{
            fontSize: 11,
            color: theme.pageTextSubdued,
            marginTop: 4,
          }}
        >
          {help}
        </div>
      )}
    </View>
  );
}

const AutoLabel = () => (
  <span style={{ fontSize: 11, color: theme.pageTextSubdued, marginLeft: 4 }}>
    (auto)
  </span>
);

type CheckboxListProps = {
  options: string[];
  selected: string[];
  onToggle: (col: string) => void;
};

function CheckboxList({ options, selected, onToggle }: CheckboxListProps) {
  if (options.length === 0) {
    return (
      <div style={{ fontSize: 12, color: theme.pageTextSubdued }}>
        <Trans>No columns available</Trans>
      </div>
    );
  }
  const selectedSet = new Set(selected);
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map(col => (
        <label
          key={col}
          style={{
            display: 'flex',
            alignItems: 'center',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          <Checkbox
            checked={selectedSet.has(col)}
            onChange={() => onToggle(col)}
          />
          {col}
        </label>
      ))}
    </View>
  );
}
