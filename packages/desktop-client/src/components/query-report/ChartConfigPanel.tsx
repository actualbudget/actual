import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Input } from '@actual-app/components/input';
import { Select } from '@actual-app/components/select';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import type {
  ChannelDef,
  ChartSpec,
  ConditionalRule,
  Encoding,
  Mark,
} from 'loot-core/types/chart-spec';

import { ConditionalRuleEditor } from './ConditionalRuleEditor';

import { LabeledCheckbox } from '@desktop-client/components/forms/LabeledCheckbox';
import type { QueryResult } from '@desktop-client/queries/processQueryResult';

type ChartConfigPanelProps = {
  result: QueryResult | null;
  chartSpec: ChartSpec;
  onChartSpecChange: (next: ChartSpec) => void;
};

type Section = 'conditional' | 'axes' | 'fields';

const CHART_MARKS: Mark[] = ['column', 'bar', 'line', 'area', 'point'];
const CONDITIONAL_MARKS: Mark[] = ['table', 'number'];

function sectionVisibility(mark: Mark): {
  conditional: boolean;
  axes: boolean;
  fields: boolean;
} {
  return {
    conditional: CONDITIONAL_MARKS.includes(mark),
    axes: CHART_MARKS.includes(mark),
    fields: true,
  };
}

function getAllChannels(encoding: Encoding): Array<{
  key: 'x' | 'y' | 'series' | 'size';
  channel: ChannelDef;
  isArray: boolean;
  index?: number;
}> {
  const result: Array<{
    key: 'x' | 'y' | 'series' | 'size';
    channel: ChannelDef;
    isArray: boolean;
    index?: number;
  }> = [];
  for (const key of ['x', 'y', 'series', 'size'] as const) {
    const ch = encoding[key];
    if (!ch) continue;
    if (Array.isArray(ch)) {
      ch.forEach((c, i) =>
        result.push({ key, channel: c, isArray: true, index: i }),
      );
    } else {
      result.push({ key, channel: ch, isArray: false });
    }
  }
  return result;
}

const NUMERIC_FORMAT_OPTIONS: Array<readonly [string, string]> = [
  ['default', 'Default'],
  ['financial', 'Financial'],
  ['financial-no-decimals', 'Financial (no decimals)'],
  ['number', 'Number'],
  ['percent', 'Percent'],
];

const DATE_FORMAT_OPTIONS: Array<readonly [string, string]> = [
  ['default', 'Default'],
  ['date', 'Date (MM/DD/YYYY)'],
  ['date-month', 'Month year (MMM YYYY)'],
  ['date-year', 'Year'],
];

function formatOptionsForType(type: string): Array<readonly [string, string]> {
  if (type === 'date' || type === 'date-month' || type === 'date-year') {
    return DATE_FORMAT_OPTIONS;
  }
  if (type === 'number' || type === 'integer' || type === 'float') {
    return NUMERIC_FORMAT_OPTIONS;
  }
  return [['default', 'Default']];
}

function updateChannel(
  chartSpec: ChartSpec,
  key: 'x' | 'y' | 'series' | 'size',
  isArray: boolean,
  index: number | undefined,
  patch: Partial<ChannelDef>,
  onChartSpecChange: (next: ChartSpec) => void,
) {
  const encoding = chartSpec.encoding;
  const current = encoding[key];
  if (isArray && Array.isArray(current) && index !== undefined) {
    const nextArr = current.map((c, i) =>
      i === index ? { ...c, ...patch } : c,
    );
    onChartSpecChange({
      ...chartSpec,
      encoding: { ...encoding, [key]: nextArr },
    });
  } else if (!isArray && current && !Array.isArray(current)) {
    onChartSpecChange({
      ...chartSpec,
      encoding: { ...encoding, [key]: { ...current, ...patch } },
    });
  }
}

export function ChartConfigPanel({
  result,
  chartSpec,
  onChartSpecChange,
}: ChartConfigPanelProps) {
  const { t } = useTranslation();
  const visibility = sectionVisibility(chartSpec.mark);

  const allChannels = useMemo(
    () => getAllChannels(chartSpec.encoding),
    [chartSpec.encoding],
  );

  const rules = chartSpec.config?.conditionalRules ?? [];
  const [editingRule, setEditingRule] = useState<
    { index: number; rule: ConditionalRule } | { rule: ConditionalRule } | null
  >(null);

  const updateRules = (next: ConditionalRule[]) => {
    onChartSpecChange({
      ...chartSpec,
      config: { ...chartSpec.config, conditionalRules: next },
    });
  };

  const updateAxes = (
    patch: Partial<NonNullable<NonNullable<ChartSpec['config']>['axes']>>,
  ) => {
    const axes = chartSpec.config?.axes ?? {};
    onChartSpecChange({
      ...chartSpec,
      config: { ...chartSpec.config, axes: { ...axes, ...patch } },
    });
  };

  const valueAxis = chartSpec.config?.axes?.valueAxis ?? {};
  const categoryAxis = chartSpec.config?.axes?.categoryAxis ?? {};

  if (!visibility.conditional && !visibility.axes && !visibility.fields) {
    return (
      <div style={{ fontSize: 12, color: theme.pageTextSubdued }}>
        <Trans>No customization available for this mark.</Trans>
      </div>
    );
  }

  return (
    <View style={{ gap: 16 }}>
      {visibility.conditional && (
        <Section title={t('Conditional formatting')}>
          {rules.length === 0 && !editingRule && (
            <div style={{ fontSize: 12, color: theme.pageTextSubdued }}>
              <Trans>No rules configured.</Trans>
            </div>
          )}
          {rules.map((rule, i) => (
            <View
              key={i}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 8,
                border: `1px solid ${theme.tableBorder}`,
                borderRadius: 4,
                gap: 8,
              }}
            >
              <div style={{ fontSize: 12 }}>{summarizeRule(rule)}</div>
              <View style={{ flexDirection: 'row', gap: 4 }}>
                <Button onPress={() => setEditingRule({ index: i, rule })}>
                  <Trans>Edit</Trans>
                </Button>
                <Button
                  onPress={() =>
                    updateRules(rules.filter((_, idx) => idx !== i))
                  }
                >
                  <Trans>Delete</Trans>
                </Button>
              </View>
            </View>
          ))}
          {editingRule && (
            <ConditionalRuleEditor
              result={result}
              rule={editingRule.rule}
              isTable={chartSpec.mark === 'table'}
              onSave={next => {
                if ('index' in editingRule) {
                  const nextRules = [...rules];
                  nextRules[editingRule.index] = next;
                  updateRules(nextRules);
                } else {
                  updateRules([...rules, next]);
                }
                setEditingRule(null);
              }}
              onCancel={() => setEditingRule(null)}
            />
          )}
          {!editingRule && (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <Button
                onPress={() =>
                  setEditingRule({
                    rule: {
                      type: 'single_color',
                      field: result?.columns?.[0]?.name ?? '',
                      conditions: [{ operator: 'equals', value: '' }],
                      styling: {},
                    },
                  })
                }
              >
                <Trans>Add rule</Trans>
              </Button>
              <Button
                onPress={() =>
                  setEditingRule({
                    rule: {
                      type: 'color_scale',
                      field: '',
                      minColor: '#ffffff',
                      maxColor: '#000000',
                    },
                  })
                }
              >
                <Trans>Color scale</Trans>
              </Button>
            </View>
          )}
        </Section>
      )}

      {visibility.axes && (
        <Section title={t('Axes')}>
          <div style={{ fontSize: 12, color: theme.pageTextSubdued }}>
            <Trans>Value axis</Trans>
          </div>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <Field label={t('Min')}>
              <Input
                type="number"
                value={valueAxis.min !== undefined ? String(valueAxis.min) : ''}
                onChangeValue={v =>
                  updateAxes({
                    valueAxis: {
                      ...valueAxis,
                      ...(v === '' ? { min: undefined } : { min: Number(v) }),
                    },
                  })
                }
              />
            </Field>
            <Field label={t('Max')}>
              <Input
                type="number"
                value={valueAxis.max !== undefined ? String(valueAxis.max) : ''}
                onChangeValue={v =>
                  updateAxes({
                    valueAxis: {
                      ...valueAxis,
                      ...(v === '' ? { max: undefined } : { max: Number(v) }),
                    },
                  })
                }
              />
            </Field>
            <Field label={t('Label')}>
              <Input
                value={valueAxis.labelOverride ?? ''}
                onChangeValue={v =>
                  updateAxes({
                    valueAxis: {
                      ...valueAxis,
                      ...(v
                        ? { labelOverride: v }
                        : { labelOverride: undefined }),
                    },
                  })
                }
              />
            </Field>
          </View>
          <LabeledCheckbox
            id="chart-config-logarithmic"
            checked={valueAxis.logarithmic ?? false}
            onChange={() =>
              updateAxes({
                valueAxis: {
                  ...valueAxis,
                  logarithmic: !valueAxis.logarithmic,
                },
              })
            }
          >
            <Trans>Logarithmic scale</Trans>
          </LabeledCheckbox>
          <div
            style={{ fontSize: 12, color: theme.pageTextSubdued, marginTop: 8 }}
          >
            <Trans>Category axis</Trans>
          </div>
          <Field label={t('Label')}>
            <Input
              value={categoryAxis.labelOverride ?? ''}
              onChangeValue={v =>
                updateAxes({
                  categoryAxis: v
                    ? { labelOverride: v }
                    : { labelOverride: undefined },
                })
              }
            />
          </Field>
          <LabeledCheckbox
            id="chart-config-fill-gaps"
            checked={chartSpec.config?.fillGaps !== false}
            onChange={() =>
              onChartSpecChange({
                ...chartSpec,
                config: {
                  ...chartSpec.config,
                  fillGaps:
                    chartSpec.config?.fillGaps === false ? undefined : false,
                },
              })
            }
          >
            <Trans>Fill date gaps</Trans>
          </LabeledCheckbox>
        </Section>
      )}

      {visibility.fields && allChannels.length > 0 && (
        <Section title={t('Fields')}>
          {allChannels.map((entry, i) => {
            const col = result?.columns?.find(
              c => c.name === entry.channel.field,
            );
            const colType = col?.type ?? 'string';
            const fmtOpts = formatOptionsForType(colType);
            const currentFormat = entry.channel.format ?? 'default';
            return (
              <View
                key={`${entry.key}-${entry.channel.field}-${i}`}
                style={{
                  padding: 8,
                  border: `1px solid ${theme.tableBorder}`,
                  borderRadius: 4,
                  gap: 6,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    color: theme.pageTextSubdued,
                    fontWeight: 600,
                  }}
                >
                  {entry.key.toUpperCase()}: {entry.channel.field}
                </div>
                <Field label={t('Label')}>
                  <Input
                    value={entry.channel.title ?? entry.channel.field}
                    onChangeValue={v =>
                      updateChannel(
                        chartSpec,
                        entry.key,
                        entry.isArray,
                        entry.index,
                        { title: v === entry.channel.field ? undefined : v },
                        onChartSpecChange,
                      )
                    }
                  />
                </Field>
                <Field label={t('Format')}>
                  <Select
                    value={currentFormat}
                    options={fmtOpts}
                    onChange={v =>
                      updateChannel(
                        chartSpec,
                        entry.key,
                        entry.isArray,
                        entry.index,
                        v === 'default' ? { format: undefined } : { format: v },
                        onChartSpecChange,
                      )
                    }
                  />
                </Field>
              </View>
            );
          })}
        </Section>
      )}
    </View>
  );
}

function summarizeRule(rule: ConditionalRule): string {
  if (rule.type === 'color_scale') {
    return `Color scale on ${rule.field}: ${rule.minColor} → ${rule.maxColor}`;
  }
  const condStr = rule.conditions
    .map(c => `${c.operator} ${c.value ?? ''}`)
    .join(', ');
  return `If ${rule.field} ${condStr}`;
}

type SectionProps = {
  title: string;
  children: ReactNode;
};

function Section({ title, children }: SectionProps) {
  return (
    <View>
      <div
        style={{
          fontSize: 12,
          color: theme.pageTextSubdued,
          fontWeight: 600,
          marginBottom: 6,
          textTransform: 'uppercase',
        }}
      >
        {title}
      </div>
      <View style={{ gap: 6 }}>{children}</View>
    </View>
  );
}

type FieldProps = {
  label: string;
  children: ReactNode;
};

function Field({ label, children }: FieldProps) {
  return (
    <View>
      <div
        style={{
          fontSize: 11,
          color: theme.pageTextSubdued,
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      {children}
    </View>
  );
}
