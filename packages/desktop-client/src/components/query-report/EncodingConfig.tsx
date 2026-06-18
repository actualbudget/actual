import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgBolt } from '@actual-app/components/icons/v1';
import { SvgCheckAll, SvgUncheckAll } from '@actual-app/components/icons/v2';
import { Select } from '@actual-app/components/select';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import type { ChannelDef, ChartSpec, Mark } from 'loot-core/types/chart-spec';

import { Checkbox } from '@desktop-client/components/forms';
import { GraphButton } from '@desktop-client/components/reports/GraphButton';
import { toFieldType } from '@desktop-client/queries/chart-spec';
import type { QueryResult } from '@desktop-client/queries/processQueryResult';
import { resolveChannels } from '@desktop-client/queries/resolveChannels';
import type {
  ResolvedChannel,
  ResolvedChartSpec,
} from '@desktop-client/queries/resolveChannels';

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
  // For bar: X is multi-select (value fields); Y is single-select (category).
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

// Marks that allow multiple Y (value) channels.
// Note: bar is NOT here — after the X/Y swap, bar uses multi-X for grouped values.
function isMultiYMark(mark: Mark): boolean {
  return (
    mark === 'table' || mark === 'column' || mark === 'line' || mark === 'area'
  );
}

// Marks that allow multiple X channels.
// table: groups (multi-X).
// bar: after the X/Y swap, X is values — multi-X gives grouped horizontal bars.
function isMultiXMark(mark: Mark): boolean {
  return mark === 'table' || mark === 'bar';
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

function resolvedChannelToChannelDef(ch: ResolvedChannel): ChannelDef {
  return {
    field: ch.field,
    type: ch.type,
    ...(ch.title ? { title: ch.title } : {}),
    ...(ch.format ? { format: ch.format } : {}),
    ...(ch.sort ? { sort: ch.sort } : {}),
    ...(ch.aggregate ? { aggregate: ch.aggregate } : {}),
  };
}

function materializeChannels(
  chartSpec: ChartSpec,
  resolved: ResolvedChartSpec,
): ChartSpec {
  return {
    ...chartSpec,
    encoding: {
      ...chartSpec.encoding,
      x: resolved.encoding.x
        ? (Array.isArray(resolved.encoding.x)
            ? resolved.encoding.x
            : [resolved.encoding.x]
          ).map(ch => resolvedChannelToChannelDef(ch))
        : undefined,
      y: resolved.encoding.y
        ? (Array.isArray(resolved.encoding.y)
            ? resolved.encoding.y
            : [resolved.encoding.y]
          ).map(ch => resolvedChannelToChannelDef(ch))
        : undefined,
    },
  };
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
    if (!result || !resolved) return;

    const isTableMark = chartSpec.mark === 'table';
    const specBeforeMaterialize = isTableMark
      ? materializeChannels(chartSpec, resolved)
      : chartSpec;

    const currentEncoding = specBeforeMaterialize.encoding;
    const currentX = currentEncoding.x;
    const currentXArray: ChannelDef[] = Array.isArray(currentX)
      ? currentX
      : currentX
        ? [currentX]
        : [];
    const existingX = currentXArray.findIndex(ch => ch.field === field);

    if (existingX >= 0) {
      const nextX = currentXArray.filter((_, i) => i !== existingX);
      onChartSpecChange({
        ...specBeforeMaterialize,
        encoding: {
          ...currentEncoding,
          x:
            nextX.length > 0
              ? nextX.length === 1
                ? nextX[0]
                : nextX
              : undefined,
        },
      });
    } else {
      const nextX = [
        ...currentXArray,
        { field, type: inferTypeFromColumns(field, result) },
      ];

      let nextY = currentEncoding.y;
      if (isTableMark && currentEncoding.y) {
        const currentYArray: ChannelDef[] = Array.isArray(currentEncoding.y)
          ? currentEncoding.y
          : [currentEncoding.y];
        const filteredY = currentYArray.filter(ch => ch.field !== field);
        nextY =
          filteredY.length > 0
            ? filteredY.length === 1
              ? filteredY[0]
              : filteredY
            : undefined;
      }

      onChartSpecChange({
        ...specBeforeMaterialize,
        encoding: {
          ...currentEncoding,
          x: nextX,
          y: nextY,
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
    if (!result || !resolved) return;

    const isTableMark = chartSpec.mark === 'table';
    const specBeforeMaterialize = isTableMark
      ? materializeChannels(chartSpec, resolved)
      : chartSpec;

    const currentEncoding = specBeforeMaterialize.encoding;
    const currentY = currentEncoding.y;
    const currentYArray: ChannelDef[] = Array.isArray(currentY)
      ? currentY
      : currentY
        ? [currentY]
        : [];
    const existingY = currentYArray.findIndex(ch => ch.field === field);

    if (existingY >= 0) {
      const nextY = currentYArray.filter((_, i) => i !== existingY);
      onChartSpecChange({
        ...specBeforeMaterialize,
        encoding: {
          ...currentEncoding,
          y:
            nextY.length > 0
              ? nextY.length === 1
                ? nextY[0]
                : nextY
              : undefined,
        },
      });
    } else {
      const nextY = [
        ...currentYArray,
        { field, type: inferTypeFromColumns(field, result) },
      ];

      let nextX = currentEncoding.x;
      if (isTableMark && currentEncoding.x) {
        const currentXArray: ChannelDef[] = Array.isArray(currentEncoding.x)
          ? currentEncoding.x
          : [currentEncoding.x];
        const filteredX = currentXArray.filter(ch => ch.field !== field);
        nextX =
          filteredX.length > 0
            ? filteredX.length === 1
              ? filteredX[0]
              : filteredX
            : undefined;
      }

      onChartSpecChange({
        ...specBeforeMaterialize,
        encoding: {
          ...currentEncoding,
          x: nextX,
          y: nextY,
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

  const handleXSelectAll = () => {
    if (!result || !resolved) return;
    const specBeforeMaterialize = materializeChannels(chartSpec, resolved);
    const currentEncoding = specBeforeMaterialize.encoding;
    const allCols = columnOptions.all.map(c => ({
      field: c.value,
      type: c.type as ChannelDef['type'],
    }));
    onChartSpecChange({
      ...specBeforeMaterialize,
      encoding: {
        ...currentEncoding,
        x: allCols.length === 1 ? allCols[0] : allCols,
        y: undefined,
      },
    });
  };

  const handleXClear = () => {
    if (!result || !resolved) return;
    const specBeforeMaterialize = materializeChannels(chartSpec, resolved);
    const currentEncoding = specBeforeMaterialize.encoding;
    onChartSpecChange({
      ...specBeforeMaterialize,
      encoding: {
        ...currentEncoding,
        x: undefined,
      },
    });
  };

  const handleYSelectAll = () => {
    if (!result || !resolved) return;
    const specBeforeMaterialize = materializeChannels(chartSpec, resolved);
    const currentEncoding = specBeforeMaterialize.encoding;
    const numericCols = columnOptions.numeric.map(c => ({
      field: c.value,
      type: c.type as ChannelDef['type'],
    }));
    onChartSpecChange({
      ...specBeforeMaterialize,
      encoding: {
        ...currentEncoding,
        x: undefined,
        y: numericCols.length === 1 ? numericCols[0] : numericCols,
      },
    });
  };

  const handleYClear = () => {
    if (!result || !resolved) return;
    const specBeforeMaterialize = materializeChannels(chartSpec, resolved);
    const currentEncoding = specBeforeMaterialize.encoding;
    onChartSpecChange({
      ...specBeforeMaterialize,
      encoding: {
        ...currentEncoding,
        y: undefined,
      },
    });
  };

  const handleAuto = () => {
    if (!result) return;
    onChartSpecChange({ ...chartSpec, encoding: {} });
  };

  const selectedXFields = useMemo(() => {
    if (!resolved) return [];
    const current = resolved.encoding.x;
    if (Array.isArray(current)) return current.map(ch => ch.field);
    if (current) return [current.field];
    return [];
  }, [resolved]);

  const selectedYFields = useMemo(() => {
    if (!resolved) return [];
    const current = resolved.encoding.y;
    if (Array.isArray(current)) return current.map(ch => ch.field);
    if (current) return [current.field];
    return [];
  }, [resolved]);

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

  const autoAssignedXFields = useMemo(() => {
    if (!resolved) return new Set<string>();
    const current = resolved.encoding.x;
    const arr = Array.isArray(current) ? current : current ? [current] : [];
    return new Set(arr.filter(ch => ch.autoAssigned).map(ch => ch.field));
  }, [resolved]);

  const autoAssignedYFields = useMemo(() => {
    if (!resolved) return new Set<string>();
    const current = resolved.encoding.y;
    const arr = Array.isArray(current) ? current : current ? [current] : [];
    return new Set(arr.filter(ch => ch.autoAssigned).map(ch => ch.field));
  }, [resolved]);

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
        <View style={{ marginBottom: 16 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 4,
            }}
          >
            <div
              style={{
                fontSize: 12,
                color: theme.pageTextSubdued,
                flex: 1,
              }}
            >
              {t(channelLabel(chartSpec.mark, 'x'))}
            </div>
            {isMultiXMark(chartSpec.mark) && (
              <View style={{ flexDirection: 'row', gap: 4 }}>
                <GraphButton
                  title={t('Select all')}
                  onSelect={handleXSelectAll}
                  style={{ padding: 4 }}
                >
                  <SvgCheckAll width={15} height={15} />
                </GraphButton>
                <GraphButton
                  title={t('Clear')}
                  onSelect={handleXClear}
                  style={{ padding: 4 }}
                >
                  <SvgUncheckAll width={15} height={15} />
                </GraphButton>
              </View>
            )}
          </View>
          {isMultiXMark(chartSpec.mark) ? (
            <CheckboxList
              options={columnOptions.all.map(c => c.value)}
              selected={selectedXFields}
              onToggle={handleXMultiToggle}
              autoAssignedFields={autoAssignedXFields}
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
          {chartSpec.mark === 'bar' && selectedXFields.length > 1 && (
            <div style={{ fontSize: 11, color: theme.pageTextSubdued, marginTop: 4 }}>
              {t('Each X field creates a separate series in the chart.')}
            </div>
          )}
        </View>
      )}

      {result && visibility.y && (
        <View style={{ marginBottom: 16 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 4,
            }}
          >
            <div
              style={{
                fontSize: 12,
                color: theme.pageTextSubdued,
                flex: 1,
              }}
            >
              {t(channelLabel(chartSpec.mark, 'y'))}
            </div>
            {isMultiYMark(chartSpec.mark) && (
              <View style={{ flexDirection: 'row', gap: 4 }}>
                <GraphButton
                  title={t('Select all')}
                  onSelect={handleYSelectAll}
                  style={{ padding: 4 }}
                >
                  <SvgCheckAll width={15} height={15} />
                </GraphButton>
                <GraphButton
                  title={t('Clear')}
                  onSelect={handleYClear}
                  style={{ padding: 4 }}
                >
                  <SvgUncheckAll width={15} height={15} />
                </GraphButton>
              </View>
            )}
          </View>
          {isMultiYMark(chartSpec.mark) ? (
            <CheckboxList
              options={yOptionsForMark.map(c => c.value)}
              selected={selectedYFields}
              onToggle={handleYMultiToggle}
              autoAssignedFields={autoAssignedYFields}
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
          {chartSpec.mark !== 'bar' &&
            chartSpec.mark !== 'table' &&
            selectedYFields.length > 1 && (
              <div
                style={{ fontSize: 11, color: theme.pageTextSubdued, marginTop: 4 }}
              >
                {t('Each Y field creates a separate series in the chart.')}
              </div>
            )}
        </View>
      )}

      {(isMultiXMark(chartSpec.mark) || isMultiYMark(chartSpec.mark)) && (
        <View style={{ alignItems: 'flex-end', marginBottom: 16 }}>
          <GraphButton
            title={t('Auto')}
            onSelect={handleAuto}
            style={{ padding: 4 }}
          >
            <SvgBolt width={15} height={15} />
          </GraphButton>
        </View>
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
    <View style={{ marginBottom: 16 }}>
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
  autoAssignedFields?: Set<string>;
};

function CheckboxList({
  options,
  selected,
  onToggle,
  autoAssignedFields,
}: CheckboxListProps) {
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
          {autoAssignedFields?.has(col) && <AutoLabel />}
        </label>
      ))}
    </View>
  );
}
