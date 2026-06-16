import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Select } from '@actual-app/components/select';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import type { QueryVisualization } from 'loot-core/types/models/dashboard';

import { QueryVizTypeSelector } from './QueryVizTypeSelector';

import { Checkbox } from '@desktop-client/components/forms';
import { assignColumns } from '@desktop-client/queries/columnRoles';
import type { QueryResult } from '@desktop-client/queries/processQueryResult';

type QueryVizConfigProps = {
  result: QueryResult | null;
  visualization: QueryVisualization;
  onConfigChange: (next: QueryVisualization) => void;
};

function toOptions(names: string[]): Array<readonly [string, string]> {
  return names.map(name => [name, name] as const);
}

function toggleMeasure(
  current: string[] | undefined,
  col: string,
  allMeasures: string[],
): string[] {
  const set = new Set(current ?? allMeasures);
  if (set.has(col)) {
    set.delete(col);
  } else {
    set.add(col);
  }
  return Array.from(set);
}

export function QueryVizConfig({
  result,
  visualization,
  onConfigChange,
}: QueryVizConfigProps) {
  const { t } = useTranslation();
  const assignment = useMemo(
    () => (result ? assignColumns(result) : null),
    [result],
  );

  const setType = (type: QueryVisualization['type']) => {
    switch (type) {
      case 'table':
        onConfigChange({ type: 'table' });
        return;
      case 'scalar':
        onConfigChange({ type: 'scalar' });
        return;
      case 'bar':
        onConfigChange({
          type: 'bar',
          chartStyle:
            visualization.type === 'bar' ? visualization.chartStyle : 'grouped',
        });
        return;
      case 'time-series':
        onConfigChange({
          type: 'time-series',
          chartStyle:
            visualization.type === 'time-series'
              ? visualization.chartStyle
              : 'line',
        });
        return;
      case 'donut':
        onConfigChange({ type: 'donut' });
        return;
      default:
        return;
    }
  };

  return (
    <View style={{ gap: 12 }}>
      <View>
        <div
          style={{
            fontSize: 13,
            color: theme.pageTextSubdued,
            marginBottom: 8,
          }}
        >
          <Trans>Visualization</Trans>
        </div>
        <QueryVizTypeSelector value={visualization.type} onChange={setType} />
      </View>

      {!result && (
        <div style={{ fontSize: 12, color: theme.pageTextSubdued }}>
          <Trans>Run the query to configure column roles.</Trans>
        </div>
      )}

      {result && assignment && visualization.type === 'scalar' && (
        <Field
          label={t('Measure column')}
          help={
            assignment.measureColumns.length === 0
              ? t('Add a numeric column to use scalar.')
              : undefined
          }
        >
          <Select
            value={visualization.measureColumn ?? assignment.measureColumns[0]}
            options={toOptions(assignment.measureColumns)}
            onChange={value =>
              onConfigChange({ type: 'scalar', measureColumn: value })
            }
            disabled={assignment.measureColumns.length === 0}
          />
        </Field>
      )}

      {result && assignment && visualization.type === 'time-series' && (
        <>
          <Field
            label={t('Time column')}
            help={
              assignment.timeColumns.length === 0
                ? t('Add a date column to use time-series.')
                : undefined
            }
          >
            <Select
              value={
                visualization.timeColumn ?? assignment.timeColumns[0] ?? ''
              }
              options={toOptions(assignment.timeColumns)}
              onChange={value =>
                onConfigChange({
                  type: 'time-series',
                  chartStyle: visualization.chartStyle,
                  timeColumn: value,
                })
              }
            />
          </Field>
          <Field label={t('Style')}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Choice
                selected={visualization.chartStyle === 'line'}
                onPress={() =>
                  onConfigChange({
                    type: 'time-series',
                    chartStyle: 'line',
                    timeColumn: visualization.timeColumn,
                    measureColumns: visualization.measureColumns,
                  })
                }
              >
                <Trans>Line</Trans>
              </Choice>
              <Choice
                selected={visualization.chartStyle === 'area'}
                onPress={() =>
                  onConfigChange({
                    type: 'time-series',
                    chartStyle: 'area',
                    timeColumn: visualization.timeColumn,
                    measureColumns: visualization.measureColumns,
                  })
                }
              >
                <Trans>Area</Trans>
              </Choice>
            </View>
          </Field>
          <Field label={t('Measure columns')}>
            <CheckboxList
              options={assignment.measureColumns}
              selected={
                visualization.measureColumns ?? assignment.measureColumns
              }
              onToggle={col => {
                const next = toggleMeasure(
                  visualization.measureColumns,
                  col,
                  assignment.measureColumns,
                );
                onConfigChange({
                  type: 'time-series',
                  chartStyle: visualization.chartStyle,
                  timeColumn: visualization.timeColumn,
                  measureColumns: next,
                });
              }}
            />
          </Field>
        </>
      )}

      {result && assignment && visualization.type === 'bar' && (
        <>
          <Field
            label={t('Category column')}
            help={
              assignment.dimensionColumns.length === 0
                ? t('Add a non-numeric column to use bar chart.')
                : undefined
            }
          >
            <Select
              value={
                visualization.categoryColumn ??
                assignment.dimensionColumns.find(
                  name => !assignment.idColumns.includes(name),
                ) ??
                assignment.dimensionColumns[0] ??
                ''
              }
              options={toOptions(assignment.dimensionColumns)}
              onChange={value =>
                onConfigChange({
                  type: 'bar',
                  chartStyle: visualization.chartStyle,
                  categoryColumn: value,
                  measureColumns: visualization.measureColumns,
                })
              }
            />
          </Field>
          <Field label={t('Style')}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Choice
                selected={visualization.chartStyle === 'grouped'}
                onPress={() =>
                  onConfigChange({
                    type: 'bar',
                    chartStyle: 'grouped',
                    categoryColumn: visualization.categoryColumn,
                    measureColumns: visualization.measureColumns,
                  })
                }
              >
                <Trans>Grouped</Trans>
              </Choice>
              <Choice
                selected={visualization.chartStyle === 'stacked'}
                onPress={() =>
                  onConfigChange({
                    type: 'bar',
                    chartStyle: 'stacked',
                    categoryColumn: visualization.categoryColumn,
                    measureColumns: visualization.measureColumns,
                  })
                }
              >
                <Trans>Stacked</Trans>
              </Choice>
            </View>
          </Field>
          <Field label={t('Measure columns')}>
            <CheckboxList
              options={assignment.measureColumns}
              selected={
                visualization.measureColumns ?? assignment.measureColumns
              }
              onToggle={col => {
                const next = toggleMeasure(
                  visualization.measureColumns,
                  col,
                  assignment.measureColumns,
                );
                onConfigChange({
                  type: 'bar',
                  chartStyle: visualization.chartStyle,
                  categoryColumn: visualization.categoryColumn,
                  measureColumns: next,
                });
              }}
            />
          </Field>
        </>
      )}

      {result && assignment && visualization.type === 'donut' && (
        <>
          <Field label={t('Category column')}>
            <Select
              value={
                visualization.categoryColumn ??
                assignment.dimensionColumns.find(
                  name => !assignment.idColumns.includes(name),
                ) ??
                assignment.dimensionColumns[0] ??
                ''
              }
              options={toOptions(assignment.dimensionColumns)}
              onChange={value =>
                onConfigChange({
                  type: 'donut',
                  categoryColumn: value,
                  measureColumn: visualization.measureColumn,
                })
              }
            />
          </Field>
          <Field label={t('Measure column')}>
            <Select
              value={
                visualization.measureColumn ??
                assignment.measureColumns[0] ??
                ''
              }
              options={toOptions(assignment.measureColumns)}
              onChange={value =>
                onConfigChange({
                  type: 'donut',
                  categoryColumn: visualization.categoryColumn,
                  measureColumn: value,
                })
              }
            />
          </Field>
        </>
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

type ChoiceProps = {
  selected: boolean;
  onPress: () => void;
  children: ReactNode;
};

function Choice({ selected, onPress, children }: ChoiceProps) {
  return (
    <button
      type="button"
      onClick={onPress}
      style={{
        padding: '4px 10px',
        borderRadius: 4,
        border: `1px solid ${
          selected ? theme.buttonPrimaryBackground : theme.formInputBorder
        }`,
        backgroundColor: selected
          ? theme.buttonPrimaryBackground
          : 'transparent',
        color: selected ? theme.buttonPrimaryText : theme.pageText,
        cursor: 'pointer',
        fontSize: 12,
      }}
    >
      {children}
    </button>
  );
}

type CheckboxListProps = {
  options: string[];
  selected: string[];
  onToggle: (col: string) => void;
};

function CheckboxList({ options, selected, onToggle }: CheckboxListProps) {
  if (options.length === 0) {
    return (
      <div style={{ fontSize: 12, color: theme.pageTextSubdued }}>
        <Trans>No numeric columns available</Trans>
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
